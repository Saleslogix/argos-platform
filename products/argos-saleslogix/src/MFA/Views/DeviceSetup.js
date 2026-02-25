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
 * @module crm/MFA/Views/DeviceSetup
 */
define('crm/MFA/Views/DeviceSetup', [
  'dojo/_base/declare',
  'argos/View',
  'argos/I18n',
  '../Service',
  '../actions/mfa',
], (declare, View, getResource, MFAService, mfaActions) => {
  const resource = getResource('mfaDeviceSetup');
  const errorResource = getResource('mfaErrors');
  const validationResource = getResource('mfaValidation');
  const qrResource = getResource('mfaQRCodeDisplay');

  /**
   * @class
   * @alias module:crm/MFA/Views/DeviceSetup
   * @classdesc Device Setup View guides users through first-time MFA device registration.
   * Supports both Authenticator App and Email device types.
   */
  const __class = declare('crm.MFA.Views.DeviceSetup', [View], {
    // Templates
    widgetTemplate: new Simplate([
      '<div id="{%= $.id %}" data-title="{%: $.titleText %}" class="view mfa-device-setup">',
      '<div class="wrapper">',
      '<section class="signin mfa-panel" role="main">',
      '<h1>{%= $.titleText %}</h1>',
      '<p class="mfa-instructions">{%= $.instructionsText %}</p>',
      '<div class="mfa-setup-form" data-dojo-attach-point="formNode">',
      '<div class="mfa-device-type-selection">',
      '<p class="mfa-section-label">{%= $.deviceTypeLabel %}</p>',
      '<div class="device-type-options">',
      '<button data-dojo-attach-point="authAppButton" data-action="selectAuthApp" class="device-type-button">',
      '<span class="device-type-icon"><svg class="icon" focusable="false" aria-hidden="true" role="presentation"><use xlink:href="#icon-phone"></use></svg></span>',
      '<span class="device-type-info"><span class="device-type-name">{%= $.authAppText %}</span>',
      '<span class="device-type-description">{%= $.authAppDescriptionText %}</span></span>',
      '</button>',
      '<button data-dojo-attach-point="emailButton" data-action="selectEmail" class="device-type-button">',
      '<span class="device-type-icon"><svg class="icon" focusable="false" aria-hidden="true" role="presentation"><use xlink:href="#icon-mail"></use></svg></span>',
      '<span class="device-type-info"><span class="device-type-name">{%= $.emailText %}</span>',
      '<span class="device-type-description">{%= $.emailDescriptionText %}</span></span>',
      '</button>',
      '</div>',
      '</div>',
      '<div class="mfa-device-name-field" data-dojo-attach-point="deviceNameFieldNode" style="display: none;">',
      '<label for="{%= $.id %}_device_name">{%= $.deviceNameLabel %}</label>',
      '<input id="{%= $.id %}_device_name" data-dojo-attach-point="deviceNameInput" type="text" placeholder="{%= $.deviceNamePlaceholder %}" />',
      '</div>',
      '<div class="mfa-actions" data-dojo-attach-point="actionsNode" style="display: none;">',
      '<button data-dojo-attach-point="continueButton" data-action="submitSetup" class="btn-primary">{%= $.continueText %}</button>',
      '<button data-dojo-attach-point="cancelButton" data-action="handleCancel" class="btn-secondary">{%= $.cancelText %}</button>',
      '</div>',
      '</div>',
      '<div class="mfa-qr-code-section" data-dojo-attach-point="qrCodeSectionNode" style="display: none;">',
      '<div class="qr-code-container">',
      '<p class="mfa-instructions">{%= $.qrInstructionsText %}</p>',
      '<div class="qr-code-image-wrapper">',
      '<img data-dojo-attach-point="qrCodeImageNode" class="qr-code-image" alt="{%= $.qrCodeAltText %}" />',
      '</div>',
      '<div class="qr-code-toggle">',
      '<button data-dojo-attach-point="toggleManualEntryNode" data-action="toggleManualEntry" class="btn-secondary">',
      '{%= $.showManualEntryText %}',
      '</button>',
      '</div>',
      '<div data-dojo-attach-point="manualEntryNode" class="manual-entry-section" style="display: none;">',
      '<p class="mfa-instructions">{%= $.manualEntryInstructionsText %}</p>',
      '<div class="manual-entry-secret">',
      '<input data-dojo-attach-point="secretInputNode" type="text" readonly class="secret-input" />',
      '<button data-dojo-attach-point="copySecretNode" data-action="copySecret" class="btn-secondary">',
      '{%= $.copySecretText %}',
      '</button>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="mfa-actions">',
      '<button data-dojo-attach-point="proceedButton" data-action="proceedToVerification" class="btn-primary">{%= $.proceedToVerificationText %}</button>',
      '<button data-dojo-attach-point="cancelQRButton" data-action="handleCancel" class="btn-secondary">{%= $.cancelText %}</button>',
      '</div>',
      '</div>',
      '<div class="mfa-error-message" data-dojo-attach-point="errorNode" style="display: none;"></div>',
      '</section>',
      '</div>',
      '</div>',
    ]),

    // Localization
    id: 'mfa_device_setup',
    titleText: resource.titleText,
    instructionsText: resource.introText,
    deviceTypeLabel: resource.chooseMethodText,
    authAppText: resource.deviceTypeAuthAppText,
    authAppDescriptionText: resource.deviceTypeAuthAppDescText,
    emailText: resource.deviceTypeEmailText,
    emailDescriptionText: resource.deviceTypeEmailDescText,
    deviceNameLabel: resource.deviceNameText,
    deviceNamePlaceholder: resource.deviceNamePlaceholderText,
    continueText: resource.continueText,
    cancelText: resource.cancelText,
    proceedToVerificationText: resource.proceedToVerificationText,
    qrInstructionsText: qrResource.instructionsText,
    qrCodeAltText: qrResource.qrCodeAltText,
    showManualEntryText: qrResource.showManualEntryText,
    hideManualEntryText: qrResource.hideManualEntryText,
    manualEntryInstructionsText: qrResource.manualEntryInstructionsText,
    copySecretText: qrResource.copySecretText,
    copiedText: qrResource.copiedText,
    invalidDeviceTypeText: errorResource.invalidDeviceTypeText,
    emailMfaDisabledText: errorResource.emailMfaDisabledText,
    networkErrorText: errorResource.networkErrorText,
    setupNotAllowedText: errorResource.setupNotAllowedText,
    deviceNameRequiredText: validationResource.deviceNameRequiredText,

    // Internal state
    _selectedDeviceType: null,
    _coordinator: null,
    _mfaService: null,
    _setupDeviceId: null,
    _emailMfaDisabled: false,
    _manualEntryVisible: false,

    /**
     * Initialize the view
     */
    postCreate: function postCreate() {
      this.inherited(postCreate, arguments);

      // Initialize MFA service
      const sdataService = this.app.getService();
      this._mfaService = new MFAService(sdataService);

      // Attach Enter key handler to device name input
      if (this.deviceNameInput) {
        this.deviceNameInput.addEventListener('keydown', this._handleKeyDown.bind(this));
      }
    },

    /**
     * Show the view with options
     * @param {Object} options - View options
     * @param {Object} options.coordinator - MFA coordinator instance
     */
    show: function show(options) {
      this.inherited(show, arguments);

      // Store coordinator reference
      if (options && options.coordinator) {
        this._coordinator = options.coordinator;
      }

      // Reset view state
      this._resetView();

      // Check if email MFA is disabled from Redux state
      const mfaState = this._coordinator ? this._coordinator.getMFAState() : {};
      if (mfaState.emailMfaDisabled) {
        this._emailMfaDisabled = true;
        this._hideEmailOption();
      }
    },

    /**
     * Reset the view to initial state
     * @private
     */
    _resetView: function _resetView() {
      this._selectedDeviceType = null;
      this._setupDeviceId = null;

      // Reset form visibility
      if (this.formNode) {
        this.formNode.style.display = 'block';
      }
      if (this.deviceNameFieldNode) {
        this.deviceNameFieldNode.style.display = 'none';
      }
      if (this.actionsNode) {
        this.actionsNode.style.display = 'none';
      }
      if (this.qrCodeSectionNode) {
        this.qrCodeSectionNode.style.display = 'none';
      }

      // Clear inline QR code display
      this._manualEntryVisible = false;
      if (this.qrCodeImageNode) {
        this.qrCodeImageNode.src = '';
      }
      if (this.secretInputNode) {
        this.secretInputNode.value = '';
      }
      if (this.manualEntryNode) {
        this.manualEntryNode.style.display = 'none';
      }
      if (this.toggleManualEntryNode) {
        this.toggleManualEntryNode.textContent = this.showManualEntryText;
      }

      // Clear device name input
      if (this.deviceNameInput) {
        this.deviceNameInput.value = '';
      }

      // Clear error
      this._clearError();

      // Reset button states
      if (this.authAppButton) {
        this.authAppButton.classList.remove('selected');
      }
      if (this.emailButton) {
        this.emailButton.classList.remove('selected');
      }
    },

    /**
     * Hide email option when email MFA is disabled
     * @private
     */
    _hideEmailOption: function _hideEmailOption() {
      if (this.emailButton) {
        this.emailButton.style.display = 'none';
      }
      this._displayError(this.emailMfaDisabledText);
    },

    /**
     * Handle Authenticator App selection
     */
    selectAuthApp: function selectAuthApp() {
      this.onDeviceTypeSelect('AuthApp');
    },

    /**
     * Handle Email selection
     */
    selectEmail: function selectEmail() {
      if (this._emailMfaDisabled) {
        this._displayError(this.emailMfaDisabledText);
        return;
      }
      this.onDeviceTypeSelect('Email');
    },

    /**
     * Handle device type selection
     * @param {string} deviceType - 'AuthApp' or 'Email'
     */
    onDeviceTypeSelect: function onDeviceTypeSelect(deviceType) {
      this._selectedDeviceType = deviceType;
      this._clearError();

      // Update button states
      if (this.authAppButton) {
        if (deviceType === 'AuthApp') {
          this.authAppButton.classList.add('selected');
        } else {
          this.authAppButton.classList.remove('selected');
        }
      }
      if (this.emailButton) {
        if (deviceType === 'Email') {
          this.emailButton.classList.add('selected');
        } else {
          this.emailButton.classList.remove('selected');
        }
      }

      // Show device name field and actions
      if (this.deviceNameFieldNode) {
        this.deviceNameFieldNode.style.display = 'block';
      }
      if (this.actionsNode) {
        this.actionsNode.style.display = 'block';
      }

      // Focus on device name input
      if (this.deviceNameInput) {
        this.deviceNameInput.focus();
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
        if (this.continueButton && !this.continueButton.disabled) {
          this.submitSetup();
        }
      }
    },

    /**
     * Submit device setup request
     */
    submitSetup: function submitSetup() {
      // Validate device type selection
      if (!this._selectedDeviceType) {
        this._displayError(this.invalidDeviceTypeText);
        return;
      }

      // Validate device name
      const deviceName = this.deviceNameInput ? this.deviceNameInput.value.trim() : '';
      if (!deviceName) {
        this._displayError(this.deviceNameRequiredText);
        return;
      }

      // Clear any previous errors
      this._clearError();

      // Disable form during submission
      this._disableForm();

      // Call MFA service to setup device
      this._mfaService.setupDevice(deviceName, this._selectedDeviceType)
        .then((response) => {
          this._handleSetupSuccess(response);
        })
        .catch((error) => {
          this.handleSetupError(error);
        });
    },

    /**
     * Handle successful device setup
     * @param {Object} setupResponse - Response from setup endpoint
     * @private
     */
    _handleSetupSuccess: function _handleSetupSuccess(setupResponse) {
      // Re-enable form
      this._enableForm();

      // Store device ID
      this._setupDeviceId = setupResponse.deviceId || setupResponse.$key;

      // Notify coordinator of setup completion
      if (this._coordinator) {
        this._coordinator.handleDeviceSetupComplete(
          this._setupDeviceId,
          this._selectedDeviceType,
          setupResponse,
        );
      }

      // Handle based on device type
      if (this._selectedDeviceType === 'AuthApp') {
        // Display QR code for AuthApp
        this.displayQRCode(setupResponse);
      } else if (this._selectedDeviceType === 'Email') {
        // For Email, proceed directly to verification
        // The coordinator will handle showing the verification view
        // No need to do anything here as coordinator already called showVerification
      }
    },

    /**
     * Display QR code for authenticator app setup
     * @param {Object} setupResponse - Response from setup endpoint
     */
    displayQRCode: function displayQRCode(setupResponse) {
      // Hide the form
      if (this.formNode) {
        this.formNode.style.display = 'none';
      }

      // Show QR code section
      if (this.qrCodeSectionNode) {
        this.qrCodeSectionNode.style.display = 'block';
      }

      // Render the QR code image
      if (this.qrCodeImageNode && setupResponse.qrCodeData) {
        let imageData = setupResponse.qrCodeData;
        if (!imageData.startsWith('data:')) {
          imageData = `data:image/png;base64,${imageData}`;
        }
        this.qrCodeImageNode.src = imageData;
        this.qrCodeImageNode.style.width = '200px';
        this.qrCodeImageNode.style.height = '200px';
      }

      // Set the secret for manual entry
      if (this.secretInputNode && setupResponse.secret) {
        this.secretInputNode.value = setupResponse.secret;
      }
    },

    /**
     * Proceed to verification after QR code display
     */
    proceedToVerification: function proceedToVerification() {
      if (!this._setupDeviceId) {
        // No device ID available - this shouldn't happen in normal flow
        return;
      }

      // Create a device object for verification
      const device = {
        deviceId: this._setupDeviceId,
        method: 1, // AuthApp
        description: this.deviceNameInput ? this.deviceNameInput.value.trim() : 'Authenticator App',
      };

      // Navigate to verification view via coordinator
      if (this._coordinator) {
        this._coordinator.showVerification(device);
      }
    },

    /**
     * Toggle the visibility of the manual entry section
     */
    toggleManualEntry: function toggleManualEntry() {
      this._manualEntryVisible = !this._manualEntryVisible;

      if (this.manualEntryNode) {
        this.manualEntryNode.style.display = this._manualEntryVisible ? 'block' : 'none';
      }

      if (this.toggleManualEntryNode) {
        this.toggleManualEntryNode.textContent = this._manualEntryVisible
          ? this.hideManualEntryText
          : this.showManualEntryText;
      }
    },

    /**
     * Copy the TOTP secret to the clipboard
     */
    copySecret: function copySecret() {
      const secret = this.secretInputNode ? this.secretInputNode.value : '';
      if (!secret) {
        return;
      }

      if (this.secretInputNode) {
        this.secretInputNode.select();
        this.secretInputNode.setSelectionRange(0, 99999);
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(secret).then(() => {
            this._showCopyFeedback();
          }).catch(() => {
            this._fallbackCopy();
          });
        } else {
          this._fallbackCopy();
        }
      } catch (err) {
        // Silent fail
      }
    },

    /**
     * Fallback copy using execCommand
     * @private
     */
    _fallbackCopy: function _fallbackCopy() {
      try {
        if (document.execCommand('copy')) {
          this._showCopyFeedback();
        }
      } catch (err) {
        // Silent fail
      }
    },

    /**
     * Show visual feedback that the secret was copied
     * @private
     */
    _showCopyFeedback: function _showCopyFeedback() {
      if (this.copySecretNode) {
        const originalText = this.copySecretNode.textContent;
        this.copySecretNode.textContent = this.copiedText;
        this.copySecretNode.disabled = true;

        setTimeout(() => {
          this.copySecretNode.textContent = originalText;
          this.copySecretNode.disabled = false;
        }, 2000);
      }
    },

    /**
     * Handle setup errors
     * @param {Object} error - Error response
     */
    handleSetupError: function handleSetupError(error) {
      // Re-enable form
      this._enableForm();

      // Parse error using MFA service
      const parsedError = this._mfaService.parseMFAError(error);

      // Handle specific error codes
      if (parsedError.sdataCode === 'SetupNotAllowed') {
        // User already has devices - switch to verification flow
        this._displayError(this.setupNotAllowedText);

        // Notify coordinator to switch to verification flow
        if (this._coordinator) {
          // Dispatch Redux action to switch flow
          const store = this.app.store;
          if (store) {
            store.dispatch(mfaActions.setFlowType('verification'));
          }

          // Show device selection
          this._coordinator.showDeviceSelection();
        }
      } else if (parsedError.sdataCode === 'InvalidDeviceType') {
        this._displayError(this.invalidDeviceTypeText);
      } else if (parsedError.message && parsedError.message.toLowerCase().includes('email')) {
        // Email MFA is disabled
        this._emailMfaDisabled = true;
        this._hideEmailOption();
      } else if (!error.xhr && !error.response) {
        // Network error
        this._displayError(this.networkErrorText);
      } else {
        // Generic error
        this._displayError(parsedError.message || this.networkErrorText);
      }
    },

    /**
     * Handle cancel action
     */
    handleCancel: function handleCancel() {
      if (this._coordinator) {
        this._coordinator.handleCancel();
      }
    },

    /**
     * Display error message
     * @param {string} message - Error message to display
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
     * Disable form inputs during submission
     * @private
     */
    _disableForm: function _disableForm() {
      if (this.authAppButton) {
        this.authAppButton.disabled = true;
      }
      if (this.emailButton) {
        this.emailButton.disabled = true;
      }
      if (this.deviceNameInput) {
        this.deviceNameInput.disabled = true;
      }
      if (this.continueButton) {
        this.continueButton.disabled = true;
      }
    },

    /**
     * Enable form inputs after submission
     * @private
     */
    _enableForm: function _enableForm() {
      if (this.authAppButton) {
        this.authAppButton.disabled = false;
      }
      if (this.emailButton) {
        this.emailButton.disabled = false;
      }
      if (this.deviceNameInput) {
        this.deviceNameInput.disabled = false;
      }
      if (this.continueButton) {
        this.continueButton.disabled = false;
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
  });

  return __class;
});
