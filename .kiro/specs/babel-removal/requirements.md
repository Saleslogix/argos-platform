# Requirements Document: Babel Removal and AMD Conversion

## Introduction

This specification defines the requirements for removing Babel from the argos-sdk and argos-saleslogix projects and converting all ES6+ source files to native AMD (Asynchronous Module Definition) syntax. The project currently uses Babel 6 to transpile ES2015/ES2016/ES2017 features to ES5 and convert ES6 modules to AMD format. Since the application now targets modern browsers, Babel is no longer necessary, and source files can be written directly in AMD format while preserving modern JavaScript features.

## Glossary

- **AMD**: Asynchronous Module Definition - a JavaScript module format that uses `define()` and `require()` functions
- **Babel**: A JavaScript transpiler that converts ES6+ code to ES5
- **ES6+**: ECMAScript 2015 and later versions with modern JavaScript features
- **Module_ID**: A unique string identifier for an AMD module (e.g., "argos/Application")
- **SDK**: The argos-sdk package containing the core framework
- **SalesLogix**: The argos-saleslogix package containing the CRM product
- **src-out**: The build output directory containing transpiled files (to be eliminated)
- **Modern_JavaScript**: JavaScript features supported by current browsers (const, let, arrow functions, classes, template literals, destructuring, spread operator)

## Requirements

### Requirement 1: Remove Babel Dependencies

**User Story:** As a developer, I want Babel removed from the build process, so that the project has fewer dependencies and a simpler build pipeline.

#### Acceptance Criteria

1. WHEN Babel packages are uninstalled, THE System SHALL remove all Babel-related dependencies from package.json files
2. WHEN .babelrc files exist, THE System SHALL delete them from both SDK and SalesLogix packages
3. WHEN build scripts reference Babel, THE System SHALL update them to remove Babel commands
4. THE System SHALL remove babel-cli, babel-preset-es2015, babel-preset-es2016, babel-preset-es2017, babel-plugin-add-module-exports, babel-plugin-transform-es2015-modules-amd, and babel-plugin-transform-object-rest-spread from dependencies

### Requirement 2: Convert ES6 Imports to AMD Dependencies

**User Story:** As a developer, I want ES6 import statements converted to AMD dependency arrays, so that modules load correctly without transpilation.

#### Acceptance Criteria

1. WHEN a file contains `import X from 'Y'`, THE System SHALL convert it to an AMD dependency in the define array
2. WHEN a file contains named imports `import { A, B } from 'Y'`, THE System SHALL convert it to an AMD dependency with destructuring in the factory function
3. WHEN a file contains multiple import statements, THE System SHALL consolidate them into a single AMD dependency array
4. WHEN relative paths are used in imports, THE System SHALL preserve them in AMD dependencies
5. THE System SHALL maintain the correct order of dependencies to preserve initialization sequence

### Requirement 3: Convert ES6 Exports to AMD Returns

**User Story:** As a developer, I want ES6 export statements converted to AMD return statements, so that modules expose their APIs correctly.

#### Acceptance Criteria

1. WHEN a file contains `export default X`, THE System SHALL convert it to `return X` at the end of the define factory function
2. WHEN a file contains named exports, THE System SHALL convert them to return an object with named properties
3. WHEN a class is exported as default, THE System SHALL return the class from the define function
4. THE System SHALL ensure only one return statement exists per module

### Requirement 4: Add Module IDs to Define Calls

**User Story:** As a developer, I want all define() calls to include explicit module IDs, so that modules can be referenced consistently.

#### Acceptance Criteria

1. WHEN a file is in argos-sdk/src/, THE System SHALL add a module ID starting with "argos/"
2. WHEN a file is in products/argos-saleslogix/src/, THE System SHALL add a module ID starting with "crm/"
3. WHEN a file path is argos-sdk/src/Fields/TextField.js, THE System SHALL use module ID "argos/Fields/TextField"
4. WHEN a file path is products/argos-saleslogix/src/Views/Account/List.js, THE System SHALL use module ID "crm/Views/Account/List"
5. THE System SHALL derive module IDs from file paths relative to the src/ directory

### Requirement 5: Preserve Modern JavaScript Features

**User Story:** As a developer, I want modern JavaScript features preserved in the source code, so that the code remains readable and maintainable.

#### Acceptance Criteria

1. THE System SHALL preserve const and let declarations
2. THE System SHALL preserve arrow functions
3. THE System SHALL preserve template literals
4. THE System SHALL preserve class syntax
5. THE System SHALL preserve destructuring assignments
6. THE System SHALL preserve spread operators
7. THE System SHALL preserve async/await syntax
8. THE System SHALL preserve object shorthand notation

### Requirement 6: Update Build Scripts

**User Story:** As a developer, I want build scripts updated to work without Babel, so that the build process continues to function.

#### Acceptance Criteria

1. WHEN package.json contains a "build" script with Babel, THE System SHALL remove or update it
2. WHEN package.json contains a "build:watch" script with Babel, THE System SHALL remove or update it
3. WHEN Grunt tasks reference src-out/, THE System SHALL update them to reference src/
4. THE System SHALL update any scripts that depend on the transpilation step

### Requirement 7: Eliminate src-out Directory

**User Story:** As a developer, I want the src-out directory eliminated, so that source files are used directly without a build step.

#### Acceptance Criteria

1. WHEN the migration is complete, THE System SHALL remove src-out/ directories
2. WHEN configuration files reference src-out/, THE System SHALL update them to reference src/
3. WHEN HTML files load modules from src-out/, THE System SHALL update them to load from src/
4. THE System SHALL update all file path references throughout the codebase

### Requirement 8: Maintain Test Compatibility

**User Story:** As a developer, I want all existing tests to continue working, so that functionality is verified after the migration.

#### Acceptance Criteria

1. WHEN tests are run after migration, THE System SHALL execute all tests successfully
2. WHEN test files import modules, THE System SHALL use correct AMD syntax
3. WHEN test configuration references modules, THE System SHALL use correct paths
4. THE System SHALL update test setup files to work with AMD modules

### Requirement 9: Update Documentation

**User Story:** As a developer, I want documentation updated to reflect the new build process, so that other developers understand the changes.

#### Acceptance Criteria

1. WHEN README files mention Babel, THE System SHALL update them to describe the AMD approach
2. WHEN documentation describes the build process, THE System SHALL remove references to transpilation
3. WHEN documentation shows code examples, THE System SHALL use AMD syntax
4. THE System SHALL document the module ID convention

### Requirement 10: Validate Module Loading

**User Story:** As a developer, I want to verify that all modules load correctly, so that the application runs without errors.

#### Acceptance Criteria

1. WHEN the application starts, THE System SHALL load all required modules
2. WHEN a module has dependencies, THE System SHALL load them in the correct order
3. WHEN circular dependencies exist, THE System SHALL handle them appropriately
4. THE System SHALL report any module loading errors clearly
