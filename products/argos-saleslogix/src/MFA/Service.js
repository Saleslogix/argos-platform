/**
 * @module crm/MFA/Service
 */
define('crm/MFA/Service', [], () => {
  /**
   * @class
   * @alias module:crm/MFA/Service
   * @classdesc MFA Service handles communication with MFA endpoints via SData.
   *
   * All endpoints live under the nested resource path:
   *   /sdata/slx/system/-/mfa/devices
   *
   * $service operations (status, verify, sendEmail) use
   * SDataServiceOperationRequest with the standard request/response wrapper.
   *
   * Device creation and listing use resource collection/single requests
   * against the /mfa/devices resource.
   */
  class MFAService {
    /**
     * @param {Object} sdataService - The SData service instance
     */
    constructor(sdataService) {
      this.service = sdataService;
    }

    /**
     * Check MFA status for the current session.
     * POST /sdata/slx/system/-/mfa/devices/$service/status?format=json
     * @returns {Promise<Object>} { response: { mfaEnabled, mfaVerified, hasDevices } }
     */
    checkStatus() {
      return new Promise((resolve, reject) => {
        const request = new Sage.SData.Client.SDataServiceOperationRequest(this.service)
          .setContractName('system')
          .setResourceKind('mfa/devices')
          .setOperationName('status');

        request.execute({}, {
          success: data => resolve(data),
          failure: response => reject(response),
          scope: this,
        });
      });
    }

    /**
     * Get user's MFA devices.
     * GET /sdata/slx/system/-/mfa/devices?format=json
     * @returns {Promise<Object>} { $resources: [...] }
     */
    getDevices() {
      return new Promise((resolve, reject) => {
        const request = new Sage.SData.Client.SDataResourceCollectionRequest(this.service)
          .setContractName('system')
          .setResourceKind('mfa/devices');

        request.read({
          success: data => resolve(data),
          failure: response => reject(response),
          scope: this,
        });
      });
    }

    /**
     * Create a new MFA device (first-time setup).
     * POST /sdata/slx/system/-/mfa/devices?format=json
     * @param {string} deviceName - User-friendly name for the device
     * @param {string} deviceType - 'AuthApp' or 'Email'
     * @returns {Promise<Object>} Setup response (includes qrCodeData/secret for AuthApp)
     */
    setupDevice(deviceName, deviceType) {
      return new Promise((resolve, reject) => {
        const request = new Sage.SData.Client.SDataSingleResourceRequest(this.service)
          .setContractName('system')
          .setResourceKind('mfa/devices');

        const entry = {
          deviceName,
          deviceType,
        };

        request.create(entry, {
          success: data => resolve(data),
          failure: response => reject(response),
          scope: this,
        });
      });
    }

    /**
     * Verify a TOTP code.
     * POST /sdata/slx/system/-/mfa/devices/$service/verify?format=json
     * @param {string} deviceId - Device ID to verify against
     * @param {string} totpCode - 6-digit TOTP code
     * @returns {Promise<Object>} { response: { verified, message } }
     */
    verifyCode(deviceId, totpCode) {
      return new Promise((resolve, reject) => {
        const request = new Sage.SData.Client.SDataServiceOperationRequest(this.service)
          .setContractName('system')
          .setResourceKind('mfa/devices')
          .setOperationName('verify');

        const payload = {
          $name: 'verify',
          request: {
            deviceId,
            totpCode,
          },
        };

        request.execute(payload, {
          success: data => resolve(data),
          failure: response => reject(response),
          scope: this,
        });
      });
    }

    /**
     * Send a TOTP code via email.
     * POST /sdata/slx/system/-/mfa/devices/$service/sendEmail?format=json
     * @param {string} deviceId - Email-type device ID
     * @returns {Promise<Object>} { response: { sent, message } }
     */
    sendEmailCode(deviceId) {
      return new Promise((resolve, reject) => {
        const request = new Sage.SData.Client.SDataServiceOperationRequest(this.service)
          .setContractName('system')
          .setResourceKind('mfa/devices')
          .setOperationName('sendEmail');

        const payload = {
          $name: 'sendEmail',
          request: {
            deviceId,
          },
        };

        request.execute(payload, {
          success: data => resolve(data),
          failure: response => reject(response),
          scope: this,
        });
      });
    }

    /**
     * Parse MFA error from SData response.
     * The SData client passes the raw XHR object on failure,
     * so we need to JSON.parse the responseText. The server may
     * return either { $diagnoses: [...] } or a plain array [...].
     * @param {Object} error - XHR response or pre-parsed error object
     * @returns {Object} Parsed MFA error details
     */
    parseMFAError(error) {
      const parsedError = {
        sdataCode: null,
        message: 'An unknown error occurred',
        hasDevices: false,
      };

      let diagnoses = null;

      // If the error has responseText, it's a raw XHR object — parse it
      if (error && error.responseText) {
        try {
          const json = JSON.parse(error.responseText);
          if (Array.isArray(json)) {
            diagnoses = json;
          } else if (json && json.$diagnoses && Array.isArray(json.$diagnoses)) {
            diagnoses = json.$diagnoses;
          } else if (json && json.diagnoses && Array.isArray(json.diagnoses)) {
            diagnoses = json.diagnoses;
          }
        } catch (e) {
          // responseText was not valid JSON
        }
      } else if (error && error.$diagnoses && Array.isArray(error.$diagnoses)) {
        diagnoses = error.$diagnoses;
      } else if (Array.isArray(error)) {
        diagnoses = error;
      }

      if (diagnoses && diagnoses.length > 0) {
        const diagnosis = diagnoses[0];
        parsedError.sdataCode = diagnosis.sdataCode || null;
        parsedError.message = diagnosis.message || parsedError.message;

        if (Object.prototype.hasOwnProperty.call(diagnosis, 'hasDevices')) {
          parsedError.hasDevices = Boolean(diagnosis.hasDevices);
        }

        if (Object.prototype.hasOwnProperty.call(diagnosis, 'mfaRequired')) {
          parsedError.mfaRequired = Boolean(diagnosis.mfaRequired);
        }
      } else if (error && error.message) {
        parsedError.message = error.message;
      }

      // Carry over HTTP status if available
      if (error && error.status) {
        parsedError.status = error.status;
      }

      return parsedError;
    }
  }

  return MFAService;
});
