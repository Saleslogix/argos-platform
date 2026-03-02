# Requirements Document

## Introduction

This document specifies the requirements for implementing Multi-Factor Authentication (MFA) support in the Argos mobile application for basic authentication flows. The SData platform has already implemented MFA endpoints, and the mobile application needs to handle MFA challenges, device setup, and TOTP verification to maintain secure access to protected resources.

## Glossary

- **MFA_Handler**: The component responsible for detecting MFA requirements and orchestrating the verification flow
- **Device_Setup_View**: The UI view for first-time MFA device registration
- **Verification_View**: The UI view for entering and verifying TOTP codes
- **Device_Selector_View**: The UI view for selecting which MFA device to use
- **SData_Client**: The HTTP client that communicates with the SData API endpoints
- **Session_Manager**: The component responsible for maintaining session cookies across requests
- **TOTP_Code**: Time-based One-Time Password, a 6-digit numeric code
- **QR_Code_Display**: The UI component that renders QR codes for authenticator app enrollment
- **MFA_Device**: A registered authentication method (authenticator app or email)
- **Authentication_Flow**: The sequence of operations from login through MFA verification to resource access

## Requirements

### Requirement 1: Detect MFA Requirement

**User Story:** As a mobile user, I want the application to automatically detect when MFA is required, so that I can complete verification without encountering unexpected errors.

#### Acceptance Criteria

1. WHEN THE SData_Client receives a 401 response with sdataCode "MfaRequired", THE MFA_Handler SHALL intercept the error
2. WHEN THE MFA_Handler intercepts an MfaRequired error, THE MFA_Handler SHALL extract the hasDevices field from the error response
3. IF the hasDevices field is missing or malformed, THEN THE MFA_Handler SHALL treat it as false
4. WHEN THE MFA_Handler determines hasDevices is false, THE MFA_Handler SHALL initiate the device setup flow
5. WHEN THE MFA_Handler determines hasDevices is true, THE MFA_Handler SHALL initiate the verification flow

### Requirement 2: Maintain Session State

**User Story:** As a mobile user, I want my MFA verification to persist across API calls, so that I don't have to re-verify for every request.

#### Acceptance Criteria

1. THE Session_Manager SHALL accept and store cookies from all SData API responses
2. THE Session_Manager SHALL include stored cookies in all subsequent SData API requests
3. WHEN THE Session_Manager receives a Set-Cookie header, THE Session_Manager SHALL update the stored cookie value
4. WHEN THE SData_Client makes any API request, THE SData_Client SHALL include session cookies from the Session_Manager
5. WHEN a session expires and returns MfaRequired, THE MFA_Handler SHALL re-initiate the authentication flow

### Requirement 3: Setup First MFA Device

**User Story:** As a first-time MFA user, I want to register my authentication device, so that I can secure my account.

#### Acceptance Criteria

1. WHEN the device setup flow is initiated, THE Device_Setup_View SHALL display device type options (Authenticator App and Email)
2. WHEN the user selects Authenticator App, THE Device_Setup_View SHALL prompt for a device name
3. WHEN the user selects Email, THE Device_Setup_View SHALL prompt for a device name
4. WHEN the user submits the device name, THE SData_Client SHALL POST to /slx/system/-/mfa/setup with deviceName and deviceType
5. WHEN THE SData_Client receives a successful setup response for AuthApp, THE Device_Setup_View SHALL display the QR code from qrCodeData
6. WHEN THE SData_Client receives a successful setup response for AuthApp, THE Device_Setup_View SHALL display the secret for manual entry
7. WHEN THE SData_Client receives a successful setup response for Email, THE Device_Setup_View SHALL proceed directly to verification
8. WHEN the setup request fails with SetupNotAllowed, THE MFA_Handler SHALL switch to the verification flow for existing devices

### Requirement 4: Display QR Code for Authenticator Apps

**User Story:** As a mobile user setting up an authenticator app, I want to scan a QR code, so that I can quickly configure my device.

#### Acceptance Criteria

1. WHEN THE QR_Code_Display receives qrCodeData in base64 format, THE QR_Code_Display SHALL decode and render the PNG image
2. THE QR_Code_Display SHALL display the QR code at a minimum size of 200x200 pixels
3. THE QR_Code_Display SHALL provide a button to view the manual entry secret
4. WHEN the user taps the manual entry button, THE Device_Setup_View SHALL display the secret in a copyable text field
5. THE Device_Setup_View SHALL display instructions for scanning the QR code with common authenticator apps

