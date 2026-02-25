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
 * @module crm/MFA/Views/Verification
 */
define('crm/MFA/Views/Verification', [
  'dojo/_base/declare',
  'argos/View',
  'argos/I18n',
  '../Service',
  '../actions/mfa',
], (declare, View, getResource, MFAService, mfaActions) => {
  const resource = getResource('mfaVerification');
  const errorResource = getResource('mfaErrors');

  /**
   * @class
   * @alias module:crm/MFA/Views/Verification
   * @classdesc Verification View accepts and verifies TOTP codes.
   * Supports both authenticator app and email-based MFA devices.
   */
  const __class = declare('crm.MFA.Views.Verification', [View], {
    // Templates
    widgetTemplate: new Simplate([
      '<div id="{%= $.id %}" data-title="{%: $.titleText %}" class="view mfa-verification">',
      '<div class="wrapper">',
      '<section class="signin mfa-panel" role="main">',
      '<h1>{%= $.titleText %}</h1>',
      '<p class="mfa-instructions" data-dojo-attach-point="instructionsNode"></p>',
      '<p class="mfa-device-label" data-dojo-attach-point="deviceLabelNode"></p>',
      '<div class="mfa-email-actions" data-dojo-attach-point="emailActionsNode" style="display: none;">',
      '<button data-dojo-attach-point="sendEmailButton" data-action="sendEmailCode" class="btn-secondary">',
      '{%= $.sendEmailButtonText %}',
      '</button>',
      '<p class="mfa-email-confirmation" data-dojo-attach-point="emailConfirmationNode" style="display: none;"></p>',
      '</div>',
      '<div class="mfa-code-input-section">',
      '<label for="{%= $.id %}_totp_code">{%= $.codeInputPlaceholderText %}</label>',
      '<input id="{%= $.id %}_totp_code" data-dojo-attach-point="codeInput" type="tel" ',
      'maxlength="8" pattern="[0-9]*" inputmode="numeric" ',
      'placeholder="{%= $.codeInputPlaceholderText %}" autocomplete="one-time-code" />',
      '</div>',
      '<p class="mfa-code-format-error" data-dojo-attach-point="codeFormatErrorNode" style="display: none;">{%= $.codeFormatErrorText %}</p>',
      '<div class="mfa-error-message" data-dojo-attach-point="errorNode" style="display: none;"></div>',
      '<div class="mfa-actions">',
      '<button data-dojo-attach-point="verifyButton" data-action="submitVerification" class="btn-primary" disabled>{%= $.verifyButtonText %}</button>',
      '<button data-dojo-attach-point="cancelButton" data-action="handleCancel" class="btn-secondary">{%= $.cancelText %}</button>',
      '</div>',
      '</section>',
      '</div>',
      '</div>',
    ]),

    // View configuration
    id: 'mfa_verification',
    titleText: resource.titleText,

    // Localization
    authAppInstructionsText: resource.authAppInstructionsText,
    emailInstructionsText: resource.emailInstructionsText,
    deviceLabelText: resource.deviceLabelText,
    codeInputPlaceholderText: resource.codeInputPlaceholderText,
    verifyButtonText: resource.verifyButtonText,
    sendEmailButtonText: resource.sendEmailButtonText,
    cancelText: resource.cancelText,
    emailSentText: resource.emailSentText,
    emailSentConfirmationText: resource.emailSentConfirmationText,
    rateLimitMessageText: resource.rateLimitMessageText,
    rateLimitCountdownText: resource.rateLimitCountdownText,
    codeFormatErrorText: resource.codeFormatErrorText,
    verifyingText: resource.verifyingText,
    invalidCodeText: errorResource.invalidCodeText,
    invalidDeviceText: errorResource.invalidDeviceText,
    rateLimitExceededText: errorResource.rateLimitExceededText,
    smtpErrorText: errorResource.smtpErrorText,
    networkErrorText: errorResource.networkErrorText,
    sessionExpiredText: errorResource.sessionExpiredText,

    // Internal state
    _device: null,
    _coordinator: null,
    _mfaService: null,
    _rateLimitTimer: null,
    _rateLimitSeconds: 0,

    /**
     * Initialize the view
     */
    postCreate: function postCreate() {
      this.inherited(postCreate, arguments);

      // Initialize MFA service
      const sdataService = this.app.getService();
      this._mfaService = new MFAService(sdataService);

      // Attach input event listener for real-time validation
      if (this.codeInput) {
        this.codeInput.addEventListener('input', this.onCodeInput.bind(this));
        this.codeInput.addEventListener('keypress', this._filterNonNumeric.bind(this));
        this.codeInput.addEventListener('keydown', this._handleKeyDown.bind(this));
        this.codeInput.addEventListener('paste', this._handlePaste.bind(this));
      }
    },

    /**
     * Show the view with options
     * @param {Object} options - View options
     * @param {Object} options.coordinator - MFA coordinator instance
     * @param {Object} options.device - Selected MFA device
     */
    show: function show(options) {
      this.inherited(show, arguments);

      if (options) {
        if (options.coordinator) {
          this._coordinator = options.coordinator;
        }
        if (options.device) {
          this.initialize(options.device);
        }
      }

      // Focus code input when view is shown
      if (this.codeInput) {
        setTimeout(() => {
          this.codeInput.focus();
        }, 100);
      }
    },

    /**
     * Initialize with selected device
     * @param {Object} device - MFA device to verify with
     */
    initialize: function initialize(device) {
      this._device = device;
      this._resetView();
      this._configureForDevice(device);
    },

    /**
     * Reset the view to initial state
     * @private
     */
    _resetView: function _resetView() {
      // Clear code input
      if (this.codeInput) {
        this.codeInput.value = '';
        this.codeInput.disabled = false;
      }

      // Disable verify button
      if (this.verifyButton) {
        this.verifyButton.disabled = true;
        this.verifyButton.textContent = this.verifyButtonText;
      }

      // Hide email actions
      if (this.emailActionsNode) {
        this.emailActionsNode.style.display = 'none';
      }

      // Hide email confirmation
      if (this.emailConfirmationNode) {
        this.emailConfirmationNode.style.display = 'none';
      }

      // Clear errors
      this._clearError();
      this._hideCodeFormatError();

      // Clear rate limit timer
      this._clearRateLimitTimer();

      // Re-enable send email button
      if (this.sendEmailButton) {
        this.sendEmailButton.disabled = false;
        this.sendEmailButton.textContent = this.sendEmailButtonText;
      }
    },

    /**
     * Configure the view based on device type
     * @param {Object} device - MFA device
     * @private
     */
    _configureForDevice: function _configureForDevice(device) {
      if (!device) {
        return;
      }

      // Set device label
      if (this.deviceLabelNode) {
        this.deviceLabelNode.textContent = `${this.deviceLabelText} ${device.description || ''}`;
      }

      // Set instructions based on device type
      if (this.instructionsNode) {
        if (device.method === 2) {
          this.instructionsNode.textContent = this.emailInstructionsText;
        } else {
          this.instructionsNode.textContent = this.authAppInstructionsText;
        }
      }

      // Show/hide email actions based on device type
      if (this.emailActionsNode) {
        this.emailActionsNode.style.display = device.method === 2 ? 'block' : 'none';
      }

      // Focus code input
      if (this.codeInput) {
        setTimeout(() => {
          this.codeInput.focus();
        }, 100);
      }
    },

    /**
     * Handle keydown events - submit on Enter
     * @param {Event} evt - Keydown event
     * @private
     */
    _handleKeyDown: function _handleKeyDown(evt) {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        if (this.verifyButton && !this.verifyButton.disabled) {
          this.submitVerification();
        }
      }
    },

    /**
     * Filter non-numeric characters on keypress
     * @param {Event} evt - Keypress event
     * @private
     */
    _filterNonNumeric: function _filterNonNumeric(evt) {
      // Allow control keys (backspace, tab, etc.)
      if (evt.ctrlKey || evt.metaKey || evt.key.length > 1) {
        return;
      }
      // Block non-numeric input
      if (!/^[0-9]$/.test(evt.key)) {
        evt.preventDefault();
      }
      // Block input if already at 8 digits
      if (this.codeInput && this.codeInput.value.length >= 8) {
        evt.preventDefault();
      }
    },

    /**
     * Handle paste events - filter to numeric only and limit to 8 digits
     * @param {Event} evt - Paste event
     * @private
     */
    _handlePaste: function _handlePaste(evt) {
      evt.preventDefault();
      const pastedText = (evt.clipboardData || window.clipboardData).getData('text');
      const numericOnly = pastedText.replace(/[^0-9]/g, '').substring(0, 8);
      if (this.codeInput) {
        this.codeInput.value = numericOnly;
        this.onCodeInput();
      }
    },

    /**
     * Handle TOTP code input - real-time validation
     */
    onCodeInput: function onCodeInput() {
      if (!this.codeInput) {
        return;
      }

      // Strip non-numeric characters
      const raw = this.codeInput.value;
      const cleaned = raw.replace(/[^0-9]/g, '').substring(0, 8);
      if (raw !== cleaned) {
        this.codeInput.value = cleaned;
      }

      const isValid = this.validateCodeFormat(cleaned);

      // Enable/disable verify button
      if (this.verifyButton) {
        this.verifyButton.disabled = !isValid;
      }

      // Show/hide format error
      if (cleaned.length > 0 && !isValid) {
        this._showCodeFormatError();
      } else {
        this._hideCodeFormatError();
      }
    },

    /**
     * Validate TOTP code format
     * @param {string} code - Code to validate
     * @returns {boolean} Whether code is valid format (6-8 numeric digits)
     */
    validateCodeFormat: function validateCodeFormat(code) {
      return /^[0-9]{6,8}$/.test(code);
    },

    /**
     * Send email TOTP code (for email devices)
     */
    sendEmailCode: function sendEmailCode() {
      if (!this._device || !this._device.deviceId) {
        return;
      }

      // Disable button during request
      if (this.sendEmailButton) {
        this.sendEmailButton.disabled = true;
      }

      this._clearError();

      this._mfaService.sendEmailCode(this._device.deviceId)
        .then((data) => {
          const response = data.response || data;
          if (response.sent) {
            // Show confirmation
            if (this.emailConfirmationNode) {
              this.emailConfirmationNode.textContent = this.emailSentConfirmationText;
              this.emailConfirmationNode.style.display = 'block';
            }
            // Start rate limit countdown
            this._startRateLimitCountdown(30);
          }
        })
        .catch((error) => {
          const parsedError = this._mfaService.parseMFAError(error);

          if (parsedError.sdataCode === 'RateLimitExceeded' || (error.status === 429)) {
            this._displayError(this.rateLimitExceededText);
            this._startRateLimitCountdown(30);
          } else if (parsedError.sdataCode === 'SmtpError' || parsedError.message.toLowerCase().includes('smtp')) {
            this._displayError(this.smtpErrorText);
            // Re-enable button so user can try another device
            if (this.sendEmailButton) {
              this.sendEmailButton.disabled = false;
            }
          } else {
            this._displayError(parsedError.message || this.networkErrorText);
            if (this.sendEmailButton) {
              this.sendEmailButton.disabled = false;
            }
          }
        });
    },

    /**
     * Submit TOTP code for verification
     */
    submitVerification: function submitVerification() {
      if (!this.codeInput || !this._device) {
        return;
      }

      const code = this.codeInput.value.trim();
      if (!this.validateCodeFormat(code)) {
        this._showCodeFormatError();
        return;
      }

      this._clearError();

      // Disable form during verification
      if (this.verifyButton) {
        this.verifyButton.disabled = true;
        this.verifyButton.textContent = this.verifyingText;
      }
      if (this.codeInput) {
        this.codeInput.disabled = true;
      }

      // Dispatch Redux action
      const store = this.app.store;
      if (store) {
        store.dispatch(mfaActions.startVerification());
      }

      this._mfaService.verifyCode(this._device.deviceId, code)
        .then((data) => {
          const response = data.response || data;
          if (response.verified) {
            this.handleVerificationSuccess();
          } else {
            this.handleVerificationError({ message: this.invalidCodeText, sdataCode: 'InvalidCode' });
          }
        })
        .catch((error) => {
          this.handleVerificationError(error);
        });
    },

    /**
     * Handle successful verification
     */
    handleVerificationSuccess: function handleVerificationSuccess() {
      if (this._coordinator) {
        this._coordinator.handleVerificationSuccess();
      }
    },

    /**
     * Handle verification errors
     * @param {Object} error - Error response
     */
    handleVerificationError: function handleVerificationError(error) {
      // Re-enable form
      if (this.verifyButton) {
        this.verifyButton.disabled = false;
        this.verifyButton.textContent = this.verifyButtonText;
      }
      if (this.codeInput) {
        this.codeInput.disabled = false;
        this.codeInput.value = '';
        this.codeInput.focus();
      }

      const parsedError = error.sdataCode ? error : this._mfaService.parseMFAError(error);

      if (parsedError.sdataCode === 'InvalidCode' || parsedError.sdataCode === 'ApplicationDiagnosis') {
        this._displayError(this.invalidCodeText);
      } else if (parsedError.sdataCode === 'InvalidDevice') {
        this._displayError(this.invalidDeviceText);
        // Notify coordinator to refresh device list
        if (this._coordinator) {
          this._coordinator.handleError(parsedError);
        }
      } else if (parsedError.sdataCode === 'SessionExpired' || parsedError.sdataCode === 'MfaSessionExpired') {
        this._displayError(this.sessionExpiredText);
        if (this._coordinator) {
          this._coordinator.handleError(parsedError);
        }
      } else {
        this._displayError(parsedError.message || this.networkErrorText);
      }
    },

    /**
     * Start rate limit countdown timer
     * @param {number} seconds - Seconds to count down
     * @private
     */
    _startRateLimitCountdown: function _startRateLimitCountdown(seconds) {
      this._clearRateLimitTimer();
      this._rateLimitSeconds = seconds;

      // Dispatch Redux action
      const store = this.app.store;
      if (store) {
        store.dispatch(mfaActions.setRateLimit(Date.now() + (seconds * 1000)));
      }

      if (this.sendEmailButton) {
        this.sendEmailButton.disabled = true;
      }

      this.updateRateLimitCountdown(this._rateLimitSeconds);

      this._rateLimitTimer = setInterval(() => {
        this._rateLimitSeconds -= 1;
        if (this._rateLimitSeconds <= 0) {
          this._clearRateLimitTimer();
          // Re-enable send button
          if (this.sendEmailButton) {
            this.sendEmailButton.disabled = false;
            this.sendEmailButton.textContent = this.sendEmailButtonText;
          }
          // Clear Redux rate limit
          if (store) {
            store.dispatch(mfaActions.clearRateLimit());
          }
        } else {
          this.updateRateLimitCountdown(this._rateLimitSeconds);
        }
      }, 1000);
    },

    /**
     * Update rate limit countdown display
     * @param {number} secondsRemaining - Seconds until next email allowed
     */
    updateRateLimitCountdown: function updateRateLimitCountdown(secondsRemaining) {
      if (this.sendEmailButton) {
        this.sendEmailButton.textContent = this.rateLimitCountdownText.replace('${0}', secondsRemaining);
      }
    },

    /**
     * Clear rate limit timer
     * @private
     */
    _clearRateLimitTimer: function _clearRateLimitTimer() {
      if (this._rateLimitTimer) {
        clearInterval(this._rateLimitTimer);
        this._rateLimitTimer = null;
      }
      this._rateLimitSeconds = 0;
    },

    /**
     * Handle cancel action
     */
    handleCancel: function handleCancel() {
      this._clearRateLimitTimer();
      if (this._coordinator) {
        this._coordinator.handleCancel();
      }
    },

    /**
     * Display error message
     * @param {string} message - Error message
     * @private
     */
    _displayError: function _displayError(message) {
      if (this.errorNode) {
        this.errorNode.textContent = message;
        this.errorNode.style.display = 'block';
      }
    },

    /**
     * Clear error message
     * @private
     */
    _clearError: function _clearError() {
      if (this.errorNode) {
        this.errorNode.textContent = '';
        this.errorNode.style.display = 'none';
      }
    },

    /**
     * Show code format error
     * @private
     */
    _showCodeFormatError: function _showCodeFormatError() {
      if (this.codeFormatErrorNode) {
        this.codeFormatErrorNode.style.display = 'block';
      }
    },

    /**
     * Hide code format error
     * @private
     */
    _hideCodeFormatError: function _hideCodeFormatError() {
      if (this.codeFormatErrorNode) {
        this.codeFormatErrorNode.style.display = 'none';
      }
    },

    /**
     * Create toolbar layout
     * @returns {Object} Toolbar layout
     */
    createToolLayout: function createToolLayout() {
      return this.tools || (this.tools = {
        bbar: false,
        tbar: false,
      });
    },

    /**
     * Cleanup on destroy
     */
    destroy: function destroy() {
      this._clearRateLimitTimer();
      this.inherited(destroy, arguments);
    },
  });

  return __class;
});
