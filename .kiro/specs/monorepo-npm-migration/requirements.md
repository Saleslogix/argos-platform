# Requirements Document

## Introduction

This document specifies the requirements for migrating a monorepo containing argos-sdk and products/argos-saleslogix from Yarn package management to npm workspaces. The migration must maintain all existing functionality including build processes, testing, and CI/CD pipelines while modernizing the dependency management approach.

## Glossary

- **Monorepo**: A single repository containing multiple related packages (argos-sdk and argos-saleslogix)
- **npm_Workspaces**: npm's built-in feature for managing multiple packages within a single repository
- **Package_Manager**: The tool used to install and manage dependencies (Yarn or npm)
- **Root_Package**: The top-level package.json that defines workspace configuration
- **Workspace_Package**: Individual packages within the monorepo (argos-sdk, argos-saleslogix)
- **Build_System**: The Grunt-based build configuration that compiles, tests, and bundles code
- **CI_Pipeline**: The Jenkins-based continuous integration system defined in Jenkinsfile
- **Dependency_Graph**: The relationship between packages where argos-saleslogix depends on argos-sdk

## Requirements

### Requirement 1: Workspace Configuration

**User Story:** As a developer, I want to configure npm workspaces at the repository root, so that npm can manage all packages in the monorepo.

#### Acceptance Criteria

1. THE Root_Package SHALL define a workspaces array containing paths to all workspace packages
2. WHEN the Root_Package is created, THE Package_Manager SHALL include workspace configuration for "argos-sdk" and "products/argos-saleslogix"
3. THE Root_Package SHALL specify a private field set to true to prevent accidental publication
4. WHEN npm install is run at the root, THE Package_Manager SHALL install dependencies for all workspace packages

### Requirement 2: Yarn Artifact Removal

**User Story:** As a developer, I want to remove all Yarn-specific files, so that the repository uses only npm for package management.

#### Acceptance Criteria

1. WHEN the migration is complete, THE Build_System SHALL NOT contain any yarn.lock files
2. WHEN the migration is complete, THE Build_System SHALL NOT contain any .yarnrc files
3. THE Package_Manager SHALL create a package-lock.json file at the repository root
4. WHEN Yarn artifacts are removed, THE Dependency_Graph SHALL remain unchanged

### Requirement 3: Dependency Consolidation

**User Story:** As a developer, I want shared dependencies consolidated at the root level, so that we reduce duplication and ensure version consistency.

#### Acceptance Criteria

1. WHEN a dependency is used by multiple workspace packages, THE Root_Package SHALL contain that dependency in its devDependencies
2. WHEN a dependency is unique to one workspace package, THE Workspace_Package SHALL contain that dependency locally
3. THE Package_Manager SHALL hoist shared dependencies to the root node_modules directory
4. WHEN dependencies are consolidated, THE Build_System SHALL continue to resolve all required modules correctly

### Requirement 4: Package Script Updates

**User Story:** As a developer, I want package.json scripts updated to use npm commands, so that all build and test operations work with the new package manager.

#### Acceptance Criteria

1. WHEN a Workspace_Package contains scripts, THE Package_Manager SHALL execute them using npm run syntax
2. THE Root_Package SHALL provide convenience scripts for running commands across all workspaces
3. WHEN a script references another workspace package, THE Package_Manager SHALL resolve the dependency correctly
4. THE Build_System SHALL maintain all existing script names (test, build, build:watch, less, lint, lint-fix)

### Requirement 5: CI/CD Pipeline Migration

**User Story:** As a DevOps engineer, I want the Jenkinsfile updated to use npm commands, so that the CI/CD pipeline works with the new package manager.

#### Acceptance Criteria

1. WHEN the CI_Pipeline runs, THE Package_Manager SHALL use "npm install" instead of "yarn"
2. WHEN the CI_Pipeline executes scripts, THE Package_Manager SHALL use "npm run" instead of "yarn run"
3. THE CI_Pipeline SHALL install dependencies once at the root level for all workspace packages
4. WHEN the CI_Pipeline completes, THE Build_System SHALL produce the same deployment artifacts as before migration

