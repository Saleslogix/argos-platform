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
 * @module crm/OCR/OcrServiceClient
 *
 * Entity-agnostic client for the OCR service operation
 * (`POST slx/system/-/$service/executeOcr`). It builds the SData service
 * operation request from image input only, enforces a 30-second timeout,
 * classifies the response (success / error / 404 / transport-failure or
 * timeout), and returns a normalized `OcrResult`.
 *
 * The client deliberately references only the image input and the recognition
 * response — it never references Lead-entity-specific field names, views, or
 * logic — so Contacts and other entities can reuse it without modification
 * (Requirement 10.1).
 */
define('crm/OCR/OcrServiceClient', [
  './FeatureAvailability',
  './textLines',
], (FeatureAvailability, textLines) => {
  // Recognition requests are terminated if they do not complete within this
  // window (Requirement 4.5).
  const TIMEOUT_MS = 30000;

  // Generic, entity-agnostic fallback messages. The views may present their
  // own localized text based on the result flags; these provide a sensible
  // default whenever the server does not supply a usable message.
  const GENERIC_ERROR_MESSAGE = 'Text recognition failed. Please try again.';
  const GENERIC_UNAVAILABLE_MESSAGE = 'Text recognition is not available on this platform.';

  /**
   * Whether a language token is a non-empty string that should be included in
   * the request body (Requirements 4.2 / 4.3).
   * @param {*} language The caller-supplied language token.
   * @returns {boolean}
   */
  function hasLanguageToken(language) {
    return typeof language === 'string' && language.length > 0;
  }

  class OcrServiceClient {
    /**
     * @param {Object} [options]
     * @param {Object} [options.service] The authenticated SData service used to
     *   build the request. Defaults to `App.getService()`.
     * @param {Object} [options.availability] The feature-availability tracker
     *   used to record a 404. Defaults to `crm/OCR/FeatureAvailability`.
     */
    constructor({ service = App.getService(), availability = FeatureAvailability } = {}) {
      this.service = service;
      this.availability = availability;
    }

    /**
     * Submit an image for recognition.
     *
     * Builds the `SDataServiceOperationRequest` (`system` contract, `executeOcr`
     * operation) with `request.imageData` and `request.imageFormat`, including
     * `request.language` only when a non-empty token is supplied. Enforces the
     * 30-second timeout and routes a 404 to the availability tracker.
     *
     * Requirements 4.1, 4.2, 4.3, 4.5, 10.1.
     *
     * @param {Object} request
     * @param {string} request.imageData Base64-encoded image data.
     * @param {string} request.imageFormat The declared Supported_Image_Format.
     * @param {string} [request.language] Optional OCR language token.
     * @returns {Promise<Object>} Resolves to a normalized `OcrResult`.
     */
    recognize(request) {
      const { imageData, imageFormat, language } = request || {};

      const sdataRequest = new Sage.SData.Client.SDataServiceOperationRequest(this.service)
        .setContractName('system')
        .setOperationName('executeOcr');

      const entry = {
        request: {
          imageData,
          imageFormat,
          ...(hasLanguageToken(language) ? { language } : {}),
        },
      };

      return new Promise((resolve) => {
        let settled = false;
        let timer = null;

        const settle = (raw) => {
          if (settled) {
            return;
          }

          settled = true;

          if (timer) {
            clearTimeout(timer);
            timer = null;
          }

          resolve(this.interpretResponse(raw));
        };

        // Enforce the 30-second timeout: terminate the in-flight request and
        // classify the outcome as a timeout (Requirement 4.5).
        timer = setTimeout(() => {
          if (sdataRequest && typeof sdataRequest.abort === 'function') {
            try {
              sdataRequest.abort();
            } catch (err) {
              // Aborting is best-effort; the timeout result stands regardless.
            }
          }

          settle({ timedOut: true });
        }, TIMEOUT_MS);

        sdataRequest.execute(entry, {
          success: response => settle(this._normalizeResponse(response)),
          failure: (response) => {
            // A 404 means the platform does not expose the operation; route it
            // to availability handling (Requirements 1.1, 6.6). Any other
            // failure is treated as a generic transport error.
            if (response && response.status === 404) {
              settle({ unavailable: true });
              return;
            }

            settle({ success: false });
          },
          scope: this,
        });
      });
    }

    /**
     * Classify a normalized response into an `OcrResult`. Implemented as a pure
     * method (no network coupling) so it can be exercised directly by tests.
     *
     * Requirements 5.1, 5.4, 6.1, 6.6, 1.1.
     *
     * @param {Object} raw Normalized response with one of: `unavailable`,
     *   `timedOut`, or `success` (with `recognizedText`/`confidence` or
     *   `errorMessage`).
     * @returns {Object} The normalized `OcrResult`:
     *   `{ ok, unavailable, timedOut, lines, confidence, message }`.
     */
    interpretResponse(raw) {
      const data = raw || {};

      // 404 / platform unavailable: record it for the rest of the session and
      // report the result as unavailable (Requirements 6.6, 1.1).
      if (data.unavailable === true) {
        if (this.availability && typeof this.availability.markUnavailable === 'function') {
          this.availability.markUnavailable();
        }

        return {
          ok: false,
          unavailable: true,
          timedOut: false,
          lines: [],
          confidence: 0,
          message: GENERIC_UNAVAILABLE_MESSAGE,
        };
      }

      // Timeout / treated as a transport error (Requirement 4.5).
      if (data.timedOut === true) {
        return {
          ok: false,
          unavailable: false,
          timedOut: true,
          lines: [],
          confidence: 0,
          message: GENERIC_ERROR_MESSAGE,
        };
      }

      // Success: extract the recognized lines and clamp the confidence
      // (Requirements 5.1, 5.4). The service returns the score as `confidence`;
      // `confidenceScore` is also accepted for backward compatibility.
      if (data.success === true) {
        const rawConfidence = (data.confidence !== undefined && data.confidence !== null)
          ? data.confidence
          : data.confidenceScore;

        return {
          ok: true,
          unavailable: false,
          timedOut: false,
          lines: textLines.extract(data.recognizedText),
          confidence: textLines.clampConfidence(rawConfidence),
          message: '',
        };
      }

      // Failure (`success === false`) or a generic transport failure: use the
      // server error message when present and non-empty, otherwise substitute
      // the generic recognition-error message (Requirement 6.1).
      const errorMessage = (typeof data.errorMessage === 'string' && data.errorMessage.trim().length > 0)
        ? data.errorMessage
        : GENERIC_ERROR_MESSAGE;

      return {
        ok: false,
        unavailable: false,
        timedOut: false,
        lines: [],
        confidence: 0,
        message: errorMessage,
      };
    }

    /**
     * Normalize the raw SData response into the flat shape consumed by
     * `interpretResponse`. Service operations commonly wrap the payload under a
     * `response` property; fall back to the response itself otherwise.
     * @param {Object} response The raw response from `request.execute`.
     * @returns {Object} The recognition payload.
     */
    _normalizeResponse(response) {
      if (!response) {
        return {};
      }

      if (response.response && typeof response.response === 'object') {
        return response.response;
      }

      return response;
    }
  }

  return OcrServiceClient;
});
