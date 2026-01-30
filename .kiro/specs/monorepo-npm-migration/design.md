# Design Document: Monorepo npm Migration

## Overview

This design outlines the migration strategy for converting a monorepo from Yarn to npm workspaces. The monorepo contains two packages: `argos-sdk` (a shared SDK) and `products/argos-saleslogix` (a product that depends on the SDK). The migration will modernize dependency management while preserving all existing functionality including Grunt-based builds, Babel transpilation, testing infrastructure, and CI/CD pipelines.

The migration follows a phased approach: workspace setup, dependency analysis and consolidation, script updates, CI/CD migration, and verification. This ensures minimal disruption to development workflows while achieving the benefits of npm workspaces including simplified dependency management, better performance, and reduced tooling complexity.

## Architecture

### Repository Structure

```
monorepo-root/
├── package.json                    # Root workspace configuration
├── package-lock.json               # Single lock file for entire monorepo
├── node_modules/                   # Hoisted shared dependencies
├── Jenkinsfile                     # Updated CI/CD pipeline
├── argos-sdk/
│   ├── package.json               # Workspace package
│   ├── Gruntfile.js               # Build configuration
│   ├── grunt-tasks/               # Task definitions
│   ├── src/                       # Source code
│   └── node_modules/              # Package-specific dependencies (if any)
└── products/
    └── argos-saleslogix/
        ├── package.json           # Workspace package
        ├── Gruntfile.js           # Build configuration
        ├── grunt-tasks/           # Task definitions
        ├── src/                   # Source code
        └── node_modules/          # Package-specific dependencies (if any)
```

### Workspace Configuration Model

npm workspaces uses a hub-and-spoke model where:
- **Root package.json**: Defines workspace members and shared dependencies
- **Workspace packages**: Individual packages with their own package.json files
- **Dependency hoisting**: Shared dependencies are installed once at the root
- **Symlink resolution**: Workspace packages reference each other via symlinks

### Migration Phases

1. **Analysis Phase**: Identify shared vs unique dependencies
2. **Configuration Phase**: Create root package.json with workspace definitions
3. **Dependency Phase**: Consolidate shared dependencies to root
4. **Script Phase**: Update package scripts and CI/CD commands
5. **Verification Phase**: Test all build, test, and deployment workflows

## Components and Interfaces

### Root Package Configuration

**File**: `package.json` (root)

```json
{
  "name": "argos-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "argos-sdk",
    "products/argos-saleslogix"
  ],
  "scripts": {
    "install:all": "npm install",
    "build:all": "npm run build --workspaces",
    "test:all": "npm run test --workspaces",
    "build:sdk": "npm run build -w argos-sdk",
    "build:saleslogix": "npm run build -w products/argos-saleslogix",
    "test:sdk": "npm run test -w argos-sdk",
    "test:saleslogix": "npm run test -w products/argos-saleslogix"
  },
  "devDependencies": {
    // Shared dependencies consolidated here
  }
}
```

**Key Properties**:
- `private: true`: Prevents accidental publication of root package
- `workspaces`: Array of glob patterns matching workspace packages
- `scripts`: Convenience commands for common operations
- `devDependencies`: Shared build and test dependencies

### Workspace Package Configuration

**File**: `argos-sdk/package.json`

```json
{
  "name": "argos-sdk",
  "version": "3.4.0",
  "scripts": {
    "test": "grunt test-ci",
    "build": "grunt build",
    "build:watch": "grunt build:watch",
    "less": "grunt less",
    "lint": "eslint .",
    "lint-fix": "eslint . --fix"
  },
  "devDependencies": {
    // SDK-specific dependencies only
  }
}
```

**File**: `products/argos-saleslogix/package.json`

