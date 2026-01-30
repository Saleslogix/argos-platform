# Implementation Plan: Monorepo npm Migration

## Overview

This implementation plan breaks down the migration from Yarn to npm workspaces into discrete, incremental steps. Each task builds on previous work and includes verification points to catch issues early. The migration follows a phased approach: analysis, configuration, dependency consolidation, script updates, CI/CD migration, and comprehensive verification.

## Tasks

- [x] 1. Analyze current dependency structure
  - Scan argos-sdk/package.json and products/argos-saleslogix/package.json
  - Create a list of all dependencies and devDependencies from both packages
  - Identify which dependencies appear in both packages (candidates for hoisting)
  - Identify which dependencies are unique to each package (stay local)
  - Document the current dependency graph
  - _Requirements: 3.1, 3.2_

- [x] 2. Create root workspace configuration
  - [x] 2.1 Create root package.json with workspace configuration
    - Set name to "argos-monorepo"
    - Set private to true
    - Define workspaces array: ["argos-sdk", "products/argos-saleslogix"]
    - Add convenience scripts (install:all, build:all, test:all, build:sdk, build:saleslogix, test:sdk, test:saleslogix)
    - _Requirements: 1.1, 1.2, 1.3, 4.2, 9.3_

- [x] 3. Consolidate shared dependencies to root
  - [x] 3.1 Move shared dependencies to root package.json
    - Based on analysis from task 1, move shared dependencies to root devDependencies
    - Include: grunt, grunt plugins, babel packages, eslint packages, jasmine
    - Remove these dependencies from workspace package.json files
    - _Requirements: 3.1, 3.2_
  
  - [x] 3.3 Write property test for unique dependency locality
    - **Property 2: Unique Dependency Locality**
    - **Validates: Requirements 3.2**
    - Generate test cases with various dependency configurations
    - Verify that dependencies appearing in only one package stay local
    - Run 100+ iterations
    - _Requirements: 3.2_

- [x] 4. Update workspace package configurations
  - [x] 4.1 Update argos-saleslogix package.json to use workspace dependency
    - Add "argos-sdk": "workspace:*" to dependencies
    - Keep package-specific devDependencies: express, mocha, playwright
    - Ensure all script names remain unchanged
    - _Requirements: 7.1, 4.4_
  
  - [x] 4.2 Update argos-sdk package.json
    - Remove shared dependencies that were moved to root
    - Keep any SDK-specific dependencies
    - Ensure all script names remain unchanged
    - _Requirements: 3.2, 4.4_

- [x] 5. Remove Yarn artifacts and install with npm
  - [x] 5.1 Remove Yarn files
    - Delete yarn.lock from root and all subdirectories
    - Delete .yarnrc files if they exist
    - _Requirements: 2.1, 2.2_
  
  - [x] 5.2 Run npm install at root
    - Execute npm install from repository root
    - Verify package-lock.json is created at root
    - Verify node_modules is created with hoisted dependencies
    - Verify workspace symlinks are created
    - _Requirements: 1.4, 2.3, 3.3, 7.2_

- [x] 6. Update Grunt configuration for workspace resolution
  - [x] 6.1 Update argos-saleslogix Gruntfile.js
    - Replace hardcoded basePath with require.resolve() approach
    - Use: `const sdkPath = path.dirname(require.resolve('argos-sdk/package.json'));`
    - Verify Grunt can load tasks from grunt-tasks directory
    - _Requirements: 6.2, 6.3_
  
  - [x] 6.2 Write unit tests for Grunt configuration
    - Test that Gruntfile.js files exist in both packages
    - Test that argos-saleslogix Gruntfile can resolve argos-sdk path
    - _Requirements: 6.1, 6.2_

- [x] 7. Checkpoint - Verify build system works
  - Run npm run build in argos-sdk directory
  - Run npm run build in products/argos-saleslogix directory
  - Run npm run build -w argos-sdk from root
  - Run npm run build -w products/argos-saleslogix from root
  - Verify all builds complete successfully
  - Verify compiled output files are generated
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 4.1, 8.1, 9.1, 9.2_

- [x] 8. Verify test infrastructure
  - [x] 8.1 Run all test suites
    - Execute npm run test in argos-sdk (Jasmine tests)
    - Execute npm run test in products/argos-saleslogix (Mocha tests)
    - Execute npm run e2e in products/argos-saleslogix (Playwright tests)
    - Verify all tests pass
    - _Requirements: 8.2, 10.2, 10.3_
  
  - [x] 8.2 Write unit tests for test execution
    - Test that npm run test works in both workspace packages
    - Test that test frameworks can resolve dependencies
    - _Requirements: 8.2, 10.4_

- [x] 9. Verify additional build tasks
  - [x] 9.1 Test LESS compilation
    - Run npm run less in both packages
    - Verify CSS files are generated
    - _Requirements: 8.3_
  
  - [x] 9.2 Test linting
    - Run npm run lint in both packages
    - Run npm run lint-fix in both packages
    - Verify ESLint executes correctly
    - _Requirements: 4.4_
  
  - [x] 9.3 Test watch mode
    - Run npm run build:watch in a package
    - Verify watch mode starts correctly (then stop it)
    - _Requirements: 4.4_
  
  - [x] 9.4 Write unit tests for build tasks
    - Test that less, lint, lint-fix, build:watch scripts exist
    - Test that LESS compilation produces CSS output
    - _Requirements: 8.3, 4.4_

