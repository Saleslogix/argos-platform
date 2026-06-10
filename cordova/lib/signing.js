'use strict';

/**
 * Signing Validator
 *
 * Validates that the platform-specific Signing_Configuration secrets required
 * for a `release` build are present in the environment. This is a pure Node
 * (CommonJS) helper consumed by the Cordova Grunt tasks; it is not an AMD
 * module.
 *
 * For `release` builds every required variable must be present and non-empty,
 * and the `cordova:build` task fails fast with a named missing variable when
 * any are absent. For `debug` builds, Cordova's default debug keystore is used
 * and iOS signing is skipped, so no signing variables are required.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 11.4, 11.5, 11.6, 11.7
 */

/** Environment variables required to sign an Android release artifact. */
const ANDROID_REQUIRED = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
];

/** Environment variables required to sign an iOS release artifact. */
const IOS_REQUIRED = [
  'IOS_SIGNING_IDENTITY',
  'IOS_PROVISIONING_PROFILE',
];

/**
 * Determine whether an environment value is present and non-empty.
 *
 * @param {*} value - the candidate value read from the environment object
 * @returns {boolean} true when the value is defined, non-null, and not an
 *   empty string
 */
function isPresent(value) {
  return value !== undefined && value !== null && String(value) !== '';
}

/**
 * Validate that every required variable in `required` is present and non-empty
 * in `env`.
 *
 * @param {object} env - environment object (a subset of process.env)
 * @param {string[]} required - the list of required variable names
 * @returns {{ ok: boolean, missing?: string[] }} `{ ok: true }` when all
 *   required variables are present, otherwise `{ ok: false, missing }` listing
 *   every missing or empty variable name in declaration order
 */
function validateRequired(env, required) {
  const source = env || {};
  const missing = required.filter((name) => !isPresent(source[name]));

  if (missing.length === 0) {
    return { ok: true };
  }

  return { ok: false, missing };
}

/**
 * Validate the Android Signing_Configuration environment variables.
 *
 * Requires ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS,
 * and ANDROID_KEY_PASSWORD to be present and non-empty.
 *
 * @param {object} env - environment object (a subset of process.env)
 * @returns {{ ok: boolean, missing?: string[] }} `{ ok: true }` when all four
 *   variables are present, otherwise `{ ok: false, missing }`
 */
function validateAndroidSigning(env) {
  return validateRequired(env, ANDROID_REQUIRED);
}

/**
 * Validate the iOS Signing_Configuration environment variables.
 *
 * Requires IOS_SIGNING_IDENTITY and IOS_PROVISIONING_PROFILE to be present and
 * non-empty.
 *
 * @param {object} env - environment object (a subset of process.env)
 * @returns {{ ok: boolean, missing?: string[] }} `{ ok: true }` when both
 *   variables are present, otherwise `{ ok: false, missing }`
 */
function validateIosSigning(env) {
  return validateRequired(env, IOS_REQUIRED);
}

/**
 * Validate signing requirements for a requested platform and build profile.
 *
 * `debug` builds skip all signing requirements (Requirement 11.7): Cordova's
 * default debug keystore signs Android, and iOS simulator builds do not require
 * a signing identity. For `release` builds the call dispatches to the
 * platform-specific validator.
 *
 * @param {object} options
 * @param {object} options.env - environment object (a subset of process.env)
 * @param {string} options.platform - `'android'` or `'ios'`
 * @param {string} options.buildProfile - `'debug'` or `'release'`
 * @returns {{ ok: boolean, missing?: string[] }} `{ ok: true }` when the build
 *   profile is `debug` or every variable required by the platform is present;
 *   otherwise `{ ok: false, missing }` naming every missing variable
 */
function validateSigning(options) {
  const { env, platform, buildProfile } = options || {};

  if (buildProfile === 'debug') {
    return { ok: true };
  }

  if (platform === 'android') {
    return validateAndroidSigning(env);
  }

  if (platform === 'ios') {
    return validateIosSigning(env);
  }

  // No signing requirements are defined for any other platform.
  return { ok: true };
}

module.exports = {
  ANDROID_REQUIRED,
  IOS_REQUIRED,
  validateAndroidSigning,
  validateIosSigning,
  validateSigning,
};
