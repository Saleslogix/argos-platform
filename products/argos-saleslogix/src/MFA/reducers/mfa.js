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
 * @module crm/MFA/reducers/mfa
 */
define('crm/MFA/reducers/mfa', [
  '../actions/mfa',
], (mfaActions) => {
  const {
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
  } = mfaActions;

  const initialMFAState = {
    // Current MFA flow state
    isActive: false,
    flowType: null,
    hasDevices: false,

    // Device information
    devices: [],
    selectedDevice: null,

    // Setup state
    setupInProgress: false,
    setupDeviceId: null,
    qrCodeData: null,
    secret: null,

    // Verification state
    verificationInProgress: false,
    verificationAttempts: 0,

    // Rate limiting (for email)
    rateLimitActive: false,
    rateLimitExpiry: null,

    // Error state
    error: null,
    errorCode: null,

    // Original request (for retry)
    originalRequest: null,

    // Session timeout tracking
    sessionTimeouts: 0,
  };

  function mfa(state = initialMFAState, action) {
    const { type, payload } = action;

    switch (type) {
      case START_MFA_FLOW:
        return {
          ...state,
          isActive: true,
          hasDevices: payload.hasDevices,
          flowType: payload.hasDevices ? 'verification' : 'setup',
          error: null,
          errorCode: null,
        };

      case SET_FLOW_TYPE:
        return {
          ...state,
          flowType: payload.flowType,
        };

      case STORE_ORIGINAL_REQUEST:
        return {
          ...state,
          originalRequest: payload.request,
        };

      case SET_DEVICES:
        return {
          ...state,
          devices: payload.devices,
          hasDevices: payload.devices.length > 0,
        };

      case SELECT_DEVICE:
        return {
          ...state,
          selectedDevice: payload.device,
        };

      case START_DEVICE_SETUP:
        return {
          ...state,
          setupInProgress: true,
          error: null,
          errorCode: null,
        };

      case COMPLETE_DEVICE_SETUP:
        return {
          ...state,
          setupInProgress: false,
          setupDeviceId: payload.deviceId,
          qrCodeData: payload.qrCodeData,
          secret: payload.secret,
        };

      case START_VERIFICATION:
        return {
          ...state,
          verificationInProgress: true,
          verificationAttempts: state.verificationAttempts + 1,
          error: null,
          errorCode: null,
        };

      case COMPLETE_VERIFICATION:
        return {
          ...state,
          verificationInProgress: false,
          isActive: false,
          error: null,
          errorCode: null,
        };

      case SET_MFA_ERROR:
        return {
          ...state,
          error: payload.message,
          errorCode: payload.errorCode,
          setupInProgress: false,
          verificationInProgress: false,
        };

      case CLEAR_MFA_ERROR:
        return {
          ...state,
          error: null,
          errorCode: null,
        };

      case SET_RATE_LIMIT:
        return {
          ...state,
          rateLimitActive: true,
          rateLimitExpiry: payload.expiryTimestamp,
        };

      case CLEAR_RATE_LIMIT:
        return {
          ...state,
          rateLimitActive: false,
          rateLimitExpiry: null,
        };

      case INCREMENT_SESSION_TIMEOUTS:
        return {
          ...state,
          sessionTimeouts: state.sessionTimeouts + 1,
        };

      case RESET_SESSION_TIMEOUTS:
        return {
          ...state,
          sessionTimeouts: 0,
        };

      case CLEAR_MFA_STATE:
        return {
          ...initialMFAState,
        };

      default:
        return state;
    }
  }

  return {
    mfa,
  };
});
