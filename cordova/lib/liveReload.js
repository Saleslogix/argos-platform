'use strict';

/**
 * Live Reload Override
 *
 * Optional developer convenience that points the WebView at the running
 * `npm start` dev server instead of the staged `www/` bundle, so that source
 * edits do not require a full rebuild. This is a pure Node (CommonJS) helper
 * consumed by the Cordova Grunt tasks; it is not an AMD module.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 13.5
 */

/**
 * Default developer server URL used when no explicit override is supplied.
 * Mirrors the SalesLogix `npm start` URL.
 *
 * @type {string}
 */
const DEFAULT_LIVE_RELOAD_URL = 'http://localhost:8000/products/argos-saleslogix/';

/**
 * Values that, when matched case-insensitively against the trimmed
 * ARGOS_LIVE_RELOAD value, enable live reload.
 *
 * @type {string[]}
 */
const TRUTHY_VALUES = ['1', 'true', 'yes'];

/**
 * Determine whether ARGOS_LIVE_RELOAD requests live reload.
 *
 * Accepts only the exact tokens '1', 'true', or 'yes' (case-insensitive,
 * surrounding whitespace ignored). Anything else - including empty strings,
 * unset values, and non-string values - is treated as disabled.
 *
 * @param {*} value - the raw env.ARGOS_LIVE_RELOAD value
 * @returns {boolean} true when live reload should be enabled
 */
function isLiveReloadEnabled(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === '') {
    return false;
  }

  return TRUTHY_VALUES.indexOf(normalized) !== -1;
}

/**
 * Apply the live-reload override to a build configuration.
 *
 * When `env.ARGOS_LIVE_RELOAD` is a non-empty truthy string ('1', 'true', or
 * 'yes', case-insensitive), returns a NEW config object with `contentSrc` set
 * to the override URL. The URL is read from `env.ARGOS_LIVE_RELOAD_URL` first
 * (for testability), falling back to `process.env.ARGOS_LIVE_RELOAD_URL`, and
 * finally to the default developer server URL.
 *
 * When live reload is disabled, the original `config` reference is returned
 * unchanged. The input `config` is never mutated.
 *
 * @param {object} config - the base build configuration
 * @param {object} env - environment object, e.g. { ARGOS_LIVE_RELOAD?: string, ARGOS_LIVE_RELOAD_URL?: string }
 * @returns {object} a new config with `contentSrc` set, or the original config unchanged
 */
function applyLiveReload(config, env) {
  const source = env || {};

  if (!isLiveReloadEnabled(source.ARGOS_LIVE_RELOAD)) {
    return config;
  }

  const overrideUrl = source.ARGOS_LIVE_RELOAD_URL
    || process.env.ARGOS_LIVE_RELOAD_URL
    || DEFAULT_LIVE_RELOAD_URL;

  return Object.assign({}, config, { contentSrc: overrideUrl });
}

module.exports = {
  DEFAULT_LIVE_RELOAD_URL,
  applyLiveReload,
  isLiveReloadEnabled,
};
