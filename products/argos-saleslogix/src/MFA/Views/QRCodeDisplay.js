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
 * @module crm/MFA/Views/QRCodeDisplay
 */
define('crm/MFA/Views/QRCodeDisplay', [
  'dojo/_base/declare',
  'argos/View',
  'argos/I18n',
], (declare, View, getResource) => {
  const resource = getResource('mfaQRCodeDisplay');

  /**
   * @class
   * @alias module:crm/MFA/Views/QRCodeDisplay
   * @classdesc QR Code Display widget for MFA device setup.
   * Displays a QR code for scanning with authenticator apps and provides
   * manual entry option for the TOTP secret.
   */
  const __class = declare('crm.MFA.Views.QRCodeDisplay', [View], {
    // Templates
    widgetTemplate: new Simplate([
      '<div id="{%= $.id %}" class="mfa-qr-code-display">',
      '<div class="qr-code-container">',
      '<p class="mfa-instructions">{%= $.instructionsText %}</p>',
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
      '</div>',
    ]),

    // Localization
    instructionsText: resource.instructionsText,
    qrCodeAltText: resource.qrCodeAltText,
    showManualEntryText: resource.showManualEntryText,
    hideManualEntryText: resource.hideManualEntryText,
    manualEntryInstructionsText: resource.manualEntryInstructionsText,
    copySecretText: resource.copySecretText,
    copiedText: resource.copiedText,

    // View properties
    id: 'mfa_qr_code_display',
    titleText: resource.titleText,

    // Internal state
    _qrCodeData: null,
    _secret: null,
    _manualEntryVisible: false,

    /**
     * Set the QR code data and secret for display
     * @param {string} qrCodeData - Base64-encoded PNG image data
     * @param {string} secret - TOTP secret for manual entry
     */
    setQRCode: function setQRCode(qrCodeData, secret) {
      this._qrCodeData = qrCodeData;
      this._secret = secret;

      // Decode and render the QR code image
      if (this.qrCodeImageNode && qrCodeData) {
        // The qrCodeData should be a base64-encoded PNG
        // If it doesn't have the data URI prefix, add it
        let imageData = qrCodeData;
        if (!qrCodeData.startsWith('data:')) {
          imageData = `data:image/png;base64,${qrCodeData}`;
        }

        this.qrCodeImageNode.src = imageData;
        // Set minimum size of 200x200 pixels as per requirements
        this.qrCodeImageNode.style.minWidth = '200px';
        this.qrCodeImageNode.style.minHeight = '200px';
        this.qrCodeImageNode.style.width = '200px';
        this.qrCodeImageNode.style.height = '200px';
      }

      // Set the secret in the input field
      if (this.secretInputNode && secret) {
        this.secretInputNode.value = secret;
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
     * Copy the secret to the clipboard
     */
    copySecret: function copySecret() {
      if (!this.secretInputNode || !this._secret) {
        return;
      }

      // Select the text in the input field
      this.secretInputNode.select();
      this.secretInputNode.setSelectionRange(0, 99999); // For mobile devices

      try {
        // Copy to clipboard using the modern Clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(this._secret).then(() => {
            this._showCopyFeedback();
          }).catch(() => {
            // Fallback to execCommand if clipboard API fails
            this._fallbackCopy();
          });
        } else {
          // Fallback for older browsers
          this._fallbackCopy();
        }
      } catch (err) {
        // Silent fail - copy operation is not critical
      }
    },

    /**
     * Fallback copy method using execCommand
     * @private
     */
    _fallbackCopy: function _fallbackCopy() {
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          this._showCopyFeedback();
        }
      } catch (err) {
        // Silent fail - copy operation is not critical
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

        // Reset after 2 seconds
        setTimeout(() => {
          this.copySecretNode.textContent = originalText;
          this.copySecretNode.disabled = false;
        }, 2000);
      }
    },

    /**
     * Get the current QR code data
     * @return {string} Base64-encoded QR code data
     */
    getQRCodeData: function getQRCodeData() {
      return this._qrCodeData;
    },

    /**
     * Get the current secret
     * @return {string} TOTP secret
     */
    getSecret: function getSecret() {
      return this._secret;
    },

    /**
     * Clear the QR code and secret data
     */
    clear: function clear() {
      this._qrCodeData = null;
      this._secret = null;
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
    },
  });

  return __class;
});