```json
{
  "name": "argos-saleslogix",
  "version": "4.2.0",
  "scripts": {
    "test": "grunt test-ci",
    "build": "grunt build",
    "build:watch": "grunt build:watch",
    "less": "grunt less",
    "lint": "eslint .",
    "lint-fix": "eslint . --fix",
    "e2e": "playwright test"
  },
  "dependencies": {
    "argos-sdk": "workspace:*"
  },
  "devDependencies": {
    // Saleslogix-specific dependencies
    "express": "^4.18.0",
    "mocha": "^10.0.0",
    "playwright": "^1.40.0"
  }
}
```

**Key Properties**:
- `dependencies`: Uses `workspace:*` protocol to reference argos-sdk
- `scripts`: Maintains existing script names for compatibility
- `devDependencies`: Package-specific tools and libraries

### Dependency Classification

Dependencies are classified into three categories:

1. **Shared Build Dependencies** (move to root):
   - grunt and grunt plugins
   - babel and babel plugins
   - eslint and eslint plugins
   - jasmine testing framework

2. **Package-Specific Dependencies** (keep in workspace):
   - argos-saleslogix: express, mocha, playwright
   - Any dependencies unique to one package

3. **Workspace Dependencies** (use workspace protocol):
   - argos-saleslogix → argos-sdk: `"argos-sdk": "workspace:*"`

### Grunt Configuration Updates

**File**: `products/argos-saleslogix/Gruntfile.js`

Current reference to argos-sdk:
```javascript
basePath: '../../argos-sdk'
```

Updated reference using workspace resolution:
```javascript
const path = require('path');
const sdkPath = path.dirname(require.resolve('argos-sdk/package.json'));
```

This approach:
- Uses Node's module resolution to find argos-sdk
- Works with npm workspace symlinks
- Maintains compatibility with existing Grunt tasks

### CI/CD Pipeline Updates

**File**: `Jenkinsfile`

**Current approach** (runs commands in each directory):
```groovy
dir('argos-sdk') {
    sh 'yarn'
    sh 'yarn run build'
    sh 'yarn run test'
}
dir('products/argos-saleslogix') {
    sh 'yarn'
    sh 'yarn run build'
    sh 'yarn run test'
}
```

**Updated approach** (uses workspace commands from root):
```groovy
// Install all dependencies once at root
sh 'npm install'

// Build and test SDK
sh 'npm run build -w argos-sdk'
sh 'npm run test -w argos-sdk'

// Build and test Saleslogix
sh 'npm run build -w products/argos-saleslogix'
sh 'npm run test -w products/argos-saleslogix'

// Or run all workspaces in parallel
sh 'npm run build --workspaces'
sh 'npm run test --workspaces'
```

**Benefits**:
- Single `npm install` for entire monorepo
- Explicit workspace targeting with `-w` flag
- Option to run commands across all workspaces
- Faster CI builds due to dependency hoisting

## Data Models

### Package Dependency Graph

```
Root Package (argos-monorepo)
├── Shared Dependencies (hoisted to root node_modules)
│   ├── grunt
│   ├── babel-*
│   ├── eslint
│   └── jasmine
├── argos-sdk (workspace package)
│   └── SDK-specific dependencies
└── argos-saleslogix (workspace package)
    ├── Workspace dependency → argos-sdk (symlink)
    └── Product-specific dependencies
        ├── express
        ├── mocha
        └── playwright
```

### Migration State Model

```typescript
interface MigrationState {
  phase: 'analysis' | 'configuration' | 'dependency' | 'script' | 'verification';
  completed: string[];
  pending: string[];
  issues: Issue[];
}

interface Issue {
  severity: 'error' | 'warning';
  component: string;
  description: string;
  resolution: string;
}
```

### Workspace Package Metadata

