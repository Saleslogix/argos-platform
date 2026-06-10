'use strict';

/**
 * cordova/lib/configRewriter.js
 *
 * Pure Node (CommonJS) helper that substitutes ARGOS_SERVER_* environment
 * variable values into the `connections.crm` block of the staged
 * `configuration/production.js`.
 *
 * This module is consumed by the Cordova Grunt pipeline (cordova/lib/stager.js)
 * and is intentionally framework-free: it is NOT an AMD module. It performs a
 * text-level (regex) rewrite of the four target assignment expressions rather
 * than parsing arbitrary JavaScript.
 *
 * Contract (design.md "Config Rewriter" + Correctness Property 2):
 *   - validate(env) reports whether ARGOS_SERVER_PORT / ARGOS_SERVER_PROTOCOL
 *     are acceptable. ARGOS_SERVER_NAME and ARGOS_SERVER_VDIR pass through.
 *   - rewrite(source, env) validates first (throwing RewriteError with code
 *     INVALID_ENV on failure), then substitutes every non-empty override into
 *     the matching connections.crm field.
 *   - rewrite(source, env) === source byte-for-byte when every value in `env`
 *     is empty / unset (Requirement 7.6 no-op invariant).
 *
 * @module cordova/lib/configRewriter
 */

/**
 * Mapping of ARGOS_SERVER_* environment variable -> connections.crm field name.
 * @type {Array<{ variable: string, field: string }>}
 */
const FIELD_MAP = [
  { variable: 'ARGOS_SERVER_NAME', field: 'serverName' },
  { variable: 'ARGOS_SERVER_PORT', field: 'port' },
  { variable: 'ARGOS_SERVER_PROTOCOL', field: 'protocol' },
  { variable: 'ARGOS_SERVER_VDIR', field: 'virtualDirectory' },
];

const PORT_FORMAT = /^\d+$/;
const PORT_MIN = 1;
const PORT_MAX = 65535;

/**
 * Error thrown by rewrite() when environment values fail validation.
 * Carries a machine-readable `code` field (`INVALID_ENV`) and the name of the
 * offending environment variable.
 */
class RewriteError extends Error {
  /**
   * @param {string} message
   * @param {string} code      - machine-readable error code (e.g. 'INVALID_ENV')
   * @param {string} [variable] - the offending environment variable name
   */
  constructor(message, code, variable) {
    super(message);
    this.name = 'RewriteError';
    this.code = code;
    if (variable !== undefined) {
      this.variable = variable;
    }
  }
}

/**
 * Returns true when an environment value is present and non-empty.
 * Treats undefined, null, and the empty string as "unset".
 *
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmpty(value) {
  return value !== undefined && value !== null && String(value) !== '';
}

/**
 * Validate ARGOS_SERVER_* env values without applying them. Pure.
 *
 * ARGOS_SERVER_PORT, when non-empty, must match `^\d+$` and fall within
 * [1, 65535]. ARGOS_SERVER_PROTOCOL, when non-empty, must equal exactly
 * `http` or `https`. ARGOS_SERVER_NAME and ARGOS_SERVER_VDIR pass through
 * unchanged.
 *
 * @param {object} [env] - { ARGOS_SERVER_NAME?, ARGOS_SERVER_PORT?,
 *                           ARGOS_SERVER_PROTOCOL?, ARGOS_SERVER_VDIR? }
 * @returns {{ valid: true } | { valid: false, variable: string, reason: string }}
 */
function validate(env) {
  const source = env || {};

  const port = source.ARGOS_SERVER_PORT;
  if (isNonEmpty(port)) {
    const portStr = String(port);
    const portNum = parseInt(portStr, 10);
    if (!PORT_FORMAT.test(portStr) || portNum < PORT_MIN || portNum > PORT_MAX) {
      return {
        valid: false,
        variable: 'ARGOS_SERVER_PORT',
        reason: `ARGOS_SERVER_PORT must be an integer between ${PORT_MIN} and ${PORT_MAX} (got "${portStr}").`,
      };
    }
  }

  const protocol = source.ARGOS_SERVER_PROTOCOL;
  if (isNonEmpty(protocol)) {
    const protocolStr = String(protocol);
    if (protocolStr !== 'http' && protocolStr !== 'https') {
      return {
        valid: false,
        variable: 'ARGOS_SERVER_PROTOCOL',
        reason: `ARGOS_SERVER_PROTOCOL must be exactly "http" or "https" (got "${protocolStr}").`,
      };
    }
  }

  return { valid: true };
}

/**
 * Escape a value for safe inclusion inside a single-quoted JavaScript string
 * literal. Realistic Server_Endpoint values (hostnames, paths, ports,
 * protocols) contain none of these characters, so this is a no-op for them
 * while keeping the emitted source valid for adversarial inputs.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeSingleQuoted(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Replace the right-hand side of a single `key: value,` assignment expression
 * with a single-quoted string literal of `value`, preserving the original
 * indentation, key, and trailing comma/whitespace.
 *
 * The match is anchored at the start of a line (after indentation only), so a
 * commented-out assignment such as `//serverName: '...'` is never matched.
 * Only the first matching assignment is rewritten.
 *
 * @param {string} source
 * @param {string} field - the connections.crm field name (e.g. 'serverName')
 * @param {string} value - the literal value to substitute
 * @returns {string}
 */
function replaceAssignment(source, field, value) {
  const literal = `'${escapeSingleQuoted(value)}'`;
  const pattern = new RegExp(
    `^([ \\t]*${field}[ \\t]*:[ \\t]*)([^\\n]*?)([ \\t]*,?[ \\t]*)$`,
    'm'
  );
  return source.replace(pattern, (match, prefix, oldValue, suffix) => `${prefix}${literal}${suffix}`);
}

/**
 * Apply ARGOS_SERVER_* overrides to the connections.crm block of `source`.
 *
 * Runs validate(env) first and throws RewriteError(code='INVALID_ENV') on
 * failure. When no override is present, returns `source` byte-for-byte
 * unchanged (Requirement 7.6 no-op invariant).
 *
 * @param {string} source - contents of configuration/production.js
 * @param {object} [env]  - { ARGOS_SERVER_NAME?, ARGOS_SERVER_PORT?,
 *                            ARGOS_SERVER_PROTOCOL?, ARGOS_SERVER_VDIR? }
 * @returns {string} rewritten source
 * @throws {RewriteError} if env values fail validation
 */
function rewrite(source, env) {
  const values = env || {};

  const result = validate(values);
  if (!result.valid) {
    throw new RewriteError(result.reason, 'INVALID_ENV', result.variable);
  }

  // No-op invariant: when no overrides are present, return the source unchanged.
  const hasOverride = FIELD_MAP.some(({ variable }) => isNonEmpty(values[variable]));
  if (!hasOverride) {
    return source;
  }

  let output = source;
  for (const { variable, field } of FIELD_MAP) {
    const value = values[variable];
    if (isNonEmpty(value)) {
      output = replaceAssignment(output, field, String(value));
    }
  }
  return output;
}

module.exports = {
  validate,
  rewrite,
  RewriteError,
};
