# Implementation Plan: Babel Removal and AMD Conversion

## Overview

This implementation plan breaks down the Babel removal and AMD conversion into discrete, manageable tasks. The approach is to build and test the conversion tooling first, then apply it systematically to the codebase, and finally clean up build configuration and documentation.

The implementation follows a phased approach:
1. Build conversion utilities and test them
2. Convert argos-sdk source files
3. Convert argos-saleslogix source files
4. Update build configuration and remove Babel
5. Update documentation and validate

## Tasks

- [ ] 1. Create conversion utility infrastructure
  - Create a new directory `tools/babel-removal/` for conversion scripts
  - Install Esprima parser: `npm install esprima --save-dev`
  - Set up basic file system utilities for reading/writing files
  - Create logging utilities for tracking conversion progress and errors
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Implement module ID generator
  - [ ] 2.1 Create function to generate module IDs from file paths
    - Parse file path to extract relative path from src/
    - Add "argos/" prefix for argos-sdk files
    - Add "crm/" prefix for argos-saleslogix files
    - Handle nested directories (e.g., Fields/TextField.js → argos/Fields/TextField)
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [ ] 2.2 Write property test for module ID generation
    - **Property 12: Module ID Generation**
    - **Validates: Requirements 4.1, 4.2, 4.5**
    - Generate random file paths and verify correct module ID format
    - Test both argos-sdk and argos-saleslogix paths
    - Verify prefix and path structure

- [ ] 3. Implement import statement parser and converter
  - [ ] 3.1 Create AST-based parser for ES6 import statements
    - Use Esprima to parse source code into AST
    - Traverse AST to find ImportDeclaration nodes
    - Extract default imports (ImportDefaultSpecifier)
    - Extract named imports (ImportSpecifier)
    - Extract import source paths
    - _Requirements: 2.1, 2.2_
  
  - [ ] 3.2 Create converter for imports to AMD dependencies
    - Build AMD dependency array from ImportDeclaration nodes
    - Generate factory function parameters for default imports
    - Create destructuring statements for named imports
    - Preserve relative paths from source.value
    - Maintain import order from AST node sequence
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 3.3 Write property tests for import conversion
    - **Property 4: Default Import Conversion**
    - **Validates: Requirements 2.1**
    - **Property 5: Named Import Conversion**
    - **Validates: Requirements 2.2**
    - **Property 6: Multiple Import Consolidation**
    - **Validates: Requirements 2.3**
    - **Property 7: Relative Path Preservation**
    - **Validates: Requirements 2.4**
    - **Property 8: Import Order Preservation**
    - **Validates: Requirements 2.5**

- [ ] 4. Implement export statement parser and converter
  - [ ] 4.1 Create AST-based parser for ES6 export statements
    - Use Esprima AST to find ExportDefaultDeclaration nodes
    - Use Esprima AST to find ExportNamedDeclaration nodes
    - Extract export type (default vs named)
    - Extract declaration information (ClassDeclaration, FunctionDeclaration, etc.)
    - Handle inline exports vs separate export statements
    - _Requirements: 3.1, 3.2_
  
  - [ ] 4.2 Create converter for exports to AMD returns
    - Generate return statement for ExportDefaultDeclaration
    - Generate return object for ExportNamedDeclaration
    - Use node.range to extract source code for declarations
    - Ensure single return statement per module
    - Handle class and function exports correctly
    - _Requirements: 3.1, 3.2, 3.4_
  
  - [ ] 4.3 Write property tests for export conversion
    - **Property 9: Default Export Conversion**
    - **Validates: Requirements 3.1, 3.3**
    - **Property 10: Named Export Conversion**
    - **Validates: Requirements 3.2**
    - **Property 11: Single Return Statement**
    - **Validates: Requirements 3.4**

- [ ] 5. Implement complete file converter
  - [ ] 5.1 Create main conversion orchestrator
    - Read source file content
    - Parse entire file to AST using Esprima with options: { loc: true, range: true, comment: true }
    - Extract and convert ImportDeclaration nodes
    - Extract module body (all nodes except imports and exports) using node.range
    - Extract and convert ExportDeclaration nodes
    - Generate complete AMD define() statement
    - Write converted file
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 4.5_
  
  - [ ] 5.2 Add modern JavaScript feature preservation
    - Verify Esprima correctly parses const/let declarations
    - Verify arrow functions are preserved in extracted code
    - Verify template literals are preserved
    - Verify class syntax is preserved
    - Verify destructuring is preserved
    - Verify spread operators are preserved
    - Verify async/await is preserved
    - Verify object shorthand is preserved
    - Use node.range to extract original source code unchanged
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ] 5.3 Write property test for modern JavaScript preservation
    - **Property 13: Modern JavaScript Preservation**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**
    - Generate files with various modern JS features
    - Verify all features are preserved after conversion

