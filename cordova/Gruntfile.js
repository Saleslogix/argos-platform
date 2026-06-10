'use strict';

/**
 * cordova/Gruntfile.js
 *
 * Cordova-specific Grunt entry point. This file is loaded when `grunt` is
 * invoked with its `cwd` set to `cordova/` (e.g. `cd cordova && grunt cordova`,
 * or via the `cordova:*` npm scripts in `cordova/package.json`).
 *
 * It is intentionally minimal: it loads the `grunt-shell` npm task and then the
 * two local Cordova task files. There is deliberately no Less, Connect, or
 * Jasmine wiring here — those concerns live in `argos-sdk/Gruntfile.js` and the
 * existing root-level `Gruntfile.js`, neither of which this Cordova shell
 * touches. Keeping the Grunt wiring local to `cordova/` means a developer or CI
 * host never needs to modify `products/argos-saleslogix/Gruntfile.js`.
 *
 * This is a CommonJS Node module consumed by Grunt (it is NOT an AMD module).
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 10.5
 *
 * @param {object} grunt - the Grunt instance provided by the CLI
 */
module.exports = function (grunt) {
  // Make the `shell:*` targets available. `grunt-tasks/grunt-shell.js` also
  // calls `grunt.loadNpmTasks('grunt-shell')` internally; loading it here as
  // well is harmless (Grunt task loading is idempotent) and keeps this entry
  // point explicit about the npm task it depends on, per the design.
  grunt.loadNpmTasks('grunt-shell');

  // Wire the Cordova shell's local task configuration and tasks. grunt-shell
  // must load before grunt-cordova so the `shell:*` config exists before the
  // `cordova:*` tasks that delegate to it are registered.
  require('./grunt-tasks/grunt-shell')(grunt);
  require('./grunt-tasks/grunt-cordova')(grunt);
};