- [x] 10. Verify workspace dependency live-linking
  - [x] 10.1 Test argos-sdk changes reflect in argos-saleslogix
    - Make a small change to argos-sdk source code
    - Build argos-saleslogix without reinstalling
    - Verify the change is reflected in argos-saleslogix build output
    - Revert the test change
    - _Requirements: 7.3_
  
  - [x] 10.2 Write unit test for workspace symlink
    - Test that argos-sdk symlink exists in argos-saleslogix/node_modules
    - Test that symlink points to correct location
    - _Requirements: 7.2_

- [x] 11. Update Jenkinsfile for npm workspaces
  - [x] 11.1 Replace Yarn commands with npm commands
    - Replace all "yarn" with "npm install"
    - Replace all "yarn run" with "npm run"
    - Consolidate to single npm install at root instead of per-directory installs
    - Use npm run -w <workspace> syntax for workspace-specific commands
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 11.2 Optimize CI pipeline for workspaces
    - Run npm install once at root
    - Use npm run build --workspaces or individual -w flags
    - Use npm run test --workspaces or individual -w flags
    - _Requirements: 5.3_
  
  - [x] 11.3 Write unit tests for Jenkinsfile
    - Test that Jenkinsfile contains "npm install" not "yarn"
    - Test that Jenkinsfile contains "npm run" not "yarn run"
    - Test that Jenkinsfile runs npm install at root level
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 12. Checkpoint - Verify CI/CD pipeline
  - Run Jenkinsfile in test/staging environment
  - Verify all stages complete successfully
  - Verify deployment artifacts are generated
  - Compare artifacts to pre-migration baseline
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 5.4_

- [x] 13. Test command execution flexibility
  - [x] 13.1 Test root-level commands
    - Run npm run build:all from root
    - Run npm run test:all from root
    - Run npm run build:sdk from root
    - Run npm run test:saleslogix from root
    - Verify all commands work correctly
    - _Requirements: 9.1, 9.3_
  
  - [x] 13.2 Test workspace-level commands
    - cd into argos-sdk, run npm run build
    - cd into products/argos-saleslogix, run npm run test
    - Verify commands work from within workspace directories
    - _Requirements: 9.2_
  
  - [x] 13.3 Write unit tests for command execution
    - Test that root convenience scripts exist and work
    - Test that workspace scripts can be executed with -w flag
    - _Requirements: 9.1, 9.3_

- [x] 14. Verify deterministic installation
  - [x] 14.1 Write property test for deterministic installation
    - **Property 3: Deterministic Installation**
    - **Validates: Requirements 11.4**
    - Run npm install in multiple clean environments
    - Hash node_modules structure and package versions
    - Verify identical results across environments
    - Run 100+ iterations
    - _Requirements: 11.4_

- [x] 15. Create migration documentation
  - [x] 15.1 Create or update README with workspace information
    - Document the workspace structure
    - Explain how to run commands from root vs package level
    - Provide examples: npm install, npm run build, npm run test
    - Explain how to add new dependencies (root vs workspace)
    - Document the workspace dependency syntax (workspace:*)
    - _Requirements: 12.1, 12.4_
  
  - [x] 15.2 Document workflow changes
    - Create migration guide explaining changes from Yarn to npm
    - Document new CI/CD pipeline commands
    - Provide troubleshooting tips for common issues
    - _Requirements: 12.1_

- [ ] 16. Final verification and cleanup
  - [x] 16.1 Run complete verification checklist
    - Verify all Yarn artifacts removed
    - Verify root package.json and package-lock.json exist
    - Verify all build scripts work
    - Verify all test scripts work
    - Verify Grunt tasks work
    - Verify workspace dependency resolution
    - Verify CI/CD pipeline works
    - _Requirements: 2.1, 2.2, 2.3, 8.1, 8.2, 6.4, 7.3, 5.4_
  
  - [x] 16.2 Run all unit tests
    - Execute complete unit test suite
    - Verify all tests pass
    - _Requirements: All_
  
  - [x] 16.3 Compare deployment artifacts
    - Build deployment artifacts with new npm setup
    - Compare to baseline artifacts from Yarn setup
    - Verify artifacts are functionally equivalent
    - _Requirements: 5.4_

- [x] 17. Final checkpoint - Migration complete
  - Review all completed tasks
  - Confirm all requirements are met
  - Ensure all tests pass, ask the user if questions arise.
  - Document any remaining issues or follow-up items

## Notes

- All tasks are required for comprehensive migration with full testing coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and catch issues early
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific configurations and behaviors
- The migration can be rolled back at any checkpoint if critical issues are discovered
- All existing functionality (build, test, CI/CD) must continue working after migration