- [ ] 6. Checkpoint - Test conversion utilities
  - Run all property tests to verify conversion logic
  - Test Esprima parsing with sample files from argos-sdk
  - Verify AST traversal correctly identifies imports and exports
  - Verify output is valid AMD syntax
  - Ensure all tests pass, ask the user if questions arise

- [ ] 7. Convert argos-sdk source files
  - [ ] 7.1 Create batch conversion script for argos-sdk
    - Scan argos-sdk/src/ directory recursively
    - Filter for .js files only
    - Skip third-party libraries
    - Apply conversion to each file
    - Log conversion progress and errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 4.5, 5.1-5.8_
  
  - [ ] 7.2 Run conversion on argos-sdk core files
    - Convert Application.js, View.js, and other base classes
    - Verify converted files have correct module IDs
    - Check for any conversion errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 4.5_
  
  - [ ] 7.3 Run conversion on argos-sdk subdirectories
    - Convert Fields/, Models/, Store/, Offline/, Dialogs/, Views/, Groups/, actions/, reducers/
    - Verify all files converted successfully
    - Check for missing dependencies or errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 4.5_
  
  - [ ] 7.4 Write integration tests for argos-sdk conversion
    - Test that converted modules can be loaded
    - Test that dependencies resolve correctly
    - Test basic functionality of key modules

- [ ] 8. Convert argos-saleslogix source files
  - [ ] 8.1 Create batch conversion script for argos-saleslogix
    - Scan products/argos-saleslogix/src/ directory recursively
    - Filter for .js files only
    - Apply conversion to each file
    - Log conversion progress and errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 4.5, 5.1-5.8_
  
  - [ ] 8.2 Run conversion on argos-saleslogix core files
    - Convert Application.js, ApplicationModule.js
    - Verify converted files have correct module IDs with "crm/" prefix
    - Check for any conversion errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 4.5_
  
  - [ ] 8.3 Run conversion on argos-saleslogix Views and Models
    - Convert all entity views (Account/, Contact/, Opportunity/, Activity/, etc.)
    - Convert Models/, Fields/, Integrations/, actions/, reducers/
    - Verify all files converted successfully
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 4.5_
  
  - [ ] 8.4 Write integration tests for argos-saleslogix conversion
    - Test that converted modules can be loaded
    - Test that dependencies on argos-sdk resolve correctly
    - Test basic functionality of key views

- [ ] 9. Checkpoint - Verify converted code
  - Review conversion logs for any errors or warnings
  - Spot-check converted files for correctness
  - Verify module IDs are correct
  - Ensure all tests pass, ask the user if questions arise

- [ ] 10. Update build scripts and remove Babel
  - [ ] 10.1 Update package.json scripts
    - Remove "build" script from argos-sdk/package.json (or update to not use Babel)
    - Remove "build:watch" script from argos-sdk/package.json
    - Remove "build" script from products/argos-saleslogix/package.json
    - Remove "build:watch" script from products/argos-saleslogix/package.json
    - Update root package.json scripts if needed
    - _Requirements: 1.3, 6.1, 6.2_
  
  - [ ] 10.2 Remove Babel configuration files
    - Delete argos-sdk/.babelrc
    - Delete products/argos-saleslogix/.babelrc
    - _Requirements: 1.2_
  
  - [ ] 10.3 Uninstall Babel dependencies
    - Remove babel-cli, babel-eslint, babel-plugin-*, babel-preset-* from root package.json
    - Remove babel-core, babel-polyfill from products/argos-saleslogix/package.json
    - Run npm install to update node_modules
    - _Requirements: 1.1, 1.4_
  
  - [ ] 10.4 Write property tests for Babel removal
    - **Property 1: Babel Dependency Removal**
    - **Validates: Requirements 1.1, 1.4**
    - **Property 2: Babel Configuration Removal**
    - **Validates: Requirements 1.2**
    - **Property 3: Build Script Update**
    - **Validates: Requirements 1.3, 6.1, 6.2**

