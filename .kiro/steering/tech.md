# Technology Stack

## Build System

- **Package Manager**: npm workspaces (migrated from Yarn)
- **Task Runner**: Grunt
- **CSS Preprocessor**: LESS
- **Module Format**: AMD (Asynchronous Module Definition) with modern JavaScript

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

### CSS Compilation
```bash
# Compile LESS to CSS
cd argos-sdk && npm run less
cd products/argos-saleslogix && npm run less
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

## Module Format

Source files use AMD (Asynchronous Module Definition) with modern JavaScript features. No transpilation is required - browsers load modules directly.

### Module ID Convention

- **argos-sdk modules**: Use `argos/` prefix
  - `argos-sdk/src/Application.js` → `define('argos/Application', ...)`
  - `argos-sdk/src/Fields/TextField.js` → `define('argos/Fields/TextField', ...)`

- **argos-saleslogix modules**: Use `crm/` prefix
  - `products/argos-saleslogix/src/Application.js` → `define('crm/Application', ...)`
  - `products/argos-saleslogix/src/Views/Account/List.js` → `define('crm/Views/Account/List', ...)`

### AMD Module Structure

```javascript
define('argos/Application', [
  './View',
  './I18n',
  './actions/connection'
], function(View, getResource, connectionActions) {
  const { setConnectionState } = connectionActions;
  
  class Application extends View {
    constructor() {
      super();
      this.views = [];
    }
    
    async initialize() {
      const config = await this.loadConfig();
      return config;
    }
  }
  
  return Application;
});
```

### Modern JavaScript Features

Source files use modern JavaScript features supported by current browsers:
- `const` and `let` declarations
- Arrow functions
- Template literals
- Class syntax
- Destructuring
- Spread operators
- `async`/`await`
- Object shorthand notation

### Dependency Paths

- **Relative imports**: Use `./` or `../` for same-package modules
- **Cross-package imports**: Use full module ID (e.g., `argos/View` from argos-saleslogix)
- **External libraries**: Use library paths (e.g., `dojo/_base/declare`, `dijit/_WidgetBase`)

## Workspace Structure

The monorepo uses npm workspaces with dependency hoisting:
- Shared dev dependencies at root (grunt, eslint)
- Package-specific dependencies in each workspace
- argos-saleslogix depends on argos-sdk via workspace symlink
- Source files are in AMD format and used directly by browsers
