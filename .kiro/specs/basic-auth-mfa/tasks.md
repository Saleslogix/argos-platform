# Implementation Plan: Multi-Factor Authentication for Argos Mobile

## Overview

This implementation plan breaks down the MFA feature into discrete, testable coding tasks. The implementation will use JavaScript with AMD module format, following the existing Argos SDK architecture patterns. Each task builds incrementally, with property-based tests integrated throughout to catch errors early.

The implementation follows this sequence:
1. Redux state management foundation
2. Core MFA service layer and interceptor
3. MFA coordinator for flow orchestration
4. Individual view implementations
5. Integration with Application and ApplicationModule
6. Localization strings

## Tasks

- [x] 1. Set up MFA module structure and Redux state management
  - Create directory structure: `products/argos-saleslogix/src/MFA/`
  - Create subdirectories: `Views/`, `actions/`, `reducers/`
  - Define Redux state shape in `reducers/mfa.js`
  - Implement Redux actions in `actions/mfa.js`
  - Implement Redux reducer in `reducers/mfa.js`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2_

- [ ]* 1.1 Write property tests for Redux state management
  - **Property 4: Cookie Persistence Round Trip**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  - **Property 28: Cookie Preservation Across App Lifecycle**
  - **Validates: Requirements 10.1, 10.2**
  - **Property 30: Logout Cookie Cleanup**
  - **Validates: Requirements 10.4**

- [ ] 2. Implement MFA Service Layer
  - [x] 2.1 Create MFA Service class in `Service.js`
    - Implement constructor accepting SData client
    - Implement `getDevices()` method (GET /slx/system/-/mfa/devices)
    - Implement `setupDevice(deviceName, deviceType)` method (POST /slx/system/-/mfa/setup)
    - Implement `verifyCode(deviceId, totpCode)` method (POST /slx/system/-/mfa/verify)
    - Implement `sendEmailCode(deviceId)` method (POST /slx/system/-/mfa/send-email)
    - Implement `parseMFAError(error)` method for error parsing
    - _Requirements: 3.4, 5.1, 6.3, 7.2_

  - [ ]* 2.2 Write property tests for MFA Service
    - **Property 6: Device Setup API Call Format**
    - **Validates: Requirements 3.4**
    - **Property 11: Device List API Call**
    - **Validates: Requirements 5.1, 5.2**
    - **Property 17: Verification API Call Format**
    - **Validates: Requirements 6.3**
    - **Property 22: Send Email API Call Format**
    - **Validates: Requirements 7.2**

- [ ] 3. Implement MFA Interceptor
  - [x] 3.1 Create MFA Interceptor class in `Interceptor.js`
    - Implement constructor accepting SData client and Redux store
    - Implement `handleResponse(response)` method
    - Implement `handleError(error)` method to detect MfaRequired
    - Implement `storeOriginalRequest(request)` method
    - Implement `retryOriginalRequest()` method
    - Extract hasDevices field from MfaRequired error response
    - Dispatch Redux actions to initiate MFA flow
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2_

  - [ ]* 3.2 Write property tests for MFA Interceptor
    - **Property 1: MFA Requirement Detection**
    - **Validates: Requirements 1.1, 1.2**
    - **Property 2: Missing hasDevices Defaults to False**
    - **Validates: Requirements 1.3**
    - **Property 18: Original Request Retry After Verification**
    - **Validates: Requirements 6.4, 9.1, 9.2, 9.3**
    - **Property 26: Repeated MFA Requirement Error**
    - **Validates: Requirements 9.4**
    - **Property 27: Non-MFA Error Propagation**
    - **Validates: Requirements 9.5**

