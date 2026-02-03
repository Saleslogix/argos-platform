# Technology Stack

## Build System

- **Package Manager**: npm workspaces (migrated from Yarn)
- **Task Runner**: Grunt
- **Transpiler**: Babel 6 (ES2015/ES2016/ES2017 → AMD modules)
- **CSS Preprocessor**: LESS
- **Module Format**: AMD (Asynchronous Module Definition)

## Core Technologies

### Frontend Framework
- **Dojo Toolkit**: Core framework (dijit widgets, dojo/_base)
- **Redux**: State management
- **PageJS**: Client-side routing
- **Simplate**: Templating engine

### Data & Storage
- **SData Client**: Backend communication protocol
- **PouchDB**: Offline data storage
- **Redux**: Application state

### UI Components
- **Soho/IDS**: Enterprise UI component library
- **Chart.js**: Data visualization
- **PDF.js**: PDF rendering

### Testing
- **Jasmine**: Unit testing (argos-sdk)
- **Mocha**: Unit testing (argos-saleslogix)
- **Playwright**: End-to-end testing
- **fast-check**: Property-based testing

### Localization
- **L20n**: Localization framework
- **Moment.js**: Date/time formatting with locales

## Common Commands

### Installation
```bash
# Install all workspace dependencies
npm install
```

### Building
```bash
# Build all packages
npm run build:all

# Build SDK only
npm run build:sdk
npm run build -w argos-sdk

# Build SalesLogix only
npm run build:saleslogix
npm run build -w products/argos-saleslogix

# Watch mode (auto-rebuild on changes)
cd argos-sdk && npm run watch
cd products/argos-saleslogix && npm run watch
```

### Testing
```bash
# Run all tests
npm run test:all

# Test SDK
npm run test:sdk
npm run test -w argos-sdk

# Test SalesLogix
npm run test:saleslogix
npm run test -w products/argos-saleslogix

# E2E tests (SalesLogix only)
cd products/argos-saleslogix && npm run e2e
```

### Linting
```bash
# Lint SDK
cd argos-sdk && npm run lint
cd argos-sdk && npm run lint-fix

# Lint SalesLogix
cd products/argos-saleslogix && npm run lint
cd products/argos-saleslogix && npm run lint-fix
```

### CSS Compilation
```bash
# Compile LESS to CSS
cd argos-sdk && npm run less
cd products/argos-saleslogix && npm run less
```

### Development Server
```bash
# Start SalesLogix dev server
cd products/argos-saleslogix && npm start
```

## Babel Configuration

Transpiles ES2015+ to AMD modules with:
- Presets: es2015 (modules: false), es2016, es2017
- Plugins: add-module-exports, transform-es2015-modules-amd (strict: false), transform-object-rest-spread
- Module IDs enabled with moduleRoot: "argos"

## Workspace Structure

The monorepo uses npm workspaces with dependency hoisting:
- Shared dev dependencies at root (grunt, babel, eslint)
- Package-specific dependencies in each workspace
- argos-saleslogix depends on argos-sdk via workspace symlink
