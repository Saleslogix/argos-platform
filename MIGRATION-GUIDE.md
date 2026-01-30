# Migration Guide: Yarn to npm Workspaces

This guide documents the migration from Yarn to npm workspaces for the Argos Platform monorepo. It explains what changed, why, and how to work with the new setup.

## Table of Contents

- [Overview](#overview)
- [What Changed](#what-changed)
- [Command Reference](#command-reference)
- [CI/CD Pipeline Changes](#cicd-pipeline-changes)
- [Developer Workflow Changes](#developer-workflow-changes)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Overview

The Argos Platform monorepo has been migrated from Yarn to npm workspaces to:
- Simplify tooling (use npm's built-in workspace support)
- Improve dependency management with better hoisting
- Reduce lock file conflicts
- Align with modern npm best practices
- Improve CI/CD build performance

**Migration Date**: January 2026  
**npm Version Required**: 7.0.0 or higher (for workspace support)  
**Node.js Version Required**: 16.0.0 or higher

## What Changed

### Package Management

**Before (Yarn):**
```bash
# Install dependencies
yarn

# Install in specific directory
cd argos-sdk && yarn
cd products/argos-saleslogix && yarn

# Run scripts
yarn run build
yarn run test
```

**After (npm workspaces):**
```bash
# Install all dependencies from root
npm install

# Run scripts in specific workspace
npm run build -w argos-sdk
npm run test -w products/argos-saleslogix

# Or use convenience scripts
npm run build:all
npm run test:sdk
```

### File Structure

**Removed:**
- `yarn.lock` (all instances)
- `.yarnrc` files (if any existed)

**Added:**
- `package-lock.json` (at root only)
- Root `package.json` with workspace configuration

**Modified:**
- `argos-sdk/package.json` - removed shared dependencies
- `products/argos-saleslogix/package.json` - added workspace dependency on argos-sdk
- `Jenkinsfile` - updated to use npm commands

### Dependency Organization

**Shared dependencies** (used by multiple packages) are now in the root `package.json`:
- grunt and grunt plugins
- babel packages
- eslint packages
- jasmine

**Package-specific dependencies** remain in their respective `package.json` files:
- argos-saleslogix: express, mocha, playwright
- Any dependencies unique to one package

### Workspace Dependencies

argos-saleslogix now references argos-sdk using the workspace protocol:

```json
{
  "dependencies": {
    "argos-sdk": "workspace:*"
  }
}
```

This creates a symlink, enabling live updates during development.

## Command Reference

### Installation

| Yarn | npm Workspaces |
|------|----------------|
| `yarn` | `npm install` |
| `cd argos-sdk && yarn` | `npm install` (from root) |
| `yarn install --frozen-lockfile` | `npm ci` |

### Running Scripts

| Yarn | npm Workspaces |
|------|----------------|
| `yarn run build` | `npm run build` (in package dir) |
| `yarn run test` | `npm run test` (in package dir) |
| N/A | `npm run build -w argos-sdk` (from root) |
| N/A | `npm run build --workspaces` (all packages) |

### Adding Dependencies

| Yarn | npm Workspaces |
|------|----------------|
| `yarn add <pkg>` | `npm install <pkg>` (in package dir) |
| `yarn add -D <pkg>` | `npm install -D <pkg>` (in package dir) |
| N/A | `npm install <pkg> -w argos-sdk` (from root) |

### Removing Dependencies

| Yarn | npm Workspaces |
|------|----------------|
| `yarn remove <pkg>` | `npm uninstall <pkg>` (in package dir) |
| N/A | `npm uninstall <pkg> -w argos-sdk` (from root) |

### Workspace-Specific Commands

**New commands available with npm workspaces:**

```bash
# Run command in specific workspace from root
npm run build -w argos-sdk
npm run test -w products/argos-saleslogix

# Run command in all workspaces
npm run build --workspaces
npm run test --workspaces

# List all workspaces
npm ls --workspaces

# Install dependencies for specific workspace
npm install <package> -w argos-sdk
```

## CI/CD Pipeline Changes

### Jenkinsfile Updates

**Before (Yarn):**
```groovy
stage('Build SDK') {
    dir('argos-sdk') {
        sh 'yarn'
        sh 'yarn run build'
        sh 'yarn run test'
    }
}

stage('Build SalesLogix') {
    dir('products/argos-saleslogix') {
        sh 'yarn'
        sh 'yarn run build'
        sh 'yarn run test'
    }
}
```

**After (npm workspaces):**
```groovy
stage('Install Dependencies') {
    sh 'npm install'
}

stage('Build SDK') {
    sh 'npm run build -w argos-sdk'
    sh 'npm run test -w argos-sdk'
}

stage('Build SalesLogix') {
    sh 'npm run build -w products/argos-saleslogix'
    sh 'npm run test -w products/argos-saleslogix'
}
```

### Key Improvements

1. **Single installation**: `npm install` runs once at the root instead of in each directory
2. **Faster builds**: Shared dependencies are hoisted, reducing installation time
3. **Explicit targeting**: `-w` flag clearly indicates which workspace is being built
4. **Parallel execution**: Can run `npm run build --workspaces` to build all packages

### Environment Requirements

Ensure your CI/CD environment has:
- Node.js 16+ installed
- npm 7+ installed (comes with Node.js 16+)
- Sufficient permissions to create symlinks (for workspace dependencies)

## Developer Workflow Changes

### Daily Development

**Before:**
```bash
# Start working
cd argos-sdk
yarn
yarn run build

cd ../products/argos-saleslogix
yarn
yarn run build
```

**After:**
```bash
# Start working (from root)
npm install
npm run build:all

# Or build individually
npm run build:sdk
npm run build:saleslogix
```

### Making Changes to argos-sdk

**Before:**
```bash
cd argos-sdk
# Make changes
yarn run build

cd ../products/argos-saleslogix
yarn run build  # Uses published or linked version
```

**After:**
```bash
cd argos-sdk
# Make changes
npm run build

cd ../products/argos-saleslogix
npm run build  # Automatically uses local version via symlink
```

**Key benefit**: No need to manually link packages. The workspace symlink ensures argos-saleslogix always uses the local argos-sdk.

### Adding New Dependencies

**Shared dependency (used by multiple packages):**

```bash
# Add to root package.json devDependencies
npm install -D <package-name> -w root

# Or manually edit root package.json and run:
npm install
```

**Package-specific dependency:**

```bash
# From root
npm install <package-name> -w argos-sdk

# Or from package directory
cd argos-sdk
npm install <package-name>
```

### Running Tests

**Before:**
```bash
cd argos-sdk
yarn run test

cd ../products/argos-saleslogix
yarn run test
```

**After:**
```bash
# From root
npm run test:all

# Or individually
npm run test:sdk
npm run test:saleslogix

# Or from package directory
cd argos-sdk
npm run test
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Cannot find module 'argos-sdk'"

**Symptoms**: argos-saleslogix cannot find argos-sdk during build or runtime.

**Cause**: Workspace symlink not created properly.

**Solution**:
```bash
# Delete node_modules and lock file
rm -rf node_modules package-lock.json
rm -rf argos-sdk/node_modules
rm -rf products/argos-saleslogix/node_modules

# Reinstall
npm install

# Verify symlink exists
ls -la products/argos-saleslogix/node_modules/argos-sdk
```

#### Issue: "npm ERR! Unsupported URL Type 'workspace:'"

**Symptoms**: npm install fails with workspace protocol error.

**Cause**: npm version is too old (< 7.0.0).

**Solution**:
```bash
# Check npm version
npm --version

# Update npm if needed
npm install -g npm@latest

# Or update Node.js to 16+ which includes npm 7+
```

#### Issue: Dependency version conflicts

**Symptoms**: Different packages require incompatible versions of the same dependency.

**Cause**: Attempting to hoist dependencies with conflicting version requirements.

**Solution**:
```bash
# Keep conflicting dependencies local to each package
# In argos-sdk/package.json:
{
  "devDependencies": {
    "some-package": "^1.0.0"
  }
}

# In products/argos-saleslogix/package.json:
{
  "devDependencies": {
    "some-package": "^2.0.0"
  }
}

# npm will install both versions locally
npm install
```

#### Issue: Grunt tasks fail with path errors

**Symptoms**: Grunt cannot find argos-sdk or tasks fail with "path not found" errors.

**Cause**: Gruntfile still uses old hardcoded path instead of workspace resolution.

**Solution**:

Verify `products/argos-saleslogix/Gruntfile.js` uses:
```javascript
const path = require('path');
const sdkPath = path.dirname(require.resolve('argos-sdk/package.json'));
```

Instead of:
```javascript
basePath: '../../argos-sdk'  // Old approach
```

#### Issue: CI/CD pipeline fails

**Symptoms**: Jenkins build fails with npm errors.

**Cause**: Jenkinsfile not updated or environment doesn't support npm workspaces.

**Solution**:
1. Verify Jenkinsfile uses `npm install` not `yarn`
2. Verify Jenkinsfile uses `npm run` not `yarn run`
3. Check Node.js version in CI environment: `node --version` (should be 16+)
4. Check npm version in CI environment: `npm --version` (should be 7+)

#### Issue: "ENOENT: no such file or directory" during build

**Symptoms**: Build fails with file not found errors.

**Cause**: Dependencies not installed or workspace structure corrupted.

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf argos-sdk/node_modules
rm -rf products/argos-saleslogix/node_modules
npm install

# Verify workspace structure
npm ls --workspaces
```

#### Issue: Changes to argos-sdk not reflected in argos-saleslogix

**Symptoms**: After modifying argos-sdk, argos-saleslogix still uses old code.

**Cause**: argos-sdk not rebuilt or symlink broken.

**Solution**:
```bash
# Rebuild argos-sdk
npm run build -w argos-sdk

# Verify symlink
ls -la products/argos-saleslogix/node_modules/argos-sdk

# If symlink is broken, reinstall
npm install
```

### Getting Help

If you encounter issues not covered here:

1. Check the [npm workspaces documentation](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
2. Verify your npm version: `npm --version` (should be 7+)
3. Check for error messages in the console output
4. Review the [README.md](./README.md) for correct command syntax
5. Contact the development team for assistance

## FAQ

### Why migrate from Yarn to npm workspaces?

- **Simplification**: npm workspaces is built into npm, reducing external dependencies
- **Performance**: Better dependency hoisting and faster installs
- **Compatibility**: Better alignment with modern Node.js ecosystem
- **Maintenance**: One less tool to maintain and update

### Do I need to change my local development setup?

Yes, but minimally:
- Ensure you have Node.js 16+ (which includes npm 7+)
- Use `npm install` instead of `yarn`
- Use `npm run` instead of `yarn run`
- All script names remain the same

### Will this affect production deployments?

No. The build artifacts are identical. Only the build process changed, not the output.

### Can I still run commands from package directories?

Yes! You can still `cd` into a package and run `npm run build`, `npm run test`, etc. The workspace structure doesn't prevent this.

### What happens to the workspace:* protocol in production?

When you publish packages, npm automatically converts `workspace:*` to the actual version number. During development, it uses the local symlink.

### How do I know which dependencies should be at the root vs in packages?

**Root devDependencies**: Tools used by multiple packages (grunt, babel, eslint, jasmine)  
**Package dependencies**: Libraries specific to one package (express, mocha, playwright)

When in doubt, if only one package uses it, keep it local.

### What if I need different versions of the same dependency?

Keep them local to each package. npm will install both versions in their respective `node_modules` directories instead of hoisting.

### How do I update dependencies?

```bash
# Update all dependencies
npm update

# Update specific dependency in a workspace
npm update <package-name> -w argos-sdk

# Update dependency in all workspaces
npm update <package-name> --workspaces
```

### Can I use yarn.lock for reference?

The old `yarn.lock` files have been removed. If you need to reference old dependency versions, check git history:

```bash
git show HEAD~1:yarn.lock
```

### How do I verify the migration was successful?

Run the verification checklist:

```bash
# Verify installation
npm install

# Verify builds
npm run build:all

# Verify tests
npm run test:all

# Verify workspace structure
npm ls --workspaces

# Verify symlink
ls -la products/argos-saleslogix/node_modules/argos-sdk
```

All commands should complete successfully.

## Additional Resources

- [npm workspaces documentation](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [npm CLI documentation](https://docs.npmjs.com/cli/v8/commands)
- [Repository README](./README.md)
- [Migration specification](./.kiro/specs/monorepo-npm-migration/)

---

**Last Updated**: January 2026  
**Migration Version**: 1.0.0