- [ ] 11. Update Grunt configuration
  - [ ] 11.1 Update Grunt tasks to reference src/ instead of src-out/
    - Update argos-sdk/grunt-tasks/ files
    - Update products/argos-saleslogix/grunt-tasks/ files
    - Search for "src-out" references and replace with "src"
    - _Requirements: 6.3_
  
  - [ ] 11.2 Write property test for Grunt configuration
    - **Property 14: Grunt Configuration Update**
    - **Validates: Requirements 6.3**

- [ ] 12. Remove src-out directories and update references
  - [ ] 12.1 Delete src-out directories
    - Remove argos-sdk/src-out/
    - Remove products/argos-saleslogix/src-out/
    - _Requirements: 7.1_
  
  - [ ] 12.2 Update configuration files
    - Search for "src-out" in all configuration files
    - Update paths to reference "src" instead
    - Check index.html, test configuration, etc.
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [ ] 12.3 Write property tests for path updates
    - **Property 15: src-out Directory Removal**
    - **Validates: Requirements 7.1**
    - **Property 16: Path Reference Update**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [ ] 13. Update test files and configuration
  - [ ] 13.1 Convert test files to AMD syntax
    - Apply same conversion to argos-sdk/tests/ files
    - Apply same conversion to products/argos-saleslogix/tests/src/ files
    - Verify test files have correct module IDs
    - _Requirements: 8.2_
  
  - [ ] 13.2 Update test configuration
    - Update Jasmine configuration for argos-sdk
    - Update Mocha configuration for argos-saleslogix
    - Ensure test runners can load AMD modules
    - Update test paths to reference src/ instead of src-out/
    - _Requirements: 8.3_
  
  - [ ] 13.3 Run all tests to verify functionality
    - Run argos-sdk tests (Jasmine)
    - Run argos-saleslogix tests (Mocha)
    - Run E2E tests (Playwright)
    - Verify all tests pass
    - _Requirements: 8.1_
  
  - [ ] 13.4 Write property test for test configuration
    - **Property 17: Test Configuration Update**
    - **Validates: Requirements 8.3**

- [ ] 14. Checkpoint - Verify application functionality
  - Build both packages
  - Start development server
  - Navigate through key views
  - Check browser console for errors
  - Test offline functionality if enabled
  - Ensure all tests pass, ask the user if questions arise

- [ ] 15. Update documentation
  - [ ] 15.1 Update README files
    - Update argos-sdk/README.md to remove Babel references
    - Update products/argos-saleslogix/README.md to remove Babel references
    - Update root README.md if it mentions Babel
    - Document the AMD module format and conventions
    - _Requirements: 9.1, 9.2_
  
  - [ ] 15.2 Update code examples in documentation
    - Search for code examples in documentation
    - Update examples to use AMD syntax
    - Add examples of module ID convention
    - _Requirements: 9.3, 9.4_
  
  - [ ] 15.3 Update tech.md steering file
    - Remove Babel from build system section
    - Update module format description
    - Update build commands
    - _Requirements: 9.1, 9.2_
  
  - [ ] 15.4 Write property test for documentation updates
    - **Property 18: Documentation Update**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 16. Final validation and cleanup
  - [ ] 16.1 Run complete test suite
    - Run all unit tests (SDK and SalesLogix)
    - Run all E2E tests
    - Run all property-based tests
    - Verify 100% pass rate
    - _Requirements: 8.1, 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 16.2 Perform manual testing
    - Start application and verify it loads
    - Test key user workflows
    - Check for console errors
    - Verify offline functionality
    - Test on multiple browsers if possible
    - _Requirements: 10.1, 10.2_
  
  - [ ] 16.3 Generate conversion report
    - Document number of files converted
    - List any files that required manual intervention
    - Document any issues encountered
    - Create summary of changes
  
  - [ ] 16.4 Clean up conversion tools
    - Archive conversion scripts for future reference
    - Document the conversion process
    - Remove temporary files

- [ ] 17. Final checkpoint
  - Review all changes
  - Verify no Babel references remain
  - Confirm all tests pass
  - Ensure application runs correctly
  - Get final approval before committing

## Notes

- Each conversion task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout the process
- Property tests validate universal correctness properties
- The conversion can be done incrementally (SDK first, then SalesLogix)
- Rollback strategy: revert to previous commit if issues are discovered
