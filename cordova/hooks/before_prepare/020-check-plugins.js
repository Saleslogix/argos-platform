#!/usr/bin/env node
/**
 * cordova/hooks/before_prepare/020-check-plugins.js
 *
 * Cordova `before_prepare` hook (CommonJS Node module, NOT AMD) that guards the
 * build against the two plugin declaration sites drifting out of sync and
 * against non-exact version pins.
 *
 * It cross-checks `cordova/package.json` against `cordova/config.xml` using the
 * pure-Node helper `cordova/lib/pluginCheck.js`:
 *
 *   1. `diff(pkgJson, configXml)` reports every plugin declared in only one of
 *      the two files. When `diff.ok === false` the hook prints each missing
 *      plugin and the file it is missing from, then exits non-zero.
 *
 *   2. `validatePinFormat(pkgJson)` reports every dependency / engine whose
 *      version is not an exact MAJOR.MINOR.PATCH pin. When
 *      `validatePinFormat.ok === false` the hook prints every offender, then
 *      exits non-zero.
 *
 * The hook works both when invoked by Cordova (which calls the exported
 * function with a `context` argument) and when run directly for testing
 * (`node cordova/hooks/before_prepare/020-check-plugins.js`). Paths are resolved
 * relative to this file with `__dirname` + `path.resolve` so the hook is
 * portable regardless of the directory Cordova is invoked from.
 *
 * Requirements: 5.8, 5.11
 */

'use strict';

var fs = require('fs');
var path = require('path');

var pluginCheck = require(path.resolve(__dirname, '..', '..', 'lib', 'pluginCheck.js'));

// cordova/hooks/before_prepare/ -> cordova/
var CORDOVA_DIR = path.resolve(__dirname, '..', '..');
var PACKAGE_JSON_PATH = path.join(CORDOVA_DIR, 'package.json');
var CONFIG_XML_PATH = path.join(CORDOVA_DIR, 'config.xml');

/**
 * Read and parse cordova/package.json.
 * @returns {object} parsed package.json
 */
function readPackageJson() {
  var raw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

/**
 * Read cordova/config.xml as a raw string (the helper's `diff` expects the
 * config xml contents as a string and parses it with a lightweight regex).
 * @returns {string} contents of config.xml
 */
function readConfigXml() {
  return fs.readFileSync(CONFIG_XML_PATH, 'utf8');
}

/**
 * Run both checks and exit non-zero with a descriptive message on the first
 * failure. Returns normally only when every check passes.
 */
function checkPlugins() {
  var pkgJson = readPackageJson();
  var configXml = readConfigXml();

  // 1. Cross-check the plugin declaration sites.
  var diffResult = pluginCheck.diff(pkgJson, configXml);
  if (diffResult.ok === false) {
    console.error('Cordova plugin declarations are out of sync between package.json and config.xml:');
    diffResult.missing.forEach(function (entry) {
      console.error('  - plugin "' + entry.plugin + '" is missing from ' + entry.file);
    });
    console.error(
      'Every plugin must be declared in BOTH cordova/package.json and cordova/config.xml with matching names.'
    );
    process.exit(1);
    return;
  }

  // 2. Enforce the exact MAJOR.MINOR.PATCH pinning strategy.
  var pinResult = pluginCheck.validatePinFormat(pkgJson);
  if (pinResult.ok === false) {
    console.error('Cordova dependencies must be pinned to an exact MAJOR.MINOR.PATCH version (no range operators):');
    pinResult.offenders.forEach(function (offender) {
      console.error('  - "' + offender.name + '" is pinned to "' + offender.value + '"');
    });
    console.error('Replace each version with an exact pin such as "1.2.3".');
    process.exit(1);
    return;
  }
}

/**
 * Cordova invokes module-style hooks with a `context` argument. We ignore the
 * context here because every input is resolved from disk relative to this file.
 *
 * @param {object} [context] - Cordova hook context (unused)
 */
function run(context) { // eslint-disable-line no-unused-vars
  checkPlugins();
}

module.exports = run;
module.exports.checkPlugins = checkPlugins;

// Allow direct execution for testing: `node 020-check-plugins.js`.
if (require.main === module) {
  checkPlugins();
}
