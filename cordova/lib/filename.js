'use strict';

/**
 * Native Artifact Filename Composition
 *
 * Composes the filename for a native build artifact (Android APK/AAB, iOS IPA)
 * so that the version and Jenkins BUILD_NUMBER are embedded in the name. This
 * is a pure Node (CommonJS) helper consumed by the Cordova Grunt tasks and
 * hooks; it is not an AMD module.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 11.1, 11.2, 11.3
 */

/** The artifact formats this helper knows how to name. */
const SUPPORTED_FORMATS = ['apk', 'aab', 'ipa'];

/** The fixed product prefix shared by every native artifact. */
const FILENAME_PREFIX = 'infor-crm-slx';

/** The build number used when none is supplied (null/undefined/empty). */
const DEFAULT_BUILD_NUMBER = '0';

/**
 * Compose a native artifact filename of the form
 * `infor-crm-slx-<version>-<buildNumber>.<format>`.
 *
 * `buildNumber` defaults to `'0'` when missing (null, undefined, or empty
 * string). Numeric build numbers are coerced to string via String(buildNumber)
 * so the Jenkins BUILD_NUMBER value embeds cleanly whether it arrives as a
 * number or a string.
 *
 * @param {object} options
 * @param {string} options.version - application version (e.g. '4.4.0')
 * @param {string|number} [options.buildNumber] - Jenkins BUILD_NUMBER value
 * @param {'apk'|'aab'|'ipa'} options.format - artifact format / extension
 * @returns {string} the composed filename
 * @throws {Error} if format is not one of apk, aab, ipa
 */
function composeArtifactFilename({ version, buildNumber, format } = {}) {
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new Error(
      `composeArtifactFilename: unsupported format "${format}"; expected one of ${SUPPORTED_FORMATS.join(', ')}`
    );
  }

  const resolvedBuildNumber =
    buildNumber === null || buildNumber === undefined || buildNumber === ''
      ? DEFAULT_BUILD_NUMBER
      : String(buildNumber);

  return `${FILENAME_PREFIX}-${String(version)}-${resolvedBuildNumber}.${format}`;
}

module.exports = {
  composeArtifactFilename,
  SUPPORTED_FORMATS,
  FILENAME_PREFIX,
  DEFAULT_BUILD_NUMBER,
};