- [ ] 4. Checkpoint - Ensure core infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement MFA Coordinator
  - [x] 5.1 Create MFA Coordinator class in `Coordinator.js`
    - Implement constructor accepting Application instance and Redux store
    - Implement `startMFAFlow(hasDevices)` method
    - Implement `showDeviceSetup()` method
    - Implement `showDeviceSelection()` method
    - Implement `showVerification(device)` method
    - Implement `handleVerificationSuccess()` method
    - Implement `handleCancel()` method
    - Implement `handleError(error)` method
    - Track retry attempts for session timeout handling
    - _Requirements: 1.4, 1.5, 2.5, 15.3_

  - [ ]* 5.2 Write property tests for MFA Coordinator
    - **Property 3: Flow Routing Based on Device Status**
    - **Validates: Requirements 1.4, 1.5**
    - **Property 5: Session Expiration Triggers Re-authentication**
    - **Validates: Requirements 2.5**
    - **Property 40: Consecutive Timeout Limit**
    - **Validates: Requirements 15.3, 15.5**

- [ ] 6. Implement QR Code Display Component
  - [x] 6.1 Create QR Code Display widget in `Views/QRCodeDisplay.js`
    - Extend argos.View
    - Implement `setQRCode(qrCodeData, secret)` method
    - Implement `toggleManualEntry()` method
    - Implement `copySecret()` method
    - Decode base64 QR code data and render PNG image
    - Render QR code at minimum 200x200 pixels
    - Display manual entry secret in copyable format
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.2 Write property tests for QR Code Display
    - **Property 10: QR Code Base64 Decoding**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 7. Implement Device Setup View
  - [x] 7.1 Create Device Setup View in `Views/DeviceSetup.js`
    - Extend argos.View
    - Implement `createLayout()` method with device type selection
    - Implement `onDeviceTypeSelect(deviceType)` method
    - Implement `submitSetup(deviceName, deviceType)` method
    - Implement `displayQRCode(setupResponse)` method
    - Implement `proceedToVerification(deviceId)` method
    - Implement `handleSetupError(error)` method
    - Integrate QRCodeDisplay component
    - Handle SetupNotAllowed error by switching to verification flow
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 12.1, 12.2, 12.3, 12.4_

  - [ ]* 7.2 Write property tests for Device Setup View
    - **Property 7: AuthApp Setup Response Handling**
    - **Validates: Requirements 3.5, 3.6**
    - **Property 8: Email Setup Flow Transition**
    - **Validates: Requirements 3.7**
    - **Property 9: SetupNotAllowed Error Recovery**
    - **Validates: Requirements 3.8, 8.5**
    - **Property 32: Email MFA Disabled Handling**
    - **Validates: Requirements 12.2**

- [ ] 8. Implement Device List View
  - [x] 8.1 Create Device List View in `Views/DeviceList.js`
    - Extend argos/_ListBase
    - Implement `requestData()` method to fetch devices
    - Implement `createItemTemplate(device)` method
    - Implement `onDeviceSelect(device)` method
    - Implement `handleNoDevices()` method
    - Sort devices with default device first
    - Display device type icons (app or email)
    - Show "Default" badge for default device
    - Auto-select if only one device exists
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 8.2 Write property tests for Device List View
    - **Property 12: Single Device Auto-Selection**
    - **Validates: Requirements 5.3**
    - **Property 13: Multiple Device Display**
    - **Validates: Requirements 5.4**
    - **Property 14: Empty Device List Routing**
    - **Validates: Requirements 5.5**
    - **Property 15: Default Device Indication**
    - **Validates: Requirements 5.6**
    - **Property 33: Device Description Display**
    - **Validates: Requirements 13.1**
    - **Property 34: Device Method Type Mapping**
    - **Validates: Requirements 13.2, 13.3**
    - **Property 35: Default Device Badge Display**
    - **Validates: Requirements 13.4**
    - **Property 36: Default Device Sorting**
    - **Validates: Requirements 13.5**

