# Design Document: Babel Removal and AMD Conversion

## Overview

This design outlines the approach for removing Babel from the argos-sdk and argos-saleslogix projects and converting all ES6+ source files to native AMD syntax. The migration will eliminate the build transpilation step while preserving modern JavaScript features that are supported by current browsers.

The key insight is that modern browsers support most ES6+ features natively, so we only need to convert the module system (imports/exports) to AMD format. Features like classes, arrow functions, const/let, template literals, destructuring, and spread operators can remain unchanged.

## Architecture

### Current Architecture

```
Source Files (ES6+)
    ↓
Babel Transpiler
    ↓
AMD Modules (ES5) in src-out/
    ↓
Browser
```

### Target Architecture

```
Source Files (AMD + Modern JS)
    ↓
Browser (direct loading)
```

### Module ID Convention

Module IDs follow a strict naming convention based on file paths:

- **argos-sdk files**: `argos/` prefix
  - `argos-sdk/src/Application.js` → `define('argos/Application', ...)`
  - `argos-sdk/src/Fields/TextField.js` → `define('argos/Fields/TextField', ...)`

- **argos-saleslogix files**: `crm/` prefix
  - `products/argos-saleslogix/src/Application.js` → `define('crm/Application', ...)`
  - `products/argos-saleslogix/src/Views/Account/List.js` → `define('crm/Views/Account/List', ...)`

## Components and Interfaces

### 1. AST Parser (Esprima)

**Purpose**: Parse JavaScript source code into an Abstract Syntax Tree (AST)

