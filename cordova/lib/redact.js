'use strict';

/**
 * Log Redaction
 *
 * Scrubs secret values (signing passwords, identities, etc.) out of log lines
 * so they are never written to build output. This is a pure Node (CommonJS)
 * helper consumed by the Cordova Grunt tasks and hooks; it is not an AMD
 * module.
 *
 * Redaction uses a literal substring replace rather than a RegExp built from
 * the secret, because secrets may contain regex metacharacters. Using
 * String.prototype.split(secret).join(REDACTION_MARKER) guarantees the output
 * never contains the secret as a substring regardless of its contents.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 11.8
 */

/** The marker substituted in place of every redacted secret occurrence. */
const REDACTION_MARKER = '***REDACTED***';

/**
 * Replace every occurrence of a single non-empty secret substring in a line
 * with the redaction marker.
 *
 * When the secret is null, undefined, or an empty string, the line is returned
 * unchanged. When the secret is absent from the line, the line is returned
 * unchanged. A literal substring replace is used (no RegExp) so that secrets
 * containing regex metacharacters are handled correctly.
 *
 * @param {string} line - the log line to redact
 * @param {string} secret - the secret substring to remove
 * @returns {string} the line with every occurrence of secret replaced
 */
function redact(line, secret) {
  if (secret === null || secret === undefined || secret === '') {
    return line;
  }

  return String(line).split(secret).join(REDACTION_MARKER);
}

/**
 * Apply redact() for each secret in a list, in turn, against a single line.
 *
 * Each secret is applied to the result of the previous redaction so that all
 * secrets are scrubbed from the final output. Empty/missing secrets and a
 * missing/empty secrets list leave the line unchanged.
 *
 * @param {string} line - the log line to redact
 * @param {Array<string>} secrets - the list of secret substrings to remove
 * @returns {string} the line with every occurrence of every secret replaced
 */
function redactAll(line, secrets) {
  if (!Array.isArray(secrets)) {
    return line;
  }

  return secrets.reduce((acc, secret) => redact(acc, secret), line);
}

module.exports = {
  REDACTION_MARKER,
  redact,
  redactAll,
};
