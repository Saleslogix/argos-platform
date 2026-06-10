'use strict';

/**
 * Version Resolver
 *
 * Resolves the Cordova `version`, Android `android-versionCode`, and iOS
 * `ios-CFBundleVersion` values used at build time. This is a pure Node
 * (CommonJS) helper consumed by the Cordova Grunt tasks and hooks; it is not
 * an AMD module.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 1.5, 14.1, 14.2, 14.3
 */

/**
 * Resolve the application version string from a parsed package.json.
 *
 * @param {object} pkgJson - parsed products/argos-saleslogix/package.json
 * @returns {string} the value of pkgJson.version as a string (e.g. '4.4.0')
 */
function resolveVersion(pkgJson) {
  return String(pkgJson.version);
}

/**
 * Resolve the integer version code used for android-versionCode and
 * ios-CFBundleVersion.
 *
 * Returns parseInt(env.BUILD_NUMBER, 10) when BUILD_NUMBER parses as a positive
 * integer (>= 1); otherwise returns 1. Because Jenkins runs are monotonically
 * increasing, the resulting version codes are monotonic across release builds
 * for a given branch.
 *
 * @param {object} env - environment object, e.g. { BUILD_NUMBER?: string }
 * @returns {number} an integer >= 1
 */
function resolveVersionCode(env) {
  const source = env || {};
  const parsed = parseInt(source.BUILD_NUMBER, 10);

  if (Number.isInteger(parsed) && parsed >= 1) {
    return parsed;
  }

  return 1;
}

module.exports = {
  resolveVersion,
  resolveVersionCode,
};
