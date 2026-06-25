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
 * @module crm/OCR/textLines
 *
 * Pure helpers for interpreting OCR recognized text. These functions are free
 * of DOM and network coupling so they can be exercised with property-based
 * tests.
 */
define('crm/OCR/textLines', [], () => ({
  /**
   * Split recognized text into an ordered collection of non-empty lines.
   *
   * Splits on `\r\n`, `\r`, or `\n`, trims each line, drops whitespace-only
   * lines, and preserves the original order. Returns an empty array for any
   * non-string input.
   *
   * Requirement 5.2.
   *
   * @param {string} recognizedText The recognized text returned by the service.
   * @returns {string[]} Ordered, trimmed, non-empty lines.
   */
  extract(recognizedText) {
    if (typeof recognizedText !== 'string') {
      return [];
    }

    return recognizedText
      .split(/\r\n|\r|\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  },

  /**
   * Coerce a confidence value to a number bounded to the inclusive range
   * `[0, 100]`. Non-finite or non-numeric values become 0.
   *
   * Requirement 5.4.
   *
   * @param {*} value The raw confidence value from the response.
   * @returns {number} A number in the inclusive range 0..100.
   */
  clampConfidence(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return 0;
    }

    return Math.max(0, Math.min(100, n));
  },
}));