```typescript
interface WorkspacePackage {
  name: string;
  path: string;
  dependencies: Map<string, string>;
  devDependencies: Map<string, string>;
  scripts: Map<string, string>;
  isWorkspaceDependency: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Shared Dependency Consolidation

*For any* dependency that appears in the devDependencies or dependencies of multiple workspace packages, that dependency should be moved to the root package.json devDependencies.

**Validates: Requirements 3.1**

### Property 2: Unique Dependency Locality

*For any* dependency that appears in only one workspace package, that dependency should remain in that workspace package's devDependencies or dependencies (not in root).

**Validates: Requirements 3.2**

### Property 3: Deterministic Installation

*For any* environment with the same package-lock.json file, running npm install should produce an identical node_modules structure with the same dependency versions.

**Validates: Requirements 11.4**

## Error Handling

### Migration Errors

**Dependency Conflicts**:
- **Issue**: Different workspace packages require incompatible versions of the same dependency
- **Detection**: npm install will fail with version conflict errors
- **Resolution**: 
  - Keep conflicting dependencies local to each workspace package
  - Document the conflict and plan for version alignment
  - Use npm overrides if necessary to force resolution

**Missing Dependencies**:
- **Issue**: Dependencies not properly declared after consolidation
- **Detection**: Build or test failures with "Cannot find module" errors
- **Resolution**:
  - Analyze error messages to identify missing packages
  - Add missing dependencies to appropriate package.json
  - Run npm install to resolve

**Symlink Issues**:
- **Issue**: Workspace symlinks not created correctly
- **Detection**: argos-saleslogix cannot find argos-sdk
- **Resolution**:
  - Verify workspace configuration in root package.json
  - Delete node_modules and package-lock.json
  - Run npm install to recreate workspace structure

### Build System Errors

**Grunt Path Resolution**:
- **Issue**: Gruntfile cannot find argos-sdk using old path reference
- **Detection**: Grunt tasks fail with path not found errors
- **Resolution**:
  - Update Gruntfile to use require.resolve() for workspace packages
  - Verify argos-sdk is properly symlinked in node_modules

**Babel/ESLint Configuration**:
- **Issue**: Build tools cannot find configuration files after dependency hoisting
- **Detection**: Build or lint commands fail with configuration errors
- **Resolution**:
  - Ensure configuration files (.babelrc, .eslintrc) are in correct locations
  - Verify build tool dependencies are properly installed

### CI/CD Errors

**Jenkins Pipeline Failures**:
- **Issue**: Jenkinsfile commands fail with npm not found or workspace errors
- **Detection**: CI builds fail
- **Resolution**:
  - Verify npm version supports workspaces (npm 7+)
  - Check that Jenkinsfile uses correct npm workspace syntax
  - Ensure npm install runs before build/test commands

**Artifact Generation**:
- **Issue**: Deployment artifacts missing or incorrect after migration
- **Detection**: Artifact comparison shows differences
- **Resolution**:
  - Verify all build steps execute correctly
  - Check that output directories are configured properly
  - Ensure all required files are included in artifacts

### Rollback Strategy

If migration encounters critical issues:

1. **Immediate Rollback**:
   - Restore yarn.lock files from version control
   - Delete package-lock.json and root package.json workspace config
   - Run `yarn install` to restore Yarn-based setup
   - Revert Jenkinsfile changes

2. **Partial Rollback**:
   - Keep workspace structure but revert specific changes
   - Restore individual package.json files if needed
   - Re-run npm install to fix dependency issues

3. **Verification After Rollback**:
   - Run full build and test suite
   - Verify CI/CD pipeline works
   - Confirm all developers can work normally

## Testing Strategy

### Dual Testing Approach

This migration requires both **unit tests** (specific examples and edge cases) and **property tests** (universal properties). Together they provide comprehensive coverage:

- **Unit tests**: Verify specific configurations, file existence, command execution
- **Property tests**: Verify universal rules about dependency organization and reproducibility

### Unit Testing

Unit tests will focus on:

1. **Configuration Validation**:
   - Root package.json contains correct workspace paths
   - Workspace packages have correct dependency declarations
   - Jenkinsfile contains npm commands (not yarn)

2. **File System Verification**:
   - Yarn artifacts (yarn.lock, .yarnrc) are removed
   - package-lock.json exists at root only
   - Gruntfile.js files exist in correct locations

3. **Command Execution**:
   - npm install works from root
   - npm run build works in each workspace
   - npm run test works in each workspace
   - npm run commands work with -w flag from root

4. **Build Output Verification**:
   - Compiled JavaScript files are generated
   - CSS files are compiled from LESS
   - Test results are produced
   - Deployment artifacts match pre-migration artifacts

5. **Workspace Dependency Resolution**:
   - argos-sdk symlink exists in argos-saleslogix/node_modules
   - Gruntfile can resolve argos-sdk path
   - Changes to argos-sdk are reflected in argos-saleslogix

### Property-Based Testing

Property tests will verify universal rules using a property-based testing library (e.g., fast-check for JavaScript/TypeScript). Each test should run a minimum of 100 iterations.

**Property Test 1: Shared Dependency Consolidation**
- **Tag**: Feature: monorepo-npm-migration, Property 1: Shared dependency consolidation
- **Test**: Generate various dependency configurations, verify shared dependencies are in root
- **Validation**: Parse all package.json files, check that any dependency appearing in 2+ packages is in root

**Property Test 2: Unique Dependency Locality**
- **Tag**: Feature: monorepo-npm-migration, Property 2: Unique dependency locality
- **Test**: Generate various dependency configurations, verify unique dependencies stay local
- **Validation**: Parse all package.json files, check that dependencies appearing in only 1 package are not in root

**Property Test 3: Deterministic Installation**
- **Tag**: Feature: monorepo-npm-migration, Property 3: Deterministic installation
- **Test**: Run npm install multiple times in clean environments, compare resulting node_modules
- **Validation**: Hash node_modules structure and package versions, verify identical results

### Integration Testing

Integration tests verify end-to-end workflows:

1. **Full Build Pipeline**:
   - Run complete build from clean state
   - Verify all packages build successfully
   - Check that artifacts are generated correctly

2. **Test Suite Execution**:
   - Run all Jasmine tests in argos-sdk
   - Run all Mocha tests in argos-saleslogix
   - Run all Playwright e2e tests
   - Verify all tests pass

3. **CI/CD Pipeline**:
   - Run Jenkinsfile in test environment
   - Verify all stages complete successfully
   - Compare artifacts to pre-migration baseline

4. **Developer Workflow Simulation**:
   - Simulate adding a new dependency
   - Simulate modifying argos-sdk and building argos-saleslogix
   - Simulate running commands from different directories

### Migration Verification Checklist

Before considering migration complete, verify:

- [ ] All Yarn artifacts removed
- [ ] Root package.json with workspace configuration exists
- [ ] package-lock.json exists at root only
- [ ] All workspace packages have correct dependency declarations
- [ ] npm install works from root
- [ ] All build scripts work (build, build:watch, less)
- [ ] All test scripts work (test, e2e)
- [ ] All lint scripts work (lint, lint-fix)
- [ ] Grunt tasks execute successfully in both packages
- [ ] argos-saleslogix can access argos-sdk via workspace dependency
- [ ] Jenkinsfile uses npm commands
- [ ] CI/CD pipeline completes successfully
- [ ] Deployment artifacts match pre-migration artifacts
- [ ] All property tests pass (100+ iterations each)
- [ ] All unit tests pass
- [ ] Documentation updated with new workflows

### Test Environment Setup

**Prerequisites**:
- Node.js version with npm 7+ (workspace support)
- Clean repository clone
- Access to CI/CD environment for pipeline testing

**Test Data**:
- Baseline artifacts from pre-migration build
- Sample code changes for testing live-linking
- Various dependency configurations for property testing

**Automation**:
- Script to run full verification checklist
- Script to compare artifacts before/after migration
- Script to validate package.json structure