### Requirement 6: Grunt Configuration Strategy

**User Story:** As a developer, I want a clear Grunt configuration strategy for the monorepo, so that build tasks are maintainable and efficient.

#### Acceptance Criteria

1. THE Build_System SHALL maintain separate Gruntfile.js configurations in each workspace package
2. WHEN argos-saleslogix references argos-sdk, THE Build_System SHALL resolve the path correctly using workspace conventions
3. THE Build_System SHALL continue to load tasks from grunt-tasks directories in each package
4. WHEN Grunt tasks execute, THE Build_System SHALL access dependencies installed via npm workspaces

### Requirement 7: Cross-Package Dependencies

**User Story:** As a developer, I want argos-saleslogix to reference argos-sdk as a workspace dependency, so that changes to argos-sdk are immediately available during development.

#### Acceptance Criteria

1. WHEN argos-saleslogix declares a dependency on argos-sdk, THE Package_Manager SHALL use workspace protocol syntax
2. THE Package_Manager SHALL symlink argos-sdk into argos-saleslogix's node_modules
3. WHEN argos-sdk code changes, THE Build_System SHALL reflect those changes in argos-saleslogix without reinstalling
4. THE Dependency_Graph SHALL maintain the existing relationship where argos-saleslogix depends on argos-sdk

### Requirement 8: Build Process Verification

**User Story:** As a developer, I want all build processes to continue working after migration, so that no functionality is lost.

#### Acceptance Criteria

1. WHEN "npm run build" is executed in a workspace package, THE Build_System SHALL compile all source files successfully
2. WHEN "npm run test" is executed in a workspace package, THE Build_System SHALL run all tests and report results
3. WHEN "npm run less" is executed, THE Build_System SHALL compile LESS files to CSS
4. WHEN Babel transpilation runs, THE Build_System SHALL convert ES2015+ code to AMD modules correctly

### Requirement 9: Command Execution Flexibility

**User Story:** As a developer, I want to run commands from either the root or individual package directories, so that I have flexibility in my workflow.

#### Acceptance Criteria

1. WHEN a command is run from the root directory, THE Package_Manager SHALL support executing scripts in specific workspaces using -w flag
2. WHEN a command is run from a workspace package directory, THE Package_Manager SHALL execute that package's scripts
3. THE Root_Package SHALL provide scripts for running commands across all workspaces simultaneously
4. WHEN npm install is run from any location, THE Package_Manager SHALL maintain the workspace structure correctly

### Requirement 10: Development Server and E2E Tests

**User Story:** As a developer, I want the Express development server and Playwright e2e tests to continue working, so that local development and testing workflows are unaffected.

#### Acceptance Criteria

1. WHEN the Express server is started in argos-saleslogix, THE Build_System SHALL serve the application correctly
2. WHEN Playwright e2e tests run, THE Build_System SHALL execute all test suites successfully
3. WHEN Mocha tests run, THE Build_System SHALL execute all unit tests successfully
4. THE Build_System SHALL resolve all test dependencies installed via npm workspaces

### Requirement 11: Lock File Management

**User Story:** As a developer, I want a single package-lock.json at the root, so that dependency versions are locked consistently across all packages.

#### Acceptance Criteria

1. THE Package_Manager SHALL create a package-lock.json file at the repository root
2. THE Package_Manager SHALL NOT create package-lock.json files in workspace package directories
3. WHEN dependencies are installed, THE Package_Manager SHALL update only the root package-lock.json
4. THE Package_Manager SHALL ensure deterministic installs across different environments using the lock file

### Requirement 12: Documentation and Migration Guide

**User Story:** As a team member, I want clear documentation of the migration changes, so that everyone understands how to work with the new setup.

#### Acceptance Criteria

1. THE Root_Package SHALL include a README or documentation explaining the workspace structure
2. THE Build_System SHALL document how to run commands at root vs package level
3. THE Build_System SHALL document any changes to developer workflows
4. THE Build_System SHALL provide examples of common tasks (install, build, test, add dependency)
