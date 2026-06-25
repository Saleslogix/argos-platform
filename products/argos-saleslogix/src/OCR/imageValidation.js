/* Copyright 2026 Infor
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module crm/OCR/imageValidation
 *
 * Pure helpers for validating an image selected in the OCR capture view before
 * it is submitted to the OCR service operation. Determines whether a declared
 * image format is a Supported_Image_Format, whether the decoded byte length is
 * within the Image_Size_Limit, and whether the image is non-empty.
 *
 * These helpers are intentionally free of DOM and network coupling so they can
 * be exercised with property-based tests.
 */
define('crm/OCR/imageValidation', [], () => {
  // Supported_Image_Format set; JPG is an alias of JPEG.
  const SUPPORTED_FORMATS = ['png', 'jpeg', 'tiff', 'bmp'];

  // Image_Size_Limit = 10 megabytes.
  const MAX_BYTES = 10 * 1024 * 1024;

  return {
    SUPPORTED_FORMATS,
    MAX_BYTES,

    /**
     * Normalize a declared image format to its canonical Supported_Image_Format
     * token. Lowercases the token and maps the `jpg` alias to `jpeg`.
     * @param {string} declared The declared image format token.
     * @returns {string|null} The canonical token, or null if unknown/unsupported.
     */
    normalizeFormat(declared) {
      if (typeof declared !== 'string') {
        return null;
      }

      const normalized = declared.trim().toLowerCase();
      const canonical = normalized === 'jpg' ? 'jpeg' : normalized;

      return SUPPORTED_FORMATS.indexOf(canonical) >= 0 ? canonical : null;
    },

    /**
     * Whether the declared format resolves to a Supported_Image_Format.
     * @param {string} declared The declared image format token.
     * @returns {boolean}
     */
    isSupportedFormat(declared) {
      return this.normalizeFormat(declared) !== null;
    },

    /**
     * Whether the decoded byte length is within the Image_Size_Limit.
     * @param {number} byteLength The decoded image size in bytes.
     * @returns {boolean}
     */
    isWithinSizeLimit(byteLength) {
      return byteLength <= MAX_BYTES;
    },

    /**
     * Whether the image contains at least one byte.
     * @param {number} byteLength The decoded image size in bytes.
     * @returns {boolean}
     */
    isNonEmpty(byteLength) {
      return byteLength > 0;
    },

    /**
     * Whether the selected image may be submitted: true if and only if the
     * format is supported AND the byte length is within the limit AND the image
     * is non-empty.
     * @param {Object} params
     * @param {string} params.declaredFormat The declared image format token.
     * @param {number} params.byteLength The decoded image size in bytes.
     * @returns {boolean}
     */
    canSubmit({ declaredFormat, byteLength } = {}) {
      return this.isSupportedFormat(declaredFormat)
        && this.isWithinSizeLimit(byteLength)
        && this.isNonEmpty(byteLength);
    },
  };
});