- [ ] 9. Checkpoint - Ensure view foundation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Verification View
  - [x] 10.1 Create Verification View in `Views/Verification.js`
    - Extend argos/_DetailBase
    - Implement `initialize(device)` method
    - Implement `createLayout()` method based on device type
    - Implement `sendEmailCode()` method
    - Implement `onCodeInput(code)` method
    - Implement `validateCodeFormat(code)` method
    - Implement `submitVerification(code)` method
    - Implement `handleVerificationSuccess()` method
    - Implement `handleVerificationError(error)` method
    - Implement `updateRateLimitCountdown(secondsRemaining)` method
    - Display "Send Email" button only for email devices (method === 2)
    - Validate TOTP code format (6 numeric digits)
    - Handle rate limiting with countdown timer
    - Display device-specific instructions
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.1, 11.2, 11.3, 11.4, 11.5, 14.3, 14.4, 14.5_

  - [ ]* 10.2 Write property tests for Verification View
    - **Property 16: TOTP Code Format Validation**
    - **Validates: Requirements 6.2, 6.7, 11.1, 11.2**
    - **Property 19: InvalidCode Error Handling**
    - **Validates: Requirements 6.5**
    - **Property 20: InvalidDevice Error Handling**
    - **Validates: Requirements 6.6**
    - **Property 21: Email Device Send Button Display**
    - **Validates: Requirements 7.1, 7.7**
    - **Property 23: Email Send Success Confirmation**
    - **Validates: Requirements 7.3**
    - **Property 24: Rate Limit Enforcement**
    - **Validates: Requirements 7.4, 7.6**
    - **Property 25: SMTP Error Handling**
    - **Validates: Requirements 7.5**
    - **Property 31: Submit Button State Based on Code Length**
    - **Validates: Requirements 11.3, 11.4, 11.5**
    - **Property 37: Device-Specific Instructions**
    - **Validates: Requirements 14.3**

- [ ] 11. Integrate MFA with Application
  - [x] 11.1 Register MFA views in ApplicationModule
    - Add MFA views to view registry in `ApplicationModule.js`
    - Register MFA reducer with Redux store
    - Initialize MFA interceptor with SData client
    - Initialize MFA coordinator with Application instance
    - _Requirements: All requirements (integration point)_

  - [x] 11.2 Wire MFA interceptor to SData client
    - Attach interceptor to SData client response/error handlers
    - Ensure cookie handling is preserved
    - Test interceptor activation on MfaRequired errors
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 11.3 Write integration tests for MFA flow
    - Test first-time setup flow (AuthApp)
    - Test first-time setup flow (Email)
    - Test returning user flow (single device)
    - Test returning user flow (multiple devices)
    - Test session persistence across API calls
    - Test session expiration and re-verification
    - _Requirements: All requirements (end-to-end validation)_

- [ ] 12. Add localization strings
  - [x] 12.1 Create MFA localization strings in locale l20n files.
    - Add view titles and labels
    - Add instruction text for each view
    - Add error messages for all error codes
    - Add button labels and confirmation messages
    - Add device type labels and descriptions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 12.1, 12.3, 12.4, 14.1, 14.2, 14.3, 14.4, 14.5, 15.4_

  - [x] 12.2 Update views to use localized strings
    - Replace hardcoded strings with L20n resource calls
    - Test string rendering in all views
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 13. Handle session timeout and error recovery
  - [x] 13.1 Implement session timeout handling in Coordinator
    - Track consecutive session timeouts
    - Preserve setup state during timeout
    - Allow verification retry after timeout
    - Return to login after 3 consecutive timeouts
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 13.2 Write property tests for session timeout handling
    - **Property 29: Expired Session Detection**
    - **Validates: Requirements 10.3**
    - **Property 38: Setup State Preservation During Timeout**
    - **Validates: Requirements 15.1**
    - **Property 39: Verification Retry After Timeout**
    - **Validates: Requirements 15.2**

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property-based tests
  - Run all integration tests
  - Verify no regressions in existing functionality
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flows
- The implementation uses JavaScript with AMD module format following Argos SDK patterns
- All views extend appropriate Argos base classes (_DetailBase, _ListBase)
- Redux state management follows existing Argos patterns
- Cookie handling leverages existing SData client functionality
- Localization uses L20n framework consistent with Argos SDK