**Library**: [Esprima](https://esprima.org/) - ECMAScript parsing infrastructure for multipurpose analysis

**Why Esprima**:
- Battle-tested, widely used parser
- Full ES6+ support
- Generates standard ESTree-compliant AST
- Preserves comments and location information
- Well-documented and maintained

**Installation**:
```bash
npm install esprima --save-dev
```

**Usage**:
```javascript
const esprima = require('esprima');

const ast = esprima.parseModule(sourceCode, {
  loc: true,        // Include line/column location info
  range: true,      // Include index-based range
  comment: true,    // Preserve comments
  tokens: true      // Include token information
});
```

### 2. Module Converter

**Purpose**: Converts ES6 module syntax to AMD syntax using AST analysis

**Interface**:
```javascript
class ModuleConverter {
  constructor() {
    this.parser = esprima;
  }
  
  convertFile(filePath, content) {
    // Parse source to AST
    // Extract imports and exports from AST
    // Generate AMD syntax
    // Returns converted content with AMD syntax
  }
  
  parseToAST(content) {
    // Returns Esprima AST
  }
  
  extractImportsFromAST(ast) {
    // Returns array of import declarations
  }
  
  extractExportsFromAST(ast) {
    // Returns export information
  }
  
  extractModuleBody(ast) {
    // Returns code between imports and exports
  }
  
  generateModuleId(filePath) {
    // Returns module ID based on file path
  }
  
  buildDefineStatement(moduleId, dependencies, factoryParams, body, returnStatement) {
    // Returns complete define() statement
  }
}
```

**Key Responsibilities**:
- Parse ES6 source code to AST using Esprima
- Traverse AST to find import/export nodes
- Extract module body (non-import/export code)
- Generate AMD dependency arrays
- Create factory function parameters
- Build complete define() statements
- Preserve code formatting and comments

### 3. AST Traversal Utilities

**Purpose**: Helper functions for traversing and analyzing the AST

**Interface**:
```javascript
class ASTTraverser {
  findNodes(ast, nodeType) {
    // Returns all nodes of specified type
  }
  
  getImportDeclarations(ast) {
    // Returns all ImportDeclaration nodes
  }
  
  getExportDeclarations(ast) {
    // Returns all ExportDeclaration nodes
  }
  
  getModuleBodyNodes(ast) {
    // Returns nodes that are not imports or exports
  }
  
  extractSourceCode(node, originalSource) {
    // Extracts source code for a specific AST node
  }
}
```

### 4. Import Statement Converter

**Purpose**: Converts ES6 imports to AMD dependencies using AST nodes

**Conversion Rules**:

```javascript
// ES6 Default Import
import View from './View';

// AST Node (ImportDeclaration):
{
  type: 'ImportDeclaration',
  specifiers: [{
    type: 'ImportDefaultSpecifier',
    local: { name: 'View' }
  }],
  source: { value: './View' }
}

// AMD Equivalent
define('argos/Application', [
  './View'
], function(View) {
  // ...
});

// ES6 Named Imports
import { setConnectionState } from './actions/connection';

// AST Node (ImportDeclaration):
{
  type: 'ImportDeclaration',
  specifiers: [{
    type: 'ImportSpecifier',
    imported: { name: 'setConnectionState' },
    local: { name: 'setConnectionState' }
  }],
  source: { value: './actions/connection' }
}

// AMD Equivalent
define('argos/Application', [
  './actions/connection'
], function(connectionActions) {
  const { setConnectionState } = connectionActions;
  // ...
});

// ES6 Mixed Imports
import View from './View';
import getResource from './I18n';
import { setConnectionState } from './actions/connection';

// AMD Equivalent
define('argos/Application', [
  './View',
  './I18n',
  './actions/connection'
], function(View, getResource, connectionActions) {
  const { setConnectionState } = connectionActions;
  // ...
});
```

**Implementation**:
```javascript
class ImportConverter {
  convertImportNode(importNode) {
    const source = importNode.source.value;
    const specifiers = importNode.specifiers;
    
    // Check if default import
    const hasDefault = specifiers.some(s => s.type === 'ImportDefaultSpecifier');
    
    // Check if named imports
    const namedImports = specifiers.filter(s => s.type === 'ImportSpecifier');
    
    return {
      dependency: source,
      factoryParam: hasDefault ? specifiers[0].local.name : this.generateParamName(source),
      destructuring: namedImports.length > 0 ? namedImports.map(s => s.local.name) : null
    };
  }
  
  generateParamName(source) {
    // Generate parameter name from module path
    // './actions/connection' -> 'connectionActions'
  }
}
```

### 5. Export Statement Converter

**Purpose**: Converts ES6 exports to AMD returns using AST nodes

**Conversion Rules**:

```javascript
// ES6 Default Export (Class)
export default class Application {
  // ...
}

// AST Node (ExportDefaultDeclaration):
{
  type: 'ExportDefaultDeclaration',
  declaration: {
    type: 'ClassDeclaration',
    id: { name: 'Application' },
    // ... class body
  }
}

// AMD Equivalent
define('argos/Application', [...], function(...) {
  class Application {
    // ...
  }
  return Application;
});

// ES6 Default Export (Function)
function utility() {
  // ...
}
export default utility;

// AST Nodes:
// 1. FunctionDeclaration
// 2. ExportDefaultDeclaration with Identifier

// AMD Equivalent
define('argos/Utility', [...], function(...) {
  function utility() {
    // ...
  }
  return utility;
});

// ES6 Named Exports
export const FOO = 'bar';
export function helper() {}

// AST Nodes (ExportNamedDeclaration):
{
  type: 'ExportNamedDeclaration',
  declaration: {
    type: 'VariableDeclaration' | 'FunctionDeclaration',
    // ...
  }
}

// AMD Equivalent
define('argos/Module', [...], function(...) {
  const FOO = 'bar';
  function helper() {}
  
  return {
    FOO,
    helper
  };
});
```

**Implementation**:
```javascript
class ExportConverter {
  convertExportNode(exportNode, sourceCode) {
    if (exportNode.type === 'ExportDefaultDeclaration') {
      return this.handleDefaultExport(exportNode, sourceCode);
    } else if (exportNode.type === 'ExportNamedDeclaration') {
      return this.handleNamedExport(exportNode, sourceCode);
    }
  }
  
  handleDefaultExport(node, sourceCode) {
    // Extract the declaration
    const declaration = node.declaration;
    
    if (declaration.type === 'ClassDeclaration' || 
        declaration.type === 'FunctionDeclaration') {
      return {
        type: 'default',
        name: declaration.id.name,
        code: this.extractCode(declaration, sourceCode)
      };
    } else if (declaration.type === 'Identifier') {
      return {
        type: 'default',
        name: declaration.name,
        code: null // Already declared elsewhere
      };
    }
  }
  
  handleNamedExport(node, sourceCode) {
    // Extract named exports
    const declaration = node.declaration;
    const names = this.extractExportNames(declaration);
    
    return {
      type: 'named',
      names: names,
      code: this.extractCode(declaration, sourceCode)
    };
  }
  
  extractCode(node, sourceCode) {
    // Use node.range to extract source code
    return sourceCode.substring(node.range[0], node.range[1]);
  }
}
```

### 6. Code Generator

**Purpose**: Generates the final AMD module code

**Interface**:
```javascript
class CodeGenerator {
  generateAMDModule(moduleInfo) {
    // Generates complete AMD define() statement
  }
  
  formatDefineStatement(moduleId, dependencies, factoryParams, body, returnStatement) {
    // Formats the define() call with proper indentation
  }
  
  generateDestructuring(namedImports) {
    // Generates const { a, b } = module; statements
  }
  
  generateReturnStatement(exportInfo) {
    // Generates return statement based on export type
  }
}
```

### 7. Dependency Path Resolver

**Purpose**: Resolves and normalizes module paths

**Interface**:
```javascript
class PathResolver {
  resolveRelativePath(fromPath, toPath) {
    // Resolves relative imports
  }
  
  normalizeModulePath(path) {
    // Normalizes module paths
  }
  
  isExternalDependency(path) {
    // Checks if dependency is external (dojo, dijit, etc.)
  }
}
```

**Path Resolution Rules**:
- Relative paths (`./`, `../`) are preserved
- External dependencies (dojo, dijit) are preserved as-is
- Internal module references use module IDs

### 8. Build Script Updater

**Purpose**: Updates build configuration and scripts

**Tasks**:
- Remove Babel commands from package.json scripts
- Update Grunt tasks to reference src/ instead of src-out/
- Remove .babelrc files
- Update any configuration files that reference transpiled output

### 9. File System Manager

**Purpose**: Manages file operations during migration

**Interface**:
```javascript
class FileSystemManager {
  readSourceFile(path) {
    // Reads source file
  }
  
  writeConvertedFile(path, content) {
    // Writes converted file
  }
  
  deleteDirectory(path) {
    // Removes src-out directories
  }
  
  updateReferences(oldPath, newPath) {
    // Updates path references in config files
  }
}
```

## Data Models

### Esprima AST Node Types

Esprima generates ESTree-compliant AST nodes. Key node types for this conversion:

**ImportDeclaration Node**:
```javascript
{
  type: 'ImportDeclaration',
  specifiers: [
    {
      type: 'ImportDefaultSpecifier' | 'ImportSpecifier' | 'ImportNamespaceSpecifier',
      local: { type: 'Identifier', name: string },
      imported: { type: 'Identifier', name: string } // Only for ImportSpecifier
    }
  ],
  source: {
    type: 'Literal',
    value: string  // Module path
  },
  range: [number, number],  // Start and end positions in source
  loc: { start: {...}, end: {...} }
}
```

**ExportDefaultDeclaration Node**:
```javascript
{
  type: 'ExportDefaultDeclaration',
  declaration: {
    type: 'ClassDeclaration' | 'FunctionDeclaration' | 'Identifier' | ...,
    id: { type: 'Identifier', name: string },
    // ... declaration-specific properties
  },
  range: [number, number],
  loc: { start: {...}, end: {...} }
}
```

**ExportNamedDeclaration Node**:
```javascript
{
  type: 'ExportNamedDeclaration',
  declaration: {
    type: 'VariableDeclaration' | 'FunctionDeclaration' | 'ClassDeclaration',
    // ... declaration-specific properties
  },
  specifiers: [...],  // For re-exports
  source: null | { type: 'Literal', value: string },
  range: [number, number],
  loc: { start: {...}, end: {...} }
}
```

### Conversion Data Models

### Import Statement Model

```javascript
{
  type: 'default' | 'named' | 'namespace',
  source: string,           // Module path from AST node.source.value
  specifiers: [
    {
      imported: string,     // Original name from AST
      local: string         // Local binding name from AST
    }
  ],
  astNode: Object          // Original Esprima AST node for reference
}
```

### Export Statement Model

```javascript
{
  type: 'default' | 'named',
  declaration: {
    type: 'class' | 'function' | 'variable',
    name: string,
    value: string           // Code content extracted using node.range
  },
  astNode: Object          // Original Esprima AST node for reference
}
```

### Module Definition Model

```javascript
{
  moduleId: string,
  dependencies: string[],
  factoryParams: string[],
  body: string,
  destructuring: [
    {
      param: string,
      properties: string[]
    }
  ],
  returnStatement: string,
  sourceAST: Object        // Complete Esprima AST for reference
}
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following redundancies:

- **Properties 1.1 and 1.4**: Both test that Babel packages are removed from package.json. Property 1.4 is more specific but tests the same thing. These can be combined into one comprehensive property.
- **Properties 3.1 and 3.3**: Property 3.3 (class export) is a specific case of 3.1 (default export). Property 3.1 already covers all default exports including classes.
- **Properties 4.1, 4.2, and 4.5**: Properties 4.1 and 4.2 are specific cases of 4.5. Property 4.5 is the general rule that encompasses both.
- **Properties 5.1-5.8**: These can be combined into a single comprehensive property about preserving modern JavaScript features.
- **Properties 6.1 and 6.2**: Both test that package.json scripts are updated. These can be combined.
- **Properties 7.2, 7.3, and 7.4**: Property 7.4 is the general case that encompasses 7.2 and 7.3.
- **Property 8.2**: This is redundant with properties 2.x about import conversion.
- **Properties 9.1, 9.2, and 9.3**: These can be combined into a single property about documentation updates.

### Correctness Properties

Property 1: Babel Dependency Removal
*For any* package.json file in the project, after migration, it should not contain any Babel-related packages (babel-cli, babel-preset-*, babel-plugin-*) in dependencies or devDependencies
**Validates: Requirements 1.1, 1.4**

Property 2: Babel Configuration Removal
*For any* .babelrc file in the project, after migration, the file should not exist
**Validates: Requirements 1.2**

Property 3: Build Script Update
*For any* package.json script that previously referenced Babel commands, after migration, it should not contain babel-related commands
**Validates: Requirements 1.3, 6.1, 6.2**

Property 4: Default Import Conversion
*For any* ES6 file containing a default import statement `import X from 'Y'`, the converted AMD file should have 'Y' in the dependency array and X as a factory parameter
**Validates: Requirements 2.1**

Property 5: Named Import Conversion
*For any* ES6 file containing named imports `import { A, B } from 'Y'`, the converted AMD file should have 'Y' in the dependency array and destructuring of A and B in the factory function body
**Validates: Requirements 2.2**

Property 6: Multiple Import Consolidation
*For any* ES6 file containing multiple import statements, the converted AMD file should have all imported modules in a single dependency array
**Validates: Requirements 2.3**

Property 7: Relative Path Preservation
*For any* import statement using a relative path (starting with './' or '../'), the converted AMD dependency should preserve the exact relative path
**Validates: Requirements 2.4**

Property 8: Import Order Preservation
*For any* ES6 file with multiple imports in a specific order, the converted AMD file should maintain the same order in the dependency array
**Validates: Requirements 2.5**

Property 9: Default Export Conversion
*For any* ES6 file containing `export default X`, the converted AMD file should have `return X` as the last statement in the factory function
**Validates: Requirements 3.1, 3.3**

Property 10: Named Export Conversion
*For any* ES6 file containing named exports, the converted AMD file should return an object with properties matching the exported names
**Validates: Requirements 3.2**

Property 11: Single Return Statement
*For any* converted AMD file, it should contain exactly one return statement in the factory function
**Validates: Requirements 3.4**

Property 12: Module ID Generation
*For any* source file, the generated module ID should be derived from its path relative to src/, with "argos/" prefix for argos-sdk files and "crm/" prefix for argos-saleslogix files
**Validates: Requirements 4.1, 4.2, 4.5**

Property 13: Modern JavaScript Preservation
*For any* ES6 file containing modern JavaScript features (const, let, arrow functions, template literals, classes, destructuring, spread operators, async/await, object shorthand), the converted AMD file should preserve all these features unchanged
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

Property 14: Grunt Configuration Update
*For any* Grunt configuration file, after migration, it should reference src/ instead of src-out/
**Validates: Requirements 6.3**

Property 15: src-out Directory Removal
*For any* package (argos-sdk or argos-saleslogix), after migration, the src-out/ directory should not exist
**Validates: Requirements 7.1**

Property 16: Path Reference Update
*For any* configuration or HTML file, after migration, it should reference src/ instead of src-out/
**Validates: Requirements 7.2, 7.3, 7.4**

Property 17: Test Configuration Update
*For any* test configuration file, after migration, it should use correct AMD module paths
**Validates: Requirements 8.3**

Property 18: Documentation Update
*For any* documentation file (README, guides, etc.), after migration, it should not reference Babel and should use AMD syntax in code examples
**Validates: Requirements 9.1, 9.2, 9.3**

## Error Handling

### Conversion Errors

**Unsupported Import Patterns**:
- If a file uses dynamic imports (`import()`), log a warning and skip conversion
- If a file uses import.meta, log a warning and require manual conversion
- If a file uses export * from, convert to require and re-export pattern

**Circular Dependencies**:
- Detect circular dependencies during conversion
- Log warnings for circular dependencies
- Rely on AMD's built-in circular dependency handling

**Missing Dependencies**:
- If an imported module doesn't exist, log an error
- Continue conversion but mark the file for review
- Generate a report of missing dependencies

### File System Errors

**Permission Errors**:
- If a file cannot be read or written, log the error
- Skip the file and continue with others
- Generate a report of failed conversions

**Path Resolution Errors**:
- If a relative path cannot be resolved, log an error
- Use the original path and mark for manual review

### Build Configuration Errors

**Unknown Configuration Format**:
- If a configuration file format is not recognized, log a warning
- Skip automatic updates and mark for manual review

**Conflicting References**:
- If both src/ and src-out/ references exist, log a warning
- Update all references to src/

## Testing Strategy

### Dual Testing Approach

This migration requires both unit tests and property-based tests to ensure correctness:

**Unit Tests** focus on:
- Specific conversion examples (e.g., converting a known ES6 file to AMD)
- Edge cases (empty files, files with only imports, files with only exports)
- Error conditions (malformed imports, circular dependencies)
- Integration points (file system operations, configuration updates)

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Conversion correctness across many generated test cases

### Property-Based Testing Configuration

- **Library**: fast-check (already in project dependencies)
- **Iterations**: Minimum 100 iterations per property test
- **Test Tagging**: Each property test must reference its design document property

Tag format: `// Feature: babel-removal, Property {number}: {property_text}`

Example:
```javascript
// Feature: babel-removal, Property 4: Default Import Conversion
fc.assert(
  fc.property(
    fc.record({
      moduleName: fc.string(),
      importPath: fc.string()
    }),
    ({ moduleName, importPath }) => {
      const input = `import ${moduleName} from '${importPath}';`;
      const output = convertToAMD(input);
      return output.includes(importPath) && output.includes(moduleName);
    }
  ),
  { numRuns: 100 }
);
```

### Test Coverage Requirements

**Conversion Tests**:
- Test all import patterns (default, named, mixed)
- Test all export patterns (default, named)
- Test module ID generation for various file paths
- Test preservation of modern JavaScript features

**Integration Tests**:
- Test complete file conversion (imports + body + exports)
- Test batch conversion of multiple files
- Test build script updates
- Test configuration file updates

**Regression Tests**:
- Test that existing functionality still works
- Test that all modules load correctly
- Test that the application starts successfully

### Manual Testing Checklist

After automated tests pass:
1. Build both argos-sdk and argos-saleslogix
2. Start the development server
3. Navigate through key application views
4. Verify no console errors
5. Test offline functionality (if enabled)
6. Verify all tests pass (Jasmine, Mocha, Playwright)

## Implementation Notes

### Conversion Order

1. **Phase 1**: Convert argos-sdk files (core framework)
2. **Phase 2**: Convert argos-saleslogix files (depends on SDK)
3. **Phase 3**: Update build scripts and configuration
4. **Phase 4**: Remove src-out directories and Babel dependencies
5. **Phase 5**: Update documentation

### Special Cases

**Dojo Toolkit Integration**:
- Dojo modules use AMD natively
- Preserve existing Dojo imports as-is
- Don't convert dojo/_base/declare, dijit/_WidgetBase, etc.

**Third-Party Libraries**:
- Libraries in libraries/ directory are already AMD
- Don't convert third-party code
- Only convert application source files

**Test Files**:
- Convert test files using the same rules
- Update test configuration to load AMD modules
- Ensure test runners can handle AMD format

### Performance Considerations

**Conversion Speed**:
- Process files in parallel where possible
- Cache parsed AST for files that need multiple passes
- Use streaming for large files

**Runtime Performance**:
- AMD loading should be as fast as transpiled code
- No performance degradation expected
- Modern browsers handle AMD efficiently

### Rollback Strategy

If issues are discovered after migration:
1. Revert to previous commit (before migration)
2. Identify specific problematic files
3. Fix conversion logic
4. Re-run migration on affected files
5. Test thoroughly before committing

### Migration Validation

After migration, validate:
- All files have valid AMD syntax
- All module IDs are correct
- All dependencies are resolvable
- No Babel references remain
- All tests pass
- Application runs without errors
