#!/usr/bin/env node
/**
 * cordova/hooks/before_prepare/010-set-version.js
 *
 * Cordova `before_prepare` hook that stamps the application version metadata
 * into `cordova/config.xml` immediately before `cordova prepare` runs.
 *
 * Behaviour:
 *   1. Read the application version from `products/argos-saleslogix/package.json`
 *      and the build number from `process.env.BUILD_NUMBER`.
 *   2. Resolve the `version` string and the integer version code via the pure
 *      Node helper `cordova/lib/version.js` (`resolveVersion`,
 *      `resolveVersionCode`).
 *   3. Substitute the `${VERSION}` and `${VERSION_CODE}` placeholders in
 *      `config.xml` with the resolved values and write the result back.
 *
 * Idempotency:
 *   The first time the hook runs, `config.xml` still contains the `${VERSION}`
 *   and `${VERSION_CODE}` placeholders (that is its version-controlled form).
 *   The hook captures this placeholder form once into a sibling
 *   `config.xml.template` file. Every run substitutes against the template
 *   contents (which always retain the placeholders) and writes the result to
 *   `config.xml`. This makes the hook safe to run repeatedly: after the first
 *   run `config.xml` holds concrete values, but the template still holds the
 *   placeholders, so the next run produces the same output rather than
 *   accumulating already-substituted values.
 *
 * This is a CommonJS Node module (NOT AMD), consistent with the other pure-Node
 * helpers under `cordova/lib/`. It works both when invoked by Cordova (which
 * calls `module.exports(context)` and supplies `context.opts.projectRoot`) and
 * when run directly for testing (`node 010-set-version.js`), in which case the
 * Cordova directory is resolved relative to this file's location.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 1.5, 14.1, 14.2, 14.3
 */

'use strict';

var fs = require('fs');
var path = require('path');

var version = require('../../lib/version');

var PLACEHOLDER_VERSION = '${VERSION}';
var PLACEHOLDER_VERSION_CODE = '${VERSION_CODE}';

// The placeholders are substituted only where they appear as quoted XML
// attribute values (e.g. version="${VERSION}"). Targeting the quoted form keeps
// the bare ${VERSION} / ${VERSION_CODE} references in the config.xml comment
// block intact in the generated output.
var ATTR_VERSION = '"' + PLACEHOLDER_VERSION + '"';
var ATTR_VERSION_CODE = '"' + PLACEHOLDER_VERSION_CODE + '"';

/**
 * Resolve the Cordova project directory (the directory that contains
 * `config.xml`). Prefer the Cordova-supplied `context.opts.projectRoot` when
 * available; otherwise resolve relative to this hook file:
 *   __dirname = <cordova>/hooks/before_prepare  ->  <cordova>
 *
 * @param {object} [context] - the Cordova hook context, when invoked by Cordova
 * @returns {string} absolute path to the Cordova project directory
 */
function resolveCordovaDir(context) {
  if (context && context.opts && context.opts.projectRoot) {
    return context.opts.projectRoot;
  }
  return path.resolve(__dirname, '..', '..');
}

/**
 * Replace every literal occurrence of `token` in `source` with `value`.
 * Uses split/join so the `${...}` token characters need no regex escaping.
 *
 * @param {string} source
 * @param {string} token
 * @param {string} value
 * @returns {string}
 */
function replaceAll(source, token, value) {
  return source.split(token).join(value);
}

/**
 * Read the placeholder template form of config.xml. On first run, the template
 * file does not yet exist, so it is seeded from the current `config.xml`
 * contents (which are expected to still contain the placeholders) and that
 * placeholder form is returned.
 *
 * @param {string} configXmlPath - absolute path to config.xml
 * @param {string} templatePath  - absolute path to config.xml.template
 * @param {object} [logger]       - object with an `ok`/`log` style method
 * @returns {string} the template (placeholder) contents
 */
function readOrSeedTemplate(configXmlPath, templatePath, logger) {
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }

  var current = fs.readFileSync(configXmlPath, 'utf8');

  if (current.indexOf(PLACEHOLDER_VERSION) === -1 ||
      current.indexOf(PLACEHOLDER_VERSION_CODE) === -1) {
    logger.warn(
      'config.xml does not contain the expected ' + PLACEHOLDER_VERSION + ' / ' +
      PLACEHOLDER_VERSION_CODE + ' placeholders while seeding ' +
      path.basename(templatePath) + '. The template will capture config.xml ' +
      'as-is; restore the placeholders in config.xml if version stamping ' +
      'stops working.'
    );
  }

  fs.writeFileSync(templatePath, current, 'utf8');
  logger.log('Seeded ' + path.basename(templatePath) + ' from config.xml');
  return current;
}

/**
 * Cordova before_prepare hook entry point.
 *
 * @param {object} [context] - Cordova hook context (optional when run directly)
 * @returns {{ version: string, versionCode: number, configXmlPath: string }}
 */
function setVersion(context) {
  // Cordova exposes its bundled console via context.opts; fall back to the
  // global console when run directly.
  var logger = (context && context.console) || console;

  var cordovaDir = resolveCordovaDir(context);
  var monorepoRoot = path.resolve(cordovaDir, '..');

  var configXmlPath = path.join(cordovaDir, 'config.xml');
  var templatePath = configXmlPath + '.template';
  var pkgJsonPath = path.join(monorepoRoot, 'products', 'argos-saleslogix', 'package.json');

  var pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  var resolvedVersion = version.resolveVersion(pkgJson);
  var resolvedVersionCode = version.resolveVersionCode(process.env);

  var template = readOrSeedTemplate(configXmlPath, templatePath, logger);

  var stamped = replaceAll(template, ATTR_VERSION_CODE, '"' + String(resolvedVersionCode) + '"');
  stamped = replaceAll(stamped, ATTR_VERSION, '"' + resolvedVersion + '"');

  fs.writeFileSync(configXmlPath, stamped, 'utf8');

  logger.log(
    'Set config.xml version="' + resolvedVersion + '" ' +
    'versionCode="' + resolvedVersionCode + '"'
  );

  return {
    version: resolvedVersion,
    versionCode: resolvedVersionCode,
    configXmlPath: configXmlPath,
  };
}

module.exports = setVersion;

// Allow direct execution for local testing: `node 010-set-version.js`.
if (require.main === module) {
  try {
    setVersion();
  } catch (err) {
    console.error('010-set-version.js failed: ' + (err && err.message ? err.message : err));
    process.exit(1);
  }
}
