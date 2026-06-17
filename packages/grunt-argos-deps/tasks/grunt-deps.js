/* eslint-disable */
module.exports = function gruntDeps(grunt) {
  var Graph = require('graphs');
  var espree = require('espree');
  var path = require('path');

  grunt.registerTask('argos-deps', function() {
    var config = grunt.config.get('argos-deps');
    if (config.cwd) {
      grunt.file.setBase(config.cwd);
    }

    var files = grunt.file.expand(config.files);
    var graph = new Graph();
    var nodes = {};

    // Resolves a module id into a relative file path.
    function resolvePath(module, sourceFile) {
      var config = grunt.config.get('argos-deps');
      // Relative modules start with a period
      if (module[0] === '.') {
        var sourceDir = path.dirname(sourceFile);
        return path.join(sourceDir, module) + '.js';
      } else {
        var parts = module.split('/');
        var moduleName = parts.shift();
        var moduleConfig = config.modules.filter(function(m) {
          return m.name === moduleName;
        })[0];
        if (moduleConfig && moduleConfig.location) {
          var relativeModule = parts.join(path.sep);
          return path.join(moduleConfig.location, relativeModule) + '.js';
        }
      }
    }

    // Add nodes to the graph where f is the file path.
    function add(f) {
      if (nodes[f] || f === null || typeof f === 'undefined') {
        return nodes[f];
      }

      nodes[f] = {
        name: f
      };

      graph.add(nodes[f]);
      return nodes[f];
    }

    // Extract the module dependencies declared in a source file.
    // Supports both AMD (define('id', ['dep', ...], factory)) and ES6
    // (import ... from 'dep') module syntax. The source files were migrated
    // from ES6 imports to AMD define(), so the dependency list now lives in
    // the array literal passed to define()/require().
    function getDependencies(tree) {
      var deps = [];

      function collectFromArguments(args) {
        args.forEach(function(arg) {
          if (arg && arg.type === 'ArrayExpression') {
            arg.elements.forEach(function(el) {
              if (el && el.type === 'Literal' && typeof el.value === 'string') {
                deps.push(el.value);
              }
            });
          }
        });
      }

      tree.body.forEach(function(node) {
        // ES6: import ... from 'module'
        if (node.type === 'ImportDeclaration' && node.source && typeof node.source.value === 'string') {
          deps.push(node.source.value);
          return;
        }

        // AMD: define([...], factory) / define('id', [...], factory)
        //      require([...], callback)
        if (node.type === 'ExpressionStatement' &&
          node.expression &&
          node.expression.type === 'CallExpression' &&
          node.expression.callee &&
          node.expression.callee.type === 'Identifier' &&
          (node.expression.callee.name === 'define' || node.expression.callee.name === 'require')) {
          collectFromArguments(node.expression.arguments);
        }
      });

      return deps;
    }

    // Khan topological sort (https://en.wikipedia.org/wiki/Topological_sorting#Algorithms)
    function sortGraph(graph) {
      var set = [];
      var sorted = [];
      // start nodes which have no incoming edges
      graph.forEach(function(node) {
        if (graph.to(node)
          .size === 0) {
          set.push(node);
        }
      });

      while (set.length > 0) {
        var n = set.shift();
        sorted.push(n);

        var incoming = graph.from(n);
        incoming.forEach(function(m) {
          graph.unlink(n, m);
          if (graph.to(m)
            .size === 0) {
            set.push(m);
          }
        });
      }

      // Ensure the graph has no more links
      graph.forEach(function(node) {
        if (graph.from(node)
          .size > 0 || graph.to(node)
          .size > 0) {
          throw new Error('Circular dependencies detected.');
        }
      });

      return sorted;
    }

    // First pass: register every source file as a node so dependency links
    // only ever reference real files (external libs such as dojo/dijit and
    // cross-bundle modules are intentionally skipped).
    files.forEach(function(file) {
      var sourceDir = path.dirname(file);
      var base = path.basename(file);
      var filepath = path.join(sourceDir, base); // grunt is not using correct seperator on windows
      add(filepath);
    });

    // Second pass:
    // - parse each file with espree to get its dependency list (AMD or ES6)
    // - resolve the dependencies to a filename
    // - link dependency -> file so the dependency sorts before the file.
    files.forEach(function(file) {
      var sourceDir = path.dirname(file);
      var base = path.basename(file);
      var filepath = path.join(sourceDir, base); // grunt is not using correct seperator on windows
      var fileNode = nodes[filepath];
      var contents = grunt.file.read(filepath, {
        encoding: 'utf8'
      });
      try {
        var tree = espree.parse(contents, {
          ecmaVersion: 'latest',
          sourceType: 'module'
        });

        getDependencies(tree).forEach(function(module) {
          var p = resolvePath(module, filepath);
          // Only link to dependencies that are part of this bundle's source
          // files. Unresolved/external modules (dojo, dijit, other bundles)
          // are skipped so they do not get emitted as bogus includes.
          var depNode = (p && nodes[p]) ? nodes[p] : null;
          if (depNode && depNode !== fileNode) {
            graph.link(depNode, fileNode);
          }
        });
      } catch (error) {
        grunt.log.writeln('Error in ' + file + ': ' + error);
      }
    });

    // Sort the graph and transform the data so it is template friendly
    var sorted = sortGraph(graph)
      .map(function(node) {
        return {
          folderName: path.dirname(node.name)
            .replace(/\\/gi, '/') // force unix path seperator
            .replace(/\/src/gi, '/src'), // keep src as-is since we no longer transpile
          fileName: path.basename(node.name)
        };
      });

    // Template processing
    var template = grunt.file.read(config.template, {
      encoding: 'utf8'
    });
    var content = grunt.template.process(template, {
      data: {
        files: sorted
      }
    });
    grunt.file.write(config.output, content, {
      encoding: 'utf8'
    });
  });
};
