/**
 * cordova/lib/pluginCheck.js
 *
 * Pure-Node helper (CommonJS, NOT AMD) consumed by the Cordova Grunt pipeline
 * and the `before_prepare/020-check-plugins.js` hook.
 *
 * Two responsibilities:
 *
 *   1. `diff(pkgJson, configXml)` cross-references the cordova plugins declared
 *      in `cordova/package.json` against the `<plugin name="...">` declarations
 *      in `cordova/config.xml` and reports any plugin present in only one of the
 *      two files (the symmetric difference). This guards against the two
 *      declaration sites drifting out of sync.
 *
 *   2. `validatePinFormat(pkgJson)` enforces the pinning strategy: every cordova
 *      plugin dependency and platform engine must be pinned to an exact
 *      MAJOR.MINOR.PATCH version with no range operators.
 *
 * The module is intentionally dependency-free: `config.xml` is parsed with a
 * lightweight regex over `<plugin name="...">` rather than a full XML parser.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.11
 */

'use strict';

// Prefix that identifies a cordova plugin dependency in package.json.
var PLUGIN_PREFIX = 'cordova-plugin-';

// Platform engine dependency names that are also subject to the pin-format rule.
var PLATFORM_ENGINES = ['cordova-android', 'cordova-ios'];

// Exact MAJOR.MINOR.PATCH semver, no range operators or pre-release/build suffixes.
var EXACT_SEMVER = /^\d+\.\d+\.\d+$/;

// Characters that are never allowed in a pinned version value.
// Includes range operators, wildcard, whitespace, and the OR separator.
var FORBIDDEN_PIN_CHARS = ['^', '~', '>', '<', '=', '*', ' ', '|'];

/**
 * Extract the set of cordova plugin names declared in package.json `dependencies`.
 *
 * @param {object} pkgJson - parsed cordova/package.json
 * @returns {string[]} sorted, de-duplicated plugin names
 */
function pluginsFromPackageJson(pkgJson) {
  var deps = (pkgJson && pkgJson.dependencies) || {};
  var names = Object.keys(deps).filter(function (name) {
    return name.indexOf(PLUGIN_PREFIX) === 0;
  });
  return uniqueSorted(names);
}

/**
 * Extract the set of plugin names declared via `<plugin name="...">` in config.xml.
 * Uses a lightweight regex rather than a full XML parser; tolerant of single or
 * double quotes and of extra attributes/whitespace on the element.
 *
 * @param {string} configXml - raw contents of cordova/config.xml
 * @returns {string[]} sorted, de-duplicated plugin names
 */
function pluginsFromConfigXml(configXml) {
  var names = [];
  if (typeof configXml === 'string' && configXml.length > 0) {
    var re = /<plugin\b[^>]*?\bname\s*=\s*(["'])([^"']+)\1/gi;
    var match;
    while ((match = re.exec(configXml)) !== null) {
      names.push(match[2]);
    }
  }
  return uniqueSorted(names);
}

/**
 * Compare the cordova plugin set declared in package.json against the plugin set
 * declared in config.xml and report every plugin present in only one file.
 *
 * Each missing entry's `file` field names the file in which the plugin is ABSENT:
 *   - declared in package.json only  -> { plugin, file: 'config.xml' }
 *   - declared in config.xml only    -> { plugin, file: 'package.json' }
 *
 * @param {object} pkgJson - parsed cordova/package.json
 * @param {string} configXml - raw contents of cordova/config.xml
 * @returns {{ ok: boolean, missing: Array<{ plugin: string, file: 'package.json'|'config.xml' }> }}
 */
function diff(pkgJson, configXml) {
  var pkgPlugins = pluginsFromPackageJson(pkgJson);
  var xmlPlugins = pluginsFromConfigXml(configXml);

  var xmlSet = toSet(xmlPlugins);
  var pkgSet = toSet(pkgPlugins);

  var missing = [];

  // Declared in package.json but absent from config.xml.
  pkgPlugins.forEach(function (plugin) {
    if (!xmlSet[plugin]) {
      missing.push({ plugin: plugin, file: 'config.xml' });
    }
  });

  // Declared in config.xml but absent from package.json.
  xmlPlugins.forEach(function (plugin) {
    if (!pkgSet[plugin]) {
      missing.push({ plugin: plugin, file: 'package.json' });
    }
  });

  return { ok: missing.length === 0, missing: missing };
}

/**
 * Returns true when `value` is a valid exact pin: it matches the
 * MAJOR.MINOR.PATCH semver regex and contains none of the forbidden characters.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isValidPin(value) {
  if (typeof value !== 'string') {
    return false;
  }
  var hasForbiddenChar = FORBIDDEN_PIN_CHARS.some(function (ch) {
    return value.indexOf(ch) !== -1;
  });
  if (hasForbiddenChar) {
    return false;
  }
  return EXACT_SEMVER.test(value);
}

/**
 * Validate that every cordova plugin dependency and platform engine in pkgJson
 * is pinned to an exact MAJOR.MINOR.PATCH version. An offender is any entry whose
 * value contains one of `^ ~ > < = * (space) |` OR fails `^\d+\.\d+\.\d+$`.
 *
 * @param {object} pkgJson - parsed cordova/package.json
 * @returns {{ ok: boolean, offenders: Array<{ name: string, value: * }> }}
 */
function validatePinFormat(pkgJson) {
  var offenders = [];
  var seen = {};

  function check(name, value) {
    if (seen[name]) {
      return;
    }
    seen[name] = true;
    if (!isValidPin(value)) {
      offenders.push({ name: name, value: value });
    }
  }

  var dependencies = (pkgJson && pkgJson.dependencies) || {};
  var devDependencies = (pkgJson && pkgJson.devDependencies) || {};

  // 1. Every cordova plugin dependency.
  Object.keys(dependencies)
    .filter(function (name) {
      return name.indexOf(PLUGIN_PREFIX) === 0;
    })
    .sort()
    .forEach(function (name) {
      check(name, dependencies[name]);
    });

  // 2. Platform engines, wherever they are declared (dependencies or devDependencies).
  PLATFORM_ENGINES.forEach(function (name) {
    if (Object.prototype.hasOwnProperty.call(dependencies, name)) {
      check(name, dependencies[name]);
    } else if (Object.prototype.hasOwnProperty.call(devDependencies, name)) {
      check(name, devDependencies[name]);
    }
  });

  return { ok: offenders.length === 0, offenders: offenders };
}

/**
 * De-duplicate and sort a list of strings.
 * @param {string[]} list
 * @returns {string[]}
 */
function uniqueSorted(list) {
  var set = toSet(list);
  return Object.keys(set).sort();
}

/**
 * Build a presence map from a list of strings.
 * @param {string[]} list
 * @returns {Object<string, boolean>}
 */
function toSet(list) {
  var set = {};
  (list || []).forEach(function (item) {
    set[item] = true;
  });
  return set;
}

module.exports = {
  diff: diff,
  validatePinFormat: validatePinFormat,
  // Exported for unit/property tests and hook reuse.
  pluginsFromPackageJson: pluginsFromPackageJson,
  pluginsFromConfigXml: pluginsFromConfigXml,
  isValidPin: isValidPin,
  PLUGIN_PREFIX: PLUGIN_PREFIX,
  PLATFORM_ENGINES: PLATFORM_ENGINES,
  EXACT_SEMVER: EXACT_SEMVER,
  FORBIDDEN_PIN_CHARS: FORBIDDEN_PIN_CHARS,
};
