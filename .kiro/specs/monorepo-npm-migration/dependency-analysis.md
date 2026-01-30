# Dependency Analysis Report

## Overview

This document provides a comprehensive analysis of the current dependency structure across the argos-sdk and argos-saleslogix packages. This analysis informs the migration strategy for consolidating shared dependencies to the root package.json while keeping unique dependencies local to their respective packages.

## Package Summary

### argos-sdk
- **Location**: `argos-sdk/package.json`
- **Version**: 4.4.0
- **Total devDependencies**: 18
- **Total dependencies**: 0

### argos-saleslogix
- **Location**: `products/argos-saleslogix/package.json`
- **Version**: 4.4.0
- **Total devDependencies**: 27
- **Total dependencies**: 0

## Shared Dependencies (Candidates for Hoisting to Root)

These dependencies appear in both packages and should be moved to the root package.json devDependencies:

| Dependency | argos-sdk Version | argos-saleslogix Version | Recommended Root Version |
|------------|-------------------|--------------------------|--------------------------|
| babel-cli | ^6.26.0 | ^6.26.0 | ^6.26.0 |
| babel-eslint | ^10.1.0 | ^10.1.0 | ^10.1.0 |
| babel-plugin-add-module-exports | 0.2.1 | 0.2.1 | 0.2.1 |
| babel-plugin-transform-es2015-modules-amd | ^6.24.1 | ^6.24.1 | ^6.24.1 |
| babel-plugin-transform-object-rest-spread | ^6.26.0 | ^6.26.0 | ^6.26.0 |
| babel-preset-es2015 | ^6.24.1 | ^6.24.1 | ^6.24.1 |
| babel-preset-es2016 | ^6.24.1 | ^6.24.1 | ^6.24.1 |
| babel-preset-es2017 | ^6.24.1 | ^6.24.1 | ^6.24.1 |
| eslint | ^7.27.0 | ^7.27.0 | ^7.27.0 |
| grunt | ^1.5.3 | ^1.4.1 | ^1.5.3 |
| grunt-argos-deps | git+https://git@github.com/Saleslogix/grunt-argos-deps.git#v0.1.5 | git+https://git@github.com/Saleslogix/grunt-argos-deps.git#v0.1.5 | git+https://git@github.com/Saleslogix/grunt-argos-deps.git#v0.1.5 |
| grunt-contrib-clean | ^2.0.0 | ^2.0.0 | ^2.0.0 |
| grunt-contrib-connect | ^3.0.0 | ^3.0.0 | ^3.0.0 |
| grunt-contrib-jasmine | ^2.2.0 | ^2.2.0 | ^2.2.0 |
| grunt-contrib-less | 2.1.0 | 2.1.0 | 2.1.0 |
| grunt-shell | ^3.0.1 | ^3.0.1 | ^3.0.1 |

**Total Shared Dependencies**: 16

**Note on Version Conflicts**:
- **grunt**: argos-sdk uses ^1.5.3 while argos-saleslogix uses ^1.4.1. Recommend using ^1.5.3 (newer version) at root.

## Unique Dependencies - argos-sdk

These dependencies are unique to argos-sdk and should remain in `argos-sdk/package.json`:

| Dependency | Version | Purpose |
|------------|---------|---------|
| antlr4 | ^4.8.0 | Parser generator runtime |
| babel-plugin-syntax-dynamic-import | ^6.18.0 | Babel plugin for dynamic imports |
| babel-preset-es2015-without-strict | ^0.0.4 | Babel preset without strict mode |

**Total Unique to argos-sdk**: 3

## Unique Dependencies - argos-saleslogix

These dependencies are unique to argos-saleslogix and should remain in `products/argos-saleslogix/package.json`:

| Dependency | Version | Purpose |
|------------|---------|---------|
| babel-core | ^6.26.3 | Babel compiler core (required by some tools) |
| babel-polyfill | ^6.26.0 | Polyfills for ES2015+ features |
| chai | ^4.3.4 | Assertion library for testing |
| debug | ^4.3.1 | Debugging utility |
| dotenv | ^10.0.0 | Environment variable loader |
| express | ^4.17.1 | Web server framework |
| grunt-contrib-copy | ^1.0.0 | Grunt copy task |
| http-proxy | ^1.18.1 | HTTP proxy middleware |
| jsdoc | ^3.6.7 | Documentation generator |
| less | 3.13.1 | LESS compiler |
| less-loader | 7.3.0 | Webpack LESS loader |
| mocha | ^8.4.0 | Test framework |
| playwright | ^1.11.1 | E2E testing framework |
| serve-index | ^1.9.1 | Directory listing middleware |

**Total Unique to argos-saleslogix**: 14

