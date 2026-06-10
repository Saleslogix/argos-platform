'use strict';

/**
 * Mingle Redirect Parser
 *
 * Parses the OAuth redirect that Mingle sends back to the native shell and
 * extracts the `access_token` / `expires_in` values that are forwarded to the
 * existing `crm/MingleUtility.populateAccessToken` entry point. This is a pure
 * Node (CommonJS) helper consumed by the Cordova in-app-browser navigation
 * interception logic and by the property test; it is not an AMD module.
 *
 * The native Mingle redirect uses the custom URL scheme
 * `infor-crm-slx://oauth/callback`. OAuth implicit-grant providers (Mingle
 * included) commonly return the token either on the `#` fragment or the `?`
 * query string, so the parser accepts both forms. `composeRedirect` builds a
 * fragment-form URL (matching the implicit-grant convention used by the
 * existing web `MingleUtility`) and URL-encodes the values so that arbitrary
 * URL-safe token / expiry strings round-trip through `parseRedirect` exactly.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 9.3, 9.4
 */

/**
 * The custom URL scheme registered for the Mingle OAuth callback (Req 9.4).
 * @type {string}
 */
const CALLBACK_URL = 'infor-crm-slx://oauth/callback';

/**
 * Decode a percent-encoded component, falling back to the raw value when the
 * input is not a well-formed percent-encoded string (defensive against
 * untrusted redirect URLs).
 *
 * @param {string} value
 * @returns {string}
 */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}

/**
 * Return the portion of `url` before any `?` query string or `#` fragment.
 *
 * @param {string} url
 * @returns {string}
 */
function baseOf(url) {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  let index = -1;
  if (queryIndex !== -1 && hashIndex !== -1) {
    index = Math.min(queryIndex, hashIndex);
  } else if (queryIndex !== -1) {
    index = queryIndex;
  } else if (hashIndex !== -1) {
    index = hashIndex;
  }

  return index === -1 ? url : url.slice(0, index);
}

/**
 * Extract the decoded key/value pairs from both the query string and the
 * fragment of a URL. The first occurrence of a given key wins.
 *
 * @param {string} url
 * @returns {object} map of decoded parameter name -> decoded value
 */
function extractParams(url) {
  const params = {};
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const segments = [];

  // Query string: present only when `?` appears before any `#`.
  if (queryIndex !== -1 && (hashIndex === -1 || queryIndex < hashIndex)) {
    const end = hashIndex !== -1 ? hashIndex : url.length;
    segments.push(url.slice(queryIndex + 1, end));
  }

  // Fragment: everything after the first `#`.
  if (hashIndex !== -1) {
    segments.push(url.slice(hashIndex + 1));
  }

  segments.forEach((segment) => {
    if (!segment) {
      return;
    }

    segment.split('&').forEach((pair) => {
      if (!pair) {
        return;
      }

      const eqIndex = pair.indexOf('=');
      const rawKey = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
      const rawValue = eqIndex === -1 ? '' : pair.slice(eqIndex + 1);
      const key = safeDecode(rawKey);

      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        params[key] = safeDecode(rawValue);
      }
    });
  });

  return params;
}

/**
 * Parse a Mingle OAuth redirect URL.
 *
 * Returns `{ accessToken, expiresIn }` extracted from the `access_token` and
 * `expires_in` parameters (read from either the `?` query string or the `#`
 * fragment). Returns `null` when the URL does not match the
 * `infor-crm-slx://oauth/callback` callback scheme, or when it carries neither
 * the `access_token` nor the `expires_in` parameter.
 *
 * @param {string} url - the redirect URL intercepted in the in-app browser
 * @returns {({ accessToken: string, expiresIn: string })|null}
 */
function parseRedirect(url) {
  if (typeof url !== 'string' || url.length === 0) {
    return null;
  }

  if (baseOf(url) !== CALLBACK_URL) {
    return null;
  }

  const params = extractParams(url);
  const hasAccessToken = Object.prototype.hasOwnProperty.call(params, 'access_token');
  const hasExpiresIn = Object.prototype.hasOwnProperty.call(params, 'expires_in');

  if (!hasAccessToken && !hasExpiresIn) {
    return null;
  }

  return {
    accessToken: params.access_token,
    expiresIn: params.expires_in,
  };
}

/**
 * Compose a Mingle OAuth redirect URL from a base URL and a token pair.
 *
 * The values are URL-encoded onto the `#` fragment so that
 * `parseRedirect(composeRedirect(baseUrl, { accessToken, expiresIn }))`
 * deep-equals `{ accessToken, expiresIn }` for arbitrary URL-safe strings.
 * Any pre-existing query string or fragment on `baseUrl` is dropped so the
 * composed URL matches the callback scheme expected by `parseRedirect`.
 *
 * @param {string} baseUrl - callback base, defaults to the registered scheme
 * @param {object} tokens
 * @param {string} [tokens.accessToken]
 * @param {string} [tokens.expiresIn]
 * @returns {string}
 */
function composeRedirect(baseUrl, tokens) {
  const requested = baseUrl === undefined || baseUrl === null || baseUrl === ''
    ? CALLBACK_URL
    : String(baseUrl);
  const base = baseOf(requested);
  const values = tokens || {};
  const pairs = [];

  if (values.accessToken !== undefined && values.accessToken !== null) {
    pairs.push(`access_token=${encodeURIComponent(values.accessToken)}`);
  }

  if (values.expiresIn !== undefined && values.expiresIn !== null) {
    pairs.push(`expires_in=${encodeURIComponent(values.expiresIn)}`);
  }

  const fragment = pairs.join('&');
  return fragment ? `${base}#${fragment}` : base;
}

module.exports = {
  CALLBACK_URL,
  parseRedirect,
  composeRedirect,
};
