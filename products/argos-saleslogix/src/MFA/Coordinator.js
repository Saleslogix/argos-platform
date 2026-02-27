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
 * @module crm/MFA/Coordinator
 */
define('crm/MFA/Coordinator', [
  './actions/mfa',
], (mfaActions) => {
  /**
   * @class
   * @alias module:crm/MFA/Coordinator
   * @classdesc MFA Coordinator orchestrates the MFA flow and manages state transitions
   */
  class MFACoordinator {
    /**
     * Initialize coordinator with dependencies
     * @param {Object} app - Application instance
     * @param {Object} store - Redux store instance
     */
    constructor(app, store) {
      this.app = app;
      this.store = store;
      this.interceptor = null; // Will be set by the application
      this.loginCredentials = null; // Store credentials for post-MFA authentication

      // View IDs for MFA flow
      this.deviceSetupViewId = 'mfa_device_setup';
      this.deviceListViewId = 'mfa_device_list';
      this.verificationViewId = 'mfa_verification';

      // Session timeout tracking
      this.MAX_SESSION_TIMEOUTS = 3;
    }

    /**
     * Set the MFA interceptor reference
     * @param {Object} interceptor - MFA interceptor instance
     */
    setInterceptor(interceptor) {
      this.interceptor = interceptor;
    }

    /**
     * Start MFA flow based on user's device status
     * @param {boolean} hasDevices - Whether user has configured devices
     * @param {Object} credentials - Optional login credentials (for login flow)
     */
    startMFAFlow(hasDevices, credentials) {
      // Store credentials if provided (for post-MFA authentication)
      if (credentials) {
        this.loginCredentials = credentials;
      }

      // Dispatch Redux action to update state
      this.store.dispatch(mfaActions.startMFAFlow(hasDevices));

      // Route to appropriate flow
      if (hasDevices) {
        this.showDeviceSelection();
      } else {
        this.showDeviceSetup();
      }
    }

    /**
     * Navigate to device setup flow
     */
    showDeviceSetup() {
      // Dispatch Redux action
      this.store.dispatch(mfaActions.setFlowType('setup'));

      // Get and show the device setup view
      const view = this.app.getView(this.deviceSetupViewId);
      if (view) {
        view.show({
          coordinator: this,
        });
      } else {
        // View not registered - log error and handle gracefully
        console.error(`MFA Device Setup view (${this.deviceSetupViewId}) not found`);
        this.handleError({
          message: 'MFA setup view not available. Please contact your administrator.',
        });
      }
    }

    /**
     * Navigate to device selection flow
     */
    showDeviceSelection() {
      // Dispatch Redux action
      this.store.dispatch(mfaActions.setFlowType('verification'));

      // Get and show the device list view
      const view = this.app.getView(this.deviceListViewId);
      if (view) {
        view.show({
          coordinator: this,
        });
      } else {
        // View not registered - log error and handle gracefully
        console.error(`MFA Device List view (${this.deviceListViewId}) not found`);
        this.handleError({
          message: 'MFA device selection view not available. Please contact your administrator.',
        });
      }
    }

    /**
     * Navigate to verification view
     * @param {Object} device - Selected MFA device
     */
    showVerification(device) {
      // Dispatch Redux action to select device
      this.store.dispatch(mfaActions.selectDevice(device));

      // Get and show the verification view
      const view = this.app.getView(this.verificationViewId);
      if (view) {
        view.show({
          coordinator: this,
          device,
        });
      } else {
        // View not registered - log error and handle gracefully
        console.error(`MFA Verification view (${this.verificationViewId}) not found`);// eslint-disable-line
        this.handleError({
          message: 'MFA verification view not available. Please contact your administrator.',
        });
      }
    }

    /**
     * Handle successful MFA verification
     */
    handleVerificationSuccess() {
      // Dispatch Redux action to complete verification
      this.store.dispatch(mfaActions.completeVerification());

      // Reset session timeout counter on successful verification
      this.store.dispatch(mfaActions.resetSessionTimeouts());

      // Notify interceptor to retry original request (if there is one)
      if (this.interceptor) {
        // Check if there's an original request to retry
        if (this.interceptor.originalRequest) {
          this.interceptor.completeMFAFlow()
            .catch((error) => {
              // Handle retry failure
              console.error('Failed to retry original request after MFA:', error);// eslint-disable-line
              this.handleError({
                message: 'Failed to complete your request. Please try again.',
                error,
              });
            });
        } else {
          // No original request (e.g., MFA during login) - complete authentication flow
          this.interceptor.mfaInProgress = false;

          // Re-authenticate to set user context, then initialize app state
          // Use stored credentials from login attempt
          if (this.app && typeof this.app.authenticateUser === 'function') {
            this.app.authenticateUser(this.loginCredentials, {
              success: () => {
                // Clear stored credentials
                this.loginCredentials = null;

                // Now that user context is set, initialize app state
                if (typeof this.app.onHandleAuthenticationSuccess === 'function') {
                  // Override navigateToHomeView temporarily to clear all history
                  const originalNavigateToHomeView = this.app.navigateToHomeView;
                  this.app.navigateToHomeView = (options) => {
                    // Restore original method
                    this.app.navigateToHomeView = originalNavigateToHomeView;

                    // Clear all history so home view becomes the first entry
                    // This prevents back button from showing and going to login/MFA views
                    if (this.app.context && this.app.context.history) {
                      this.app.context.history = [];
                    }

                    // Call original method
                    originalNavigateToHomeView.call(this.app, options);
                  };

                  this.app.onHandleAuthenticationSuccess();
                }
              },
              failure: (result) => {
                console.error('Failed to complete authentication after MFA:', result);// eslint-disable-line
                this.loginCredentials = null;
                this.handleError({
                  message: 'Failed to complete authentication. Please try logging in again.',
                  sdataCode: 'AuthenticationFailed',
                });
              },
              scope: this,
            });
          } else {
            console.error('Unable to complete authentication flow');
          }
        }
      } else {
        console.error('MFA Interceptor not set on coordinator');
      }
    }

    /**
     * Handle MFA flow cancellation
     */
    handleCancel() {
      // Clear MFA state
      this.store.dispatch(mfaActions.clearMFAState());

      // Notify interceptor that flow was cancelled
      if (this.interceptor) {
        this.interceptor.cancelMFAFlow();
      }

      // Navigate back to login
      this.navigateToLogin();
    }

    /**
     * Handle MFA flow errors
     * @param {Object} error - Error object
     */
    handleError(error) {
      // Parse error message
      const errorMessage = error.message || 'An error occurred during MFA verification';
      const errorCode = error.sdataCode || error.errorCode || null;

      // Dispatch error to Redux state
      this.store.dispatch(mfaActions.setMFAError(errorMessage, errorCode));

      // Handle specific error types
      if (errorCode === 'SessionExpired' || errorCode === 'MfaSessionExpired') {
        this.handleSessionTimeout();
      } else if (errorCode === 'SetupNotAllowed') {
        // User already has devices - switch to verification flow
        this.showDeviceSelection();
      } else if (errorCode === 'InvalidDevice') {
        // Device no longer valid - refresh device list
        this.showDeviceSelection();
      } else {
        // For other errors, display error message
        // The view will handle displaying the error from Redux state
        console.error('MFA Error:', errorMessage, errorCode);
      }
    }

    /**
     * Handle session timeout during MFA flow
     * @private
     */
    handleSessionTimeout() {
      // Increment session timeout counter
      this.store.dispatch(mfaActions.incrementSessionTimeouts());

      // Get current timeout count from state
      const state = this.store.getState();
      const timeoutCount = state.mfa ? state.mfa.sessionTimeouts : 0;

      // Check if we've exceeded max retries
      if (timeoutCount >= this.MAX_SESSION_TIMEOUTS) {
        // Too many timeouts - return to login
        this.store.dispatch(mfaActions.setMFAError(
          'Your session has expired multiple times. Please log in again.',
          'MaxSessionTimeoutsExceeded',
        ));

        // Clear MFA state and return to login
        this.store.dispatch(mfaActions.clearMFAState());
        this.navigateToLogin();
      } else {
        // Allow retry - display error message
        this.store.dispatch(mfaActions.setMFAError(
          'Your session has expired. Please try again.',
          'SessionExpired',
        ));

        // The current view will remain visible and user can retry
      }
    }

    /**
     * Navigate to login view
     * @private
     */
    navigateToLogin() {
      // Use the application's navigateToLoginView method
      if (this.app && typeof this.app.navigateToLoginView === 'function') {
        this.app.navigateToLoginView();
      } else {
        // Fallback: try to get login view directly
        const loginView = this.app.getView(this.app.loginViewId || 'login');
        if (loginView) {
          loginView.show();
        } else {
          console.error('Unable to navigate to login view');
        }
      }
    }

    /**
     * Handle device setup completion
     * @param {string} deviceId - Created device ID
     * @param {string} deviceType - Device type ('AuthApp' or 'Email')
     * @param {Object} setupResponse - Full setup response
     */
    handleDeviceSetupComplete(deviceId, deviceType, setupResponse) {
      // Dispatch Redux action with setup data
      this.store.dispatch(mfaActions.completeDeviceSetup(
        deviceId,
        setupResponse.qrCodeData || null,
        setupResponse.secret || null,
      ));

      // For Email devices, proceed directly to verification
      // For AuthApp devices, the setup view will handle QR code display
      // and then call showVerification when user is ready
      if (deviceType === 'Email') {
        // Create a device object for verification
        const device = {
          deviceId,
          method: 2, // Email
          description: setupResponse.description || 'Email Device',
        };
        this.showVerification(device);
      }
    }

    /**
     * Get current MFA state from Redux
     * @returns {Object} Current MFA state
     */
    getMFAState() {
      const state = this.store.getState();
      return state.mfa || {};
    }
  }

  return MFACoordinator;
});
