/* Copyright 2017 Infor
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
 * @module crm/MFA/actions/mfa
 */
define('crm/MFA/actions/mfa', [], () => {
  // Action Types
  const START_MFA_FLOW = 'START_MFA_FLOW';
  const SET_FLOW_TYPE = 'SET_FLOW_TYPE';
  const STORE_ORIGINAL_REQUEST = 'STORE_ORIGINAL_REQUEST';
  const SET_DEVICES = 'SET_DEVICES';
  const SELECT_DEVICE = 'SELECT_DEVICE';
  const START_DEVICE_SETUP = 'START_DEVICE_SETUP';
  const COMPLETE_DEVICE_SETUP = 'COMPLETE_DEVICE_SETUP';
  const START_VERIFICATION = 'START_VERIFICATION';
  const COMPLETE_VERIFICATION = 'COMPLETE_VERIFICATION';
  const SET_MFA_ERROR = 'SET_MFA_ERROR';
  const CLEAR_MFA_ERROR = 'CLEAR_MFA_ERROR';
  const SET_RATE_LIMIT = 'SET_RATE_LIMIT';
  const CLEAR_RATE_LIMIT = 'CLEAR_RATE_LIMIT';
  const INCREMENT_SESSION_TIMEOUTS = 'INCREMENT_SESSION_TIMEOUTS';
  const RESET_SESSION_TIMEOUTS = 'RESET_SESSION_TIMEOUTS';
  const CLEAR_MFA_STATE = 'CLEAR_MFA_STATE';

  /**
   * Start MFA flow with device status
   * @param {boolean} hasDevices - Whether user has configured devices
   * @returns {Object} Redux action
   */
  function startMFAFlow(hasDevices) {
    return {
      type: START_MFA_FLOW,
      payload: {
        hasDevices,
      },
    };
  }

  /**
   * Set the current MFA flow type
   * @param {string} flowType - 'setup' | 'verification' | null
   * @returns {Object} Redux action
   */
  function setFlowType(flowType) {
    return {
      type: SET_FLOW_TYPE,
      payload: {
        flowType,
      },
    };
  }

  /**
   * Store original request for retry after MFA
   * @param {Object} request - Original request configuration
   * @returns {Object} Redux action
   */
  function storeOriginalRequest(request) {
    return {
      type: STORE_ORIGINAL_REQUEST,
      payload: {
        request,
      },
    };
  }

  /**
   * Set the list of user's MFA devices
   * @param {Array} devices - Array of MFA device objects
   * @returns {Object} Redux action
   */
  function setDevices(devices) {
    return {
      type: SET_DEVICES,
      payload: {
        devices,
      },
    };
  }

  /**
   * Select a device for verification
   * @param {Object} device - Selected MFA device
   * @returns {Object} Redux action
   */
  function selectDevice(device) {
    return {
      type: SELECT_DEVICE,
      payload: {
        device,
      },
    };
  }

  /**
   * Start device setup process
   * @returns {Object} Redux action
   */
  function startDeviceSetup() {
    return {
      type: START_DEVICE_SETUP,
    };
  }

  /**
   * Complete device setup with response data
   * @param {string} deviceId - Created device ID
   * @param {string} qrCodeData - Base64 QR code image (optional)
   * @param {string} secret - TOTP secret (optional)
   * @returns {Object} Redux action
   */
  function completeDeviceSetup(deviceId, qrCodeData = null, secret = null) {
    return {
      type: COMPLETE_DEVICE_SETUP,
      payload: {
        deviceId,
        qrCodeData,
        secret,
      },
    };
  }

  /**
   * Start verification process
   * @returns {Object} Redux action
   */
  function startVerification() {
    return {
      type: START_VERIFICATION,
    };
  }

  /**
   * Complete verification successfully
   * @returns {Object} Redux action
   */
  function completeVerification() {
    return {
      type: COMPLETE_VERIFICATION,
    };
  }

  /**
   * Set MFA error
   * @param {string} message - Error message
   * @param {string} errorCode - SData error code
   * @returns {Object} Redux action
   */
  function setMFAError(message, errorCode = null) {
    return {
      type: SET_MFA_ERROR,
      payload: {
        message,
        errorCode,
      },
    };
  }

  /**
   * Clear MFA error
   * @returns {Object} Redux action
   */
  function clearMFAError() {
    return {
      type: CLEAR_MFA_ERROR,
    };
  }

  /**
   * Set rate limit state
   * @param {number} expiryTimestamp - Timestamp when rate limit expires
   * @returns {Object} Redux action
   */
  function setRateLimit(expiryTimestamp) {
    return {
      type: SET_RATE_LIMIT,
      payload: {
        expiryTimestamp,
      },
    };
  }

  /**
   * Clear rate limit state
   * @returns {Object} Redux action
   */
  function clearRateLimit() {
    return {
      type: CLEAR_RATE_LIMIT,
    };
  }

  /**
   * Increment session timeout counter
   * @returns {Object} Redux action
   */
  function incrementSessionTimeouts() {
    return {
      type: INCREMENT_SESSION_TIMEOUTS,
    };
  }

  /**
   * Reset session timeout counter
   * @returns {Object} Redux action
   */
  function resetSessionTimeouts() {
    return {
      type: RESET_SESSION_TIMEOUTS,
    };
  }

  /**
   * Clear all MFA state
   * @returns {Object} Redux action
   */
  function clearMFAState() {
    return {
      type: CLEAR_MFA_STATE,
    };
  }

  return {
    // Action Types
    START_MFA_FLOW,
    SET_FLOW_TYPE,
    STORE_ORIGINAL_REQUEST,
    SET_DEVICES,
    SELECT_DEVICE,
    START_DEVICE_SETUP,
    COMPLETE_DEVICE_SETUP,
    START_VERIFICATION,
    COMPLETE_VERIFICATION,
    SET_MFA_ERROR,
    CLEAR_MFA_ERROR,
    SET_RATE_LIMIT,
    CLEAR_RATE_LIMIT,
    INCREMENT_SESSION_TIMEOUTS,
    RESET_SESSION_TIMEOUTS,
    CLEAR_MFA_STATE,

    // Action Creators
    startMFAFlow,
    setFlowType,
    storeOriginalRequest,
    setDevices,
    selectDevice,
    startDeviceSetup,
    completeDeviceSetup,
    startVerification,
    completeVerification,
    setMFAError,
    clearMFAError,
    setRateLimit,
    clearRateLimit,
    incrementSessionTimeouts,
    resetSessionTimeouts,
    clearMFAState,
  };
});
