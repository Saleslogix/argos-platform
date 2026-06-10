'use strict';

/**
 * Toolchain Detection
 *
 * Decides whether the Android and/or iOS native build toolchains are available
 * so the Cordova Grunt pipeline can skip (Jenkins) or fail (local) a target
 * that has no usable toolchain. This is a pure Node (CommonJS) helper consumed
 * by the Cordova Grunt tasks; it is not an AMD module.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 12.3
 */

const fs = require('fs');
const path = require('path');

/** The executable name probed to confirm the iOS toolchain is present. */
const XCODEBUILD_BINARY = 'xcodebuild';

/**
 * Determine whether a value is a non-empty string after trimming.
 *
 * @param {*} value - candidate environment value
 * @returns {boolean} true iff value is a string with non-whitespace content
 */
function isNonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Detect which native build toolchains are usable.
 *
 * `android` is true iff both `ANDROID_SDK_ROOT` and `JAVA_HOME` are set to
 * non-empty values in `env`. `ios` is true iff the host platform is `darwin`
 * and `xcodebuild` is available (`hasXcodebuild === true`). The `xcodebuild`
 * probe result is passed in explicitly (see `probeXcodebuild`) so callers and
 * tests can decide the value without touching disk.
 *
 * @param {object} options
 * @param {object} [options.env] - environment object (defaults to {})
 * @param {string} [options.platform] - host platform (e.g. process.platform)
 * @param {boolean} [options.hasXcodebuild] - whether xcodebuild is on PATH
 * @returns {{ android: boolean, ios: boolean }} per-platform availability
 */
function detectToolchains({ env, platform, hasXcodebuild } = {}) {
  const source = env || {};

  const android = isNonEmpty(source.ANDROID_SDK_ROOT) && isNonEmpty(source.JAVA_HOME);
  const ios = platform === 'darwin' && hasXcodebuild === true;

  return { android, ios };
}

/**
 * Probe the PATH for an executable named `xcodebuild`.
 *
 * Performs a synchronous `which`-style lookup by scanning each directory in
 * `process.env.PATH` for the binary. No external dependency is used. Any error
 * (missing PATH, unreadable directory, etc.) is swallowed and results in
 * `false`. `xcodebuild` is darwin-only, so a plain name check is sufficient and
 * Windows PATHEXT extensions are not required.
 *
 * @returns {boolean} true iff `xcodebuild` is found on PATH
 */
function probeXcodebuild() {
  try {
    const rawPath = process.env.PATH;

    if (!isNonEmpty(rawPath)) {
      return false;
    }

    const directories = rawPath.split(path.delimiter);

    for (let i = 0; i < directories.length; i += 1) {
      const directory = directories[i];

      if (!directory) {
        continue;
      }

      const candidate = path.join(directory, XCODEBUILD_BINARY);

      try {
        if (fs.statSync(candidate).isFile()) {
          return true;
        }
      } catch (statError) {
        // Candidate does not exist or is not accessible in this directory;
        // keep scanning the remaining PATH entries.
        continue;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

module.exports = {
  detectToolchains,
  probeXcodebuild,
  XCODEBUILD_BINARY,
};
