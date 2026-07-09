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
 * @module crm/OCR/FeatureAvailability
 *
 * Session-scoped availability tracking for the OCR service operation. Mirrors
 * the `_getUnsupportedOperations` / `_isOperationUnsupported` /
 * `_markOperationUnsupported` convention used by
 * `crm/Views/Journey/CustomerJourney360Widget`, extracted into a reusable
 * module keyed by operation name.
 *
 * The state lives on the lazily-created `App.context.unsupportedOperations`
 * map, so it is shared for the duration of a session and discarded when
 * `App.context` is rebuilt for a new session.
 */
define('crm/OCR/FeatureAvailability', [], () => {
  // Default operation name tracked by this module.
  const OCR_OPERATION_NAME = 'executeOcr';

  /**
   * Returns the session-scoped map of service operations that have been found
   * unavailable (returned a 404). Lazily created on `App.context` so it is
   * shared for the session and reset when the app/context is rebuilt.
   * @returns {Object} Map keyed by operation name.
   */
  function getUnsupportedOperations() {
    if (!App.context) {
      return {};
    }

    if (!App.context.unsupportedOperations) {
      App.context.unsupportedOperations = {};
    }

    return App.context.unsupportedOperations;
  }

  return {
    operationName: OCR_OPERATION_NAME,

    /**
     * Whether the operation is available for the current session. Returns true
     * unless a 404 has been recorded for the operation this session.
     *
     * Requirements 1.3, 1.6, 1.7.
     *
     * @param {string} [name=OCR_OPERATION_NAME] The operation name to check.
     * @returns {boolean} True if the operation has not been marked unavailable.
     */
    isAvailable(name = OCR_OPERATION_NAME) {
      const unsupported = App.context && App.context.unsupportedOperations;

      return !(unsupported && unsupported[name]);
    },

    /**
     * Records the operation as unavailable for the remainder of the current
     * session, matching the storage location used by the journey widget.
     *
     * Requirements 1.1, 1.7.
     *
     * @param {string} [name=OCR_OPERATION_NAME] The operation name to mark.
     */
    markUnavailable(name = OCR_OPERATION_NAME) {
      getUnsupportedOperations()[name] = true;
    },
  };
});