## Dependency Graph

```
Root (argos-monorepo)
├── devDependencies (16 shared)
│   ├── babel-cli@^6.26.0
│   ├── babel-eslint@^10.1.0
│   ├── babel-plugin-add-module-exports@0.2.1
│   ├── babel-plugin-transform-es2015-modules-amd@^6.24.1
│   ├── babel-plugin-transform-object-rest-spread@^6.26.0
│   ├── babel-preset-es2015@^6.24.1
│   ├── babel-preset-es2016@^6.24.1
│   ├── babel-preset-es2017@^6.24.1
│   ├── eslint@^7.27.0
│   ├── grunt@^1.5.3
│   ├── grunt-argos-deps@git+https://git@github.com/Saleslogix/grunt-argos-deps.git#v0.1.5
│   ├── grunt-contrib-clean@^2.0.0
│   ├── grunt-contrib-connect@^3.0.0
│   ├── grunt-contrib-jasmine@^2.2.0
│   ├── grunt-contrib-less@2.1.0
│   └── grunt-shell@^3.0.1
│
├── argos-sdk/
│   └── devDependencies (3 unique)
│       ├── antlr4@^4.8.0
│       ├── babel-plugin-syntax-dynamic-import@^6.18.0
│       └── babel-preset-es2015-without-strict@^0.0.4
│
└── products/argos-saleslogix/
    ├── dependencies (1 workspace)
    │   └── argos-sdk@workspace:*
    └── devDependencies (14 unique)
        ├── babel-core@^6.26.3
        ├── babel-polyfill@^6.26.0
        ├── chai@^4.3.4
        ├── debug@^4.3.1
        ├── dotenv@^10.0.0
        ├── express@^4.17.1
        ├── grunt-contrib-copy@^1.0.0
        ├── http-proxy@^1.18.1
        ├── jsdoc@^3.6.7
        ├── less@3.13.1
        ├── less-loader@7.3.0
        ├── mocha@^8.4.0
        ├── playwright@^1.11.1
        └── serve-index@^1.9.1
```

## Migration Strategy

### Phase 1: Root Package Configuration
1. Create root `package.json` with workspace configuration
2. Add 16 shared dependencies to root devDependencies
3. Use grunt@^1.5.3 (newer version) to resolve version conflict

### Phase 2: Workspace Package Updates
1. **argos-sdk/package.json**:
   - Remove 16 shared dependencies
   - Keep 3 unique dependencies (antlr4, babel-plugin-syntax-dynamic-import, babel-preset-es2015-without-strict)
   - Maintain all existing scripts

2. **products/argos-saleslogix/package.json**:
   - Remove 16 shared dependencies
   - Keep 14 unique dependencies
   - Add workspace dependency: `"argos-sdk": "workspace:*"`
   - Maintain all existing scripts

### Phase 3: Verification
1. Run `npm install` at root
2. Verify shared dependencies are hoisted to root node_modules
3. Verify unique dependencies remain in workspace node_modules
4. Verify argos-sdk is symlinked in argos-saleslogix/node_modules
5. Test all build and test scripts in both packages

## Dependency Categories Summary

| Category | Count | Location |
|----------|-------|----------|
| Shared (to be hoisted) | 16 | Root devDependencies |
| Unique to argos-sdk | 3 | argos-sdk/devDependencies |
| Unique to argos-saleslogix | 14 | products/argos-saleslogix/devDependencies |
| Workspace dependencies | 1 | products/argos-saleslogix/dependencies |
| **Total** | **34** | - |

## Notes

1. **Version Alignment**: The grunt version conflict (^1.5.3 vs ^1.4.1) will be resolved by using the newer version ^1.5.3 at the root level.

2. **Babel Ecosystem**: Most Babel-related packages are shared, which is expected since both packages use the same transpilation configuration.

3. **Grunt Plugins**: All grunt plugins are shared except grunt-contrib-copy, which is only used by argos-saleslogix.

4. **Testing Tools**: Jasmine (shared) is used by both packages, while Mocha and Playwright (unique) are only used by argos-saleslogix for additional testing needs.

5. **Development Server**: Express and related middleware (http-proxy, serve-index) are unique to argos-saleslogix as it includes a development server.

6. **No Runtime Dependencies**: Neither package currently has runtime dependencies (dependencies field is empty). The only runtime dependency after migration will be argos-saleslogix's workspace dependency on argos-sdk.

## Requirements Validation

This analysis satisfies:
- **Requirement 3.1**: Identified all dependencies used by multiple workspace packages (16 shared dependencies)
- **Requirement 3.2**: Identified all dependencies unique to each package (3 for argos-sdk, 14 for argos-saleslogix)