### Requirement 5: Retrieve User's MFA Devices

**User Story:** As a returning MFA user, I want to see my registered devices, so that I can choose how to authenticate.

#### Acceptance Criteria

1. WHEN the verification flow is initiated, THE SData_Client SHALL GET /slx/system/-/mfa/devices
2. WHEN THE SData_Client receives the devices response, THE MFA_Handler SHALL parse the $resources array
3. WHEN the $resources array contains one device, THE MFA_Handler SHALL automatically select that device
4. WHEN the $resources array contains multiple devices, THE Device_Selector_View SHALL display all devices with their descriptions
5. WHEN the $resources array is empty, THE MFA_Handler SHALL initiate the device setup flow
6. THE Device_Selector_View SHALL indicate which device is the default device using the isDefault field

### Requirement 6: Verify TOTP Code

**User Story:** As a mobile user, I want to enter my TOTP code, so that I can complete MFA verification and access the application.

#### Acceptance Criteria

1. WHEN a device is selected, THE Verification_View SHALL display an input field for a 6-digit TOTP code
2. THE Verification_View SHALL validate that the entered code contains exactly 6 numeric digits before submission
3. WHEN the user submits a valid TOTP code, THE SData_Client SHALL POST to /slx/system/-/mfa/verify with deviceId and totpCode
4. WHEN THE SData_Client receives verified: true, THE MFA_Handler SHALL retry the original failed API request
5. WHEN THE SData_Client receives InvalidCode error, THE Verification_View SHALL display an error message and allow retry
6. WHEN THE SData_Client receives InvalidDevice error, THE MFA_Handler SHALL refresh the device list
7. THE Verification_View SHALL limit TOTP code input to numeric characters only

### Requirement 7: Send Email TOTP Code

**User Story:** As a mobile user with email-based MFA, I want to request a code via email, so that I can authenticate without an authenticator app.

#### Acceptance Criteria

1. WHEN a device with method value 2 is selected, THE Verification_View SHALL display a "Send Email" button
2. WHEN the user taps "Send Email", THE SData_Client SHALL POST to /slx/system/-/mfa/send-email with the deviceId
3. WHEN THE SData_Client receives sent: true, THE Verification_View SHALL display a confirmation message
4. WHEN THE SData_Client receives RateLimitExceeded error, THE Verification_View SHALL display the wait time and disable the button
5. WHEN THE SData_Client receives SmtpError, THE Verification_View SHALL display an error message and suggest trying another device
6. WHILE the rate limit is active, THE Verification_View SHALL display a countdown timer on the "Send Email" button
7. WHEN a device with method value 1 is selected, THE Verification_View SHALL NOT display the "Send Email" button

### Requirement 8: Handle MFA Verification Errors

**User Story:** As a mobile user, I want clear error messages when verification fails, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN THE SData_Client receives a 401 response with InvalidCode, THE Verification_View SHALL display "Invalid or expired code. Please try again."
2. WHEN THE SData_Client receives a 400 response with InvalidDevice, THE Verification_View SHALL display "Device not found. Please select another device."
3. WHEN THE SData_Client receives a 429 response with RateLimitExceeded, THE Verification_View SHALL display "Please wait 30 seconds before requesting another email."
4. WHEN THE SData_Client receives a 500 response with SmtpError, THE Verification_View SHALL display "Failed to send email. Please try another authentication method."
5. WHEN THE SData_Client receives a 403 response with SetupNotAllowed, THE MFA_Handler SHALL transition to the verification flow
6. WHEN any MFA API call fails with a network error, THE Verification_View SHALL display "Network error. Please check your connection and try again."
7. THE Verification_View SHALL provide a "Cancel" option that returns the user to the login screen

### Requirement 9: Retry Original Request After Verification

**User Story:** As a mobile user, I want the application to automatically continue after MFA verification, so that I don't have to manually retry my action.

#### Acceptance Criteria

1. WHEN THE MFA_Handler intercepts an MfaRequired error, THE MFA_Handler SHALL store the original request details
2. WHEN MFA verification completes successfully, THE MFA_Handler SHALL retry the original request with the same parameters
3. WHEN the retried request succeeds, THE MFA_Handler SHALL return the response to the original caller
4. WHEN the retried request fails with MfaRequired again, THE MFA_Handler SHALL display an error and return to login
5. WHEN the retried request fails with a different error, THE MFA_Handler SHALL propagate the error to the original caller

