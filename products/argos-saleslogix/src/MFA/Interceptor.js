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
 * @module crm/MFA/Interceptor
 */
define('crm/MFA/Interceptor', [
  './Service',
  './actions/mfa',
], (MFAService, mfaActions) => {
  /**
   * @class
   * @alias module:crm/MFA/Interceptor
   * @classdesc MFA Interceptor detects MfaRequired errors and orchestrates the MFA flow
   */
  class MFAInterceptor {
    /**
     * Initialize the interceptor and attach to SData client
     * @param {Object} sdataService - The SData service instance
     * @param {Object} store - Redux store instance
     */
    constructor(sdataService, store) {
      this.service = sdataService;
      this.store = store;
      this.mfaService = new MFAService(sdataService);
      this.originalRequest = null;
      this.mfaInProgress = false;
    }

    /**
     * Handle HTTP response, checking for MFA requirements
     * @param {Object} response - HTTP response object
     * @returns {Object} - Original response or throws MFA error
     */
    handleResponse(response) {
      // Pass through successful responses
      return response;
    }

    /**
     * Handle HTTP error, checking for MfaRequired
     * @param {Object} error - HTTP error object
     * @returns {Promise} - Resolves after MFA completion or rejects
     */
    handleError(error) {
      // Check if this is an MfaRequired error
      if (this._isMfaRequiredError(error)) {
        // Ensure $diagnoses is available for parseMFAError (raw XHR may only have responseText)
        const diagnoses = this._parseDiagnoses(error);
        if (diagnoses && !error.$diagnoses) {
          error.$diagnoses = diagnoses;
        }

        // Parse the error to extract hasDevices
        const parsedError = this.mfaService.parseMFAError(error);

        // Store the original request for retry
        this.storeOriginalRequest(error.request);

        // Dispatch Redux action to initiate MFA flow
        this.store.dispatch(mfaActions.startMFAFlow(parsedError.hasDevices));

        // Return a promise that will be resolved when MFA completes
        return new Promise((resolve, reject) => {
          this._mfaResolve = resolve;
          this._mfaReject = reject;
          this.mfaInProgress = true;
        });
      }

      // Not an MFA error, propagate it
      return Promise.reject(error);
    }

    /**
     * Parse diagnoses from an error object, supporting both pre-parsed and raw XHR formats
     * @param {Object} error - Error object (may be pre-parsed or raw XHR)
     * @returns {Array|null} - The diagnoses array, or null if unavailable or parsing fails
     * @private
     */
    _parseDiagnoses(error) {
      if (!error) {
        return null;
      }

      // Pre-parsed responses (from read() code path) have $diagnoses directly
      if (error.$diagnoses) {
        return error.$diagnoses;
      }

      // Raw XHR responses (from execute() code path) have diagnoses in responseText
      if (error.responseText) {
        try {
          const parsed = JSON.parse(error.responseText);
          return parsed.$diagnoses || null;
        } catch (e) {
          // Malformed responseText — cannot extract diagnoses
          return null;
        }
      }

      return null;
    }

    /**
     * Check if error is MfaRequired
     * @param {Object} error - Error object
     * @returns {boolean} - True if MfaRequired error
     * @private
     */
    _isMfaRequiredError(error) {
      // Check for 401 status
      if (error && error.status === 401) {
        const diagnoses = this._parseDiagnoses(error);

        // Check for SData diagnoses format
        if (diagnoses && Array.isArray(diagnoses) && diagnoses.length > 0) {
          const diagnosis = diagnoses[0];
          return diagnosis.sdataCode === 'MfaRequired';
        }
      }
      return false;
    }

    /**
     * Store original request for retry after MFA
     * @param {Object} request - Original request configuration
     */
    storeOriginalRequest(request) {
      this.originalRequest = request;

      // Also dispatch to Redux for state management
      this.store.dispatch(mfaActions.storeOriginalRequest(request));
    }

    /**
     * Retry the original request after MFA verification
     * @returns {Promise} - Promise resolving to API response
     */
    retryOriginalRequest() {
      if (!this.originalRequest) {
        return Promise.reject(new Error('No original request to retry'));
      }

      const request = this.originalRequest;

      // Execute the request again using the read method
      return new Promise((resolve, reject) => {
        // SData requests use the read() method
        if (request && typeof request.read === 'function') {
          request.read({
            success: (response) => {
              this.originalRequest = null;
              this.mfaInProgress = false;
              resolve(response);
            },
            failure: (error) => {
              // Check if we got MfaRequired again
              if (this._isMfaRequiredError(error)) {
                // MFA required again - this is an error condition
                this.originalRequest = null;
                this.mfaInProgress = false;
                this.store.dispatch(mfaActions.setMFAError(
                  'MFA verification failed. Please log in again.',
                  'MfaRequired',
                ));
                reject(error);
              } else {
                // Different error - propagate it
                this.originalRequest = null;
                this.mfaInProgress = false;
                reject(error);
              }
            },
            aborted: (error) => {
              // Handle aborted requests
              this.originalRequest = null;
              this.mfaInProgress = false;
              reject(error);
            },
          });
        } else {
          reject(new Error('Cannot retry request: invalid request object'));
        }
      });
    }

    /**
     * Complete MFA flow successfully
     * Called by the coordinator when MFA verification succeeds
     * @returns {Promise} - Promise resolving to retried request response
     */
    completeMFAFlow() {
      return this.retryOriginalRequest()
        .then((response) => {
          if (this._mfaResolve) {
            this._mfaResolve(response);
            this._mfaResolve = null;
            this._mfaReject = null;
          }
          return response;
        })
        .catch((error) => {
          if (this._mfaReject) {
            this._mfaReject(error);
            this._mfaResolve = null;
            this._mfaReject = null;
          }
          throw error;
        });
    }

    /**
     * Cancel MFA flow
     * Called by the coordinator when user cancels MFA
     */
    cancelMFAFlow() {
      this.originalRequest = null;
      this.mfaInProgress = false;

      if (this._mfaReject) {
        this._mfaReject(new Error('MFA flow cancelled by user'));
        this._mfaResolve = null;
        this._mfaReject = null;
      }
    }
  }

  return MFAInterceptor;
});
