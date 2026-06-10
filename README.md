# Argos Platform Monorepo

This repository contains the Argos SDK and Argos SalesLogix product in a monorepo structure managed by npm workspaces.

## Repository Structure

```
monorepo-root/
├── package.json                    # Root workspace configuration
├── package-lock.json               # Single lock file for entire monorepo
├── node_modules/                   # Hoisted shared dependencies
├── Jenkinsfile                     # CI/CD pipeline
├── argos-sdk/                      # Argos SDK workspace package
│   ├── package.json
│   ├── Gruntfile.js
│   ├── src/
│   └── node_modules/              # Package-specific dependencies
└── products/
    └── argos-saleslogix/          # Argos SalesLogix workspace package
        ├── package.json
        ├── Gruntfile.js
        ├── src/
        └── node_modules/          # Package-specific dependencies
```

## Getting Started

### Prerequisites

- Node.js 16+ (with npm 7+ for workspace support)
- Git

### Installation

Install all dependencies for the entire monorepo from the root directory:

```bash
npm install
```

This single command installs dependencies for all workspace packages and hoists shared dependencies to the root `node_modules` directory.

## Running Commands

### From Root Directory

You can run commands across all workspaces or target specific packages from the root:

**Run commands in all workspaces:**
```bash
npm run test --workspaces
npm run less --workspaces
```

**Run commands in a specific workspace:**
```bash
npm run test -w argos-sdk
npm run less -w argos-sdk
npm run test -w products/argos-saleslogix
npm run less -w products/argos-saleslogix
```

**Use convenience scripts:**
```bash
npm run test:all           # Test all packages
npm run test:sdk           # Test argos-sdk only
npm run test:saleslogix    # Test argos-saleslogix only
```

### From Package Directory

You can also navigate into a specific package and run commands directly:

```bash
cd argos-sdk
npm run test
npm run less
npm run lint
```

```bash
cd products/argos-saleslogix
npm run test
npm run e2e
npm run less
npm start
```

### Building the Cordova Native Shell

To build the Cordova native Android/iOS shell that wraps the compiled SalesLogix web app into installable mobile apps, see the [Cordova Native Shell build instructions](./cordova/README.md). It covers prerequisites, build and run commands, environment variable overrides, and troubleshooting.

## Available Scripts

### argos-sdk

- `npm run test` - Run Jasmine tests
- `npm run less` - Compile LESS to CSS
- `npm run lint` - Run ESLint
- `npm run lint-fix` - Run ESLint with auto-fix

### argos-saleslogix

- `npm run test` - Run Mocha tests
- `npm run e2e` - Run Playwright end-to-end tests
- `npm run less` - Compile LESS to CSS
- `npm run lint` - Run ESLint
- `npm run lint-fix` - Run ESLint with auto-fix
- `npm start` - Start development server

## Managing Dependencies

### Adding Dependencies

**Add a shared dependency (used by multiple packages):**

Add to the root `package.json`:
```bash
npm install -D <package-name> -w root
```

Or manually add to root `package.json` devDependencies and run `npm install`.

**Add a package-specific dependency:**

```bash
npm install <package-name> -w argos-sdk
npm install <package-name> -w products/argos-saleslogix
```

Or navigate to the package directory:
```bash
cd argos-sdk
npm install <package-name>
```

**Guidelines for dependency placement:**
- **Root devDependencies**: Build tools, test frameworks, linters used by multiple packages (grunt, eslint, jasmine, mocha)
- **Package dependencies/devDependencies**: Package-specific tools or libraries used by only one package

### Workspace Dependencies

The `argos-saleslogix` package depends on `argos-sdk` using the workspace protocol:

```json
{
  "dependencies": {
    "argos-sdk": "workspace:*"
  }
}
```

This creates a symlink from `products/argos-saleslogix/node_modules/argos-sdk` to the local `argos-sdk` package, enabling:
- **Live updates**: Changes to argos-sdk are immediately available in argos-saleslogix without reinstalling
- **Consistent versions**: Always uses the local version during development
- **Simplified workflow**: No need to publish/link packages manually

## Development Workflow

### Making Changes to argos-sdk

1. Make changes to `argos-sdk/src/`
2. Changes are immediately available to argos-saleslogix via the workspace symlink
3. No build step required - source files use AMD format with modern JavaScript features

Source files are written in AMD (Asynchronous Module Definition) format and can be used directly by browsers without transpilation.

### Running Tests

**Run all tests:**
```bash
npm run test:all
```

**Run tests for a specific package:**
```bash
npm run test:sdk
npm run test:saleslogix
```

**Run end-to-end tests:**
```bash
cd products/argos-saleslogix
npm run e2e
```

### CSS Compilation

Compile CSS from LESS stylesheets:
```bash
npm run less -w argos-sdk
npm run less -w products/argos-saleslogix
```

### No Build Step Required

Source files are in AMD format with modern JavaScript features and can be used directly by the browser. No transpilation or build step is required for JavaScript files.

## Module Format

The codebase uses AMD (Asynchronous Module Definition) modules with modern JavaScript features:

### Module ID Convention

- **argos-sdk modules**: Use `argos/` prefix
  - `argos-sdk/src/Application.js` → `define('argos/Application', ...)`
  - `argos-sdk/src/Fields/TextField.js` → `define('argos/Fields/TextField', ...)`

- **argos-saleslogix modules**: Use `crm/` prefix
  - `products/argos-saleslogix/src/Application.js` → `define('crm/Application', ...)`
  - `products/argos-saleslogix/src/Views/Account/List.js` → `define('crm/Views/Account/List', ...)`

### AMD Module Example

```javascript
define('argos/Application', [
  './View',
  './I18n',
  './actions/connection'
], function(View, getResource, connectionActions) {
  const { setConnectionState } = connectionActions;
  
  class Application {
    constructor() {
      // Modern JavaScript features are preserved
      this.views = [];
    }
    
    async initialize() {
      // async/await, arrow functions, const/let all supported
      const config = await this.loadConfig();
      return config;
    }
  }
  
  return Application;
});
```

### Modern JavaScript Support

Source files use modern JavaScript features supported by current browsers:
- `const` and `let` declarations
- Arrow functions
- Template literals
- Class syntax
- Destructuring
- Spread operators
- `async`/`await`
- Object shorthand notation

No transpilation is required - browsers load AMD modules directly.

## CI/CD Pipeline

The Jenkins pipeline (defined in `Jenkinsfile`) uses npm workspaces:

```groovy
// Install all dependencies once
sh 'npm install'

// Run tests
sh 'npm run test -w argos-sdk'
sh 'npm run test -w products/argos-saleslogix'

// Compile CSS
sh 'npm run less -w argos-sdk'
sh 'npm run less -w products/argos-saleslogix'
```

Benefits:
- Single `npm install` for the entire monorepo
- Faster builds due to dependency hoisting
- No transpilation step required
- Explicit workspace targeting

## Troubleshooting

See [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) for common issues and solutions.

## Additional Resources

- [npm workspaces documentation](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Argos SDK Documentation](./argos-sdk/README.md)
- [Argos SalesLogix Documentation](./products/argos-saleslogix/README.md)