### Requirement 10: Persist MFA State Across App Lifecycle

**User Story:** As a mobile user, I want my MFA verification to persist when I background the app, so that I don't have to re-verify unnecessarily.

#### Acceptance Criteria

1. WHEN the application is backgrounded, THE Session_Manager SHALL preserve session cookies
2. WHEN the application is foregrounded, THE Session_Manager SHALL include preserved cookies in the next API request
3. WHEN the preserved session has expired, THE SData_Client SHALL receive MfaRequired and re-initiate the flow
4. WHEN the user logs out, THE Session_Manager SHALL clear all session cookies
5. THE Session_Manager SHALL store cookies in secure storage (encrypted on device)

### Requirement 11: Validate TOTP Code Format

**User Story:** As a mobile user, I want immediate feedback on invalid code formats, so that I don't waste time submitting incorrect codes.

#### Acceptance Criteria

1. WHEN the user enters a TOTP code, THE Verification_View SHALL validate the format in real-time
2. THE Verification_View SHALL accept only numeric characters (0-9) in the TOTP input field
3. WHEN the TOTP code length is less than 6 digits, THE Verification_View SHALL disable the submit button
4. WHEN the TOTP code length equals 6 digits, THE Verification_View SHALL enable the submit button
5. WHEN the TOTP code length exceeds 6 digits, THE Verification_View SHALL prevent additional input

### Requirement 12: Handle Device Setup Errors

**User Story:** As a mobile user setting up MFA, I want clear guidance when setup fails, so that I can successfully configure my device.

#### Acceptance Criteria

1. WHEN THE SData_Client receives a 400 response with "Invalid deviceType", THE Device_Setup_View SHALL display "Invalid device type selected. Please try again."
2. WHEN THE SData_Client receives a 400 response indicating email MFA is disabled, THE Device_Setup_View SHALL hide the Email option
3. WHEN THE SData_Client receives a 403 response with SetupNotAllowed, THE Device_Setup_View SHALL display "You already have devices configured. Please use the verification flow."
4. WHEN device setup fails with a network error, THE Device_Setup_View SHALL display "Network error. Please check your connection and try again."
5. THE Device_Setup_View SHALL provide a "Cancel" option that returns the user to the login screen

### Requirement 13: Display Device Information

**User Story:** As a mobile user with multiple MFA devices, I want to see device details, so that I can choose the right authentication method.

#### Acceptance Criteria

1. WHEN THE Device_Selector_View displays devices, THE Device_Selector_View SHALL show the device description
2. WHEN a device has method value 1, THE Device_Selector_View SHALL display "Authenticator App" as the device type
3. WHEN a device has method value 2, THE Device_Selector_View SHALL display "Email" as the device type
4. WHEN a device has isDefault value true, THE Device_Selector_View SHALL display a "Default" badge
5. THE Device_Selector_View SHALL sort devices with the default device first

### Requirement 14: Provide User Guidance

**User Story:** As a mobile user unfamiliar with MFA, I want helpful instructions, so that I can successfully complete the authentication process.

#### Acceptance Criteria

1. THE Device_Setup_View SHALL display instructions explaining what MFA is and why it's required
2. WHEN displaying a QR code, THE QR_Code_Display SHALL show step-by-step scanning instructions
3. THE Verification_View SHALL display instructions for where to find the TOTP code based on device type
4. WHEN an email device is selected, THE Verification_View SHALL display "Check your email for a 6-digit code"
5. WHEN an authenticator app device is selected, THE Verification_View SHALL display "Open your authenticator app and enter the 6-digit code"

### Requirement 15: Handle Session Timeout During MFA Flow

**User Story:** As a mobile user, I want graceful handling of session timeouts during MFA, so that I can recover without losing my progress.

#### Acceptance Criteria

1. WHEN a session timeout occurs during device setup, THE MFA_Handler SHALL preserve the setup state
2. WHEN a session timeout occurs during verification, THE MFA_Handler SHALL allow the user to retry verification
3. WHEN multiple session timeouts occur consecutively, THE MFA_Handler SHALL return the user to the login screen
4. WHEN a session timeout occurs, THE Verification_View SHALL display "Your session has expired. Please try again."
5. THE MFA_Handler SHALL limit retry attempts to 3 before returning to login

