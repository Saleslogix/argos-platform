# Design Document: Multi-Factor Authentication for Argos Mobile

## Overview

This design document specifies the architecture and implementation approach for integrating Multi-Factor Authentication (MFA) into the Argos mobile application. The SData backend has already implemented MFA endpoints for basic authentication flows, and this design focuses on the client-side implementation within the existing Argos SDK architecture.

### Goals

- Seamlessly integrate MFA verification into the existing authentication flow
- Support both first-time device setup and returning user verification
- Handle authenticator app (TOTP) and email-based MFA methods
- Maintain session state across API requests using cookies
- Provide clear user guidance throughout the MFA process
- Gracefully handle errors and session timeouts

### Non-Goals

- Managing MFA devices beyond initial setup (users must use web portal for device management)
- Implementing custom TOTP generation (relies on standard authenticator apps)
- Supporting biometric authentication methods
- Offline MFA verification

### Key Design Decisions

1. **Interceptor Pattern**: Use an HTTP interceptor to detect MfaRequired errors and orchestrate the MFA flow without requiring changes to existing API calls
2. **View-Based UI**: Implement MFA screens as standard Argos views (extending _DetailBase) for consistency with existing UI patterns
3. **Redux State Management**: Store MFA state in Redux to enable proper state tracking and recovery
4. **Cookie-Based Sessions**: Leverage existing SData client cookie handling for session persistence
5. **Modal Flow**: Present MFA verification as a modal flow that blocks access until completed

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Views making API calls via SData client)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   MFA Interceptor                            │
│  - Detects MfaRequired errors (401 with sdataCode)         │
│  - Stores original request for retry                        │
│  - Dispatches Redux actions to initiate MFA flow           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   MFA Coordinator                            │
│  - Determines flow: setup vs. verification                  │
│  - Manages state transitions                                │
│  - Coordinates view navigation                              │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Setup Flow      │    │ Verification Flow│
│  - Device Setup  │    │ - Device List    │
│  - QR Display    │    │ - Device Select  │
│  - Initial Verify│    │ - TOTP Entry     │
└──────────────────┘    └──────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   SData Client                               │
│  - HTTP communication with MFA endpoints                    │
│  - Cookie management (session persistence)                  │
│  - Error response parsing                                   │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

```
products/argos-saleslogix/src/
├── MFA/
│   ├── Interceptor.js           # HTTP interceptor for MfaRequired detection
│   ├── Coordinator.js           # MFA flow orchestration
│   ├── Views/
│   │   ├── DeviceSetup.js       # First-time device setup view
│   │   ├── DeviceList.js        # Device selection view
│   │   ├── Verification.js      # TOTP code entry view
│   │   └── QRCodeDisplay.js     # QR code display component
│   ├── actions/
│   │   └── mfa.js               # Redux actions for MFA state
│   └── reducers/
│       └── mfa.js               # Redux reducer for MFA state
└── ApplicationModule.js         # Register MFA views and reducers
```

### Data Flow

1. **Initial API Call**: Application makes API request via SData client
2. **MFA Detection**: Interceptor catches 401 response with sdataCode "MfaRequired"
3. **State Update**: Redux action dispatched with MFA requirement details
4. **Flow Determination**: Coordinator checks hasDevices flag to determine setup vs. verification
5. **View Navigation**: Appropriate MFA view is displayed modally
6. **User Interaction**: User completes device setup or enters TOTP code
7. **Verification**: SData client posts to /mfa/verify endpoint
8. **Session Update**: Server sets session cookie marking MFA as verified
9. **Request Retry**: Original API request is retried with verified session
10. **Flow Completion**: MFA views dismissed, original response returned to caller

## Components and Interfaces

### 1. MFA Interceptor

**Purpose**: Detect MFA requirements and initiate the MFA flow

**Module**: `crm/MFA/Interceptor`

**Interface**:
```javascript
class MFAInterceptor {
  /**
   * Initialize the interceptor and attach to SData client
   * @param {Object} sdataClient - The SData client instance
   * @param {Object} store - Redux store instance
   */
  constructor(sdataClient, store);
  
  /**
   * Handle HTTP response, checking for MFA requirements
   * @param {Object} response - HTTP response object
   * @returns {Object} - Original response or throws MFA error
   */
  handleResponse(response);
  
  /**
   * Handle HTTP error, checking for MfaRequired
   * @param {Object} error - HTTP error object
   * @returns {Promise} - Resolves after MFA completion or rejects
   */
  handleError(error);
  
  /**
   * Store original request for retry after MFA
   * @param {Object} request - Original request configuration
   */
  storeOriginalRequest(request);
  
  /**
   * Retry the original request after MFA verification
   * @returns {Promise} - Promise resolving to API response
   */
  retryOriginalRequest();
}
```

**Key Behaviors**:
- Intercepts all SData client responses
- Detects 401 status with sdataCode "MfaRequired"
- Extracts hasDevices flag from error response
- Stores original request details for retry
- Dispatches Redux action to initiate MFA flow
- Returns Promise that resolves after MFA completion

### 2. MFA Coordinator

**Purpose**: Orchestrate the MFA flow and manage state transitions

**Module**: `crm/MFA/Coordinator`

**Interface**:
```javascript
class MFACoordinator {
  /**
   * Initialize coordinator with dependencies
   * @param {Object} app - Application instance
   * @param {Object} store - Redux store instance
   */
  constructor(app, store);
  
  /**
   * Start MFA flow based on user's device status
   * @param {boolean} hasDevices - Whether user has configured devices
   */
  startMFAFlow(hasDevices);
  
  /**
   * Navigate to device setup flow
   */
  showDeviceSetup();
  
  /**
   * Navigate to device selection flow
   */
  showDeviceSelection();
  
  /**
   * Navigate to verification view
   * @param {Object} device - Selected MFA device
   */
  showVerification(device);
  
  /**
   * Handle successful MFA verification
   */
  handleVerificationSuccess();
  
  /**
   * Handle MFA flow cancellation
   */
  handleCancel();
  
  /**
   * Handle MFA flow errors
   * @param {Object} error - Error object
   */
  handleError(error);
}
```

**Key Behaviors**:
- Determines whether to show setup or verification flow
- Manages view transitions
- Tracks retry attempts for session timeout handling
- Dispatches Redux actions for state updates
- Coordinates with interceptor for request retry

### 3. Device Setup View

**Purpose**: Guide users through first-time MFA device registration

**Module**: `crm/MFA/Views/DeviceSetup`

**Extends**: `argos/_DetailBase`

**Interface**:
```javascript
class DeviceSetupView extends _DetailBase {
  /**
   * View configuration
   */
  id: 'mfa_device_setup';
  titleText: 'Setup Multi-Factor Authentication';
  
  /**
   * Create layout with device type selection
   */
  createLayout();
  
  /**
   * Handle device type selection
   * @param {string} deviceType - 'AuthApp' or 'Email'
   */
  onDeviceTypeSelect(deviceType);
  
  /**
   * Submit device setup request
   * @param {string} deviceName - User-provided device name
   * @param {string} deviceType - Selected device type
   */
  submitSetup(deviceName, deviceType);
  
  /**
   * Display QR code for authenticator app setup
   * @param {Object} setupResponse - Response from setup endpoint
   */
  displayQRCode(setupResponse);
  
  /**
   * Proceed to verification after setup
   * @param {string} deviceId - Created device ID
   */
  proceedToVerification(deviceId);
  
  /**
   * Handle setup errors
   * @param {Object} error - Error response
   */
  handleSetupError(error);
}
```

**Layout Structure**:
```
┌─────────────────────────────────────┐
│  Setup Multi-Factor Authentication  │
├─────────────────────────────────────┤
│                                     │
│  MFA adds an extra layer of         │
│  security to your account.          │
│                                     │
│  Choose your authentication method: │
│                                     │
│  ○ Authenticator App (Recommended)  │
│  ○ Email                            │
│                                     │
│  Device Name: [____________]        │
│                                     │
│  [Continue]  [Cancel]               │
│                                     │
└─────────────────────────────────────┘
```

**Key Behaviors**:
- Displays device type options (AuthApp, Email)
- Validates device name input
- Calls POST /slx/system/-/mfa/setup
- Shows QR code for AuthApp setup
- Handles SetupNotAllowed error by switching to verification flow
- Provides cancel option to return to login

### 4. QR Code Display Component

**Purpose**: Render QR code and provide manual entry option

**Module**: `crm/MFA/Views/QRCodeDisplay`

**Extends**: `dijit/_WidgetBase`

**Interface**:
```javascript
class QRCodeDisplay extends _WidgetBase {
  /**
   * Set QR code data
   * @param {string} qrCodeData - Base64-encoded PNG image
   * @param {string} secret - TOTP secret for manual entry
   */
  setQRCode(qrCodeData, secret);
  
  /**
   * Toggle manual entry display
   */
  toggleManualEntry();
  
  /**
   * Copy secret to clipboard
   */
  copySecret();
}
```

**Layout Structure**:
```
┌─────────────────────────────────────┐
│  Scan this QR code with your        │
│  authenticator app:                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      [QR CODE IMAGE]        │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Show Manual Entry Code]           │
│                                     │
│  Supported apps:                    │
│  • Google Authenticator             │
│  • Microsoft Authenticator          │
│  • Authy                            │
│                                     │
│  [Continue to Verification]         │
│                                     │
└─────────────────────────────────────┘
```

**Key Behaviors**:
- Decodes base64 QR code data
- Renders image at minimum 200x200 pixels
- Provides toggle for manual entry
- Displays secret in copyable format
- Shows instructions for common authenticator apps

### 5. Device List View

**Purpose**: Display available MFA devices for selection

**Module**: `crm/MFA/Views/DeviceList`

**Extends**: `argos/_ListBase`

**Interface**:
```javascript
class DeviceListView extends _ListBase {
  /**
   * View configuration
   */
  id: 'mfa_device_list';
  titleText: 'Choose Authentication Method';
  
  /**
   * Fetch user's MFA devices
   */
  requestData();
  
  /**
   * Create list item template
   * @param {Object} device - MFA device object
   */
  createItemTemplate(device);
  
  /**
   * Handle device selection
   * @param {Object} device - Selected device
   */
  onDeviceSelect(device);
  
  /**
   * Handle empty device list
   */
  handleNoDevices();
}
```

**Layout Structure**:
```
┌─────────────────────────────────────┐
│  Choose Authentication Method       │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📱 My iPhone                │   │
│  │ Authenticator App  [DEFAULT]│   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✉️  Work Email               │   │
│  │ Email                       │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Cancel]                           │
│                                     │
└─────────────────────────────────────┘
```

**Key Behaviors**:
- Calls GET /slx/system/-/mfa/devices
- Sorts devices with default first
- Displays device type icon (app or email)
- Shows "Default" badge for default device
- Auto-selects if only one device exists
- Redirects to setup if no devices found

### 6. Verification View

**Purpose**: Accept and verify TOTP codes

**Module**: `crm/MFA/Views/Verification`

**Extends**: `argos/_DetailBase`

**Interface**:
```javascript
class VerificationView extends _DetailBase {
  /**
   * View configuration
   */
  id: 'mfa_verification';
  titleText: 'Verify Your Identity';
  
  /**
   * Initialize with selected device
   * @param {Object} device - MFA device to verify with
   */
  initialize(device);
  
  /**
   * Create layout based on device type
   */
  createLayout();
  
  /**
   * Send email TOTP code (for email devices)
   */
  sendEmailCode();
  
  /**
   * Handle TOTP code input
   * @param {string} code - Entered TOTP code
   */
  onCodeInput(code);
  
  /**
   * Validate TOTP code format
   * @param {string} code - Code to validate
   * @returns {boolean} - Whether code is valid format
   */
  validateCodeFormat(code);
  
  /**
   * Submit TOTP code for verification
   * @param {string} code - 6-digit TOTP code
   */
  submitVerification(code);
  
  /**
   * Handle verification success
   */
  handleVerificationSuccess();
  
  /**
   * Handle verification errors
   * @param {Object} error - Error response
   */
  handleVerificationError(error);
  
  /**
   * Update rate limit countdown
   * @param {number} secondsRemaining - Seconds until next email allowed
   */
  updateRateLimitCountdown(secondsRemaining);
}
```

**Layout Structure (Authenticator App)**:
```
┌─────────────────────────────────────┐
│  Verify Your Identity               │
├─────────────────────────────────────┤
│                                     │
│  Open your authenticator app and    │
│  enter the 6-digit code:            │
│                                     │
│  Device: My iPhone                  │
│                                     │
│  ┌───┬───┬───┬───┬───┬───┐         │
│  │ _ │ _ │ _ │ _ │ _ │ _ │         │
│  └───┴───┴───┴───┴───┴───┘         │
│                                     │
│  [Verify]                           │
│                                     │
│  [Cancel]                           │
│                                     │
└─────────────────────────────────────┘
```

**Layout Structure (Email)**:
```
┌─────────────────────────────────────┐
│  Verify Your Identity               │
├─────────────────────────────────────┤
│                                     │
│  Check your email for a 6-digit     │
│  verification code.                 │
│                                     │
│  Device: Work Email                 │
│                                     │
│  [Send Email Code]                  │
│                                     │
│  ┌───┬───┬───┬───┬───┬───┐         │
│  │ _ │ _ │ _ │ _ │ _ │ _ │         │
│  └───┴───┴───┴───┴───┴───┘         │
│                                     │
│  [Verify]                           │
│                                     │
│  [Cancel]                           │
│                                     │
└─────────────────────────────────────┘
```

**Key Behaviors**:
- Displays device-specific instructions
- Shows "Send Email" button for email devices (method === 2)
- Validates TOTP code format (6 numeric digits)
- Disables submit until valid code entered
- Calls POST /slx/system/-/mfa/verify
- Handles rate limiting with countdown timer
- Displays error messages inline
- Provides cancel option

### 7. MFA Service Layer

**Purpose**: Handle MFA-specific HTTP operations and integrate with existing SData client

**Module**: `crm/MFA/Service`

**Interface**:
```javascript
class MFAService {
  /**
   * Initialize MFA service with SData client
   * @param {Object} sdataClient - The SData client instance
   */
  constructor(sdataClient);
  
  /**
   * Check MFA status
   * @returns {Promise} - Promise resolving to status response
   */
  checkStatus();
  
  /**
   * Get user's MFA devices
   * @returns {Promise} - Promise resolving to devices array
   */
  getDevices();
  
  /**
   * Setup new MFA device
   * @param {string} deviceName - User-provided device name
   * @param {string} deviceType - 'AuthApp' or 'Email'
   * @returns {Promise} - Promise resolving to setup response
   */
  setupDevice(deviceName, deviceType);
  
  /**
   * Verify TOTP code
   * @param {string} deviceId - Device ID
   * @param {string} totpCode - 6-digit TOTP code
   * @returns {Promise} - Promise resolving to verification response
   */
  verifyCode(deviceId, totpCode);
  
  /**
   * Send email TOTP code
   * @param {string} deviceId - Email device ID
   * @returns {Promise} - Promise resolving to send response
   */
  sendEmailCode(deviceId);
  
  /**
   * Parse MFA error from SData response
   * @param {Object} error - Error response
   * @returns {Object} - Parsed MFA error details
   */
  parseMFAError(error);
}
```

**Key Behaviors**:
- Wraps SData client for MFA-specific endpoints
- Uses existing SData client cookie handling
- Parses SData error format for MFA-specific codes
- Provides clean API for MFA operations
- Leverages existing session management

## Data Models

### MFA State (Redux)

```javascript
{
  mfa: {
    // Current MFA flow state
    isActive: false,              // Whether MFA flow is in progress
    flowType: null,               // 'setup' | 'verification' | null
    hasDevices: false,            // Whether user has configured devices
    
    // Device information
    devices: [],                  // Array of MFA devices
    selectedDevice: null,         // Currently selected device
    
    // Setup state
    setupInProgress: false,
    setupDeviceId: null,          // Device ID from setup response
    qrCodeData: null,             // Base64 QR code image
    secret: null,                 // TOTP secret for manual entry
    
    // Verification state
    verificationInProgress: false,
    verificationAttempts: 0,      // Number of verification attempts
    
    // Rate limiting (for email)
    rateLimitActive: false,
    rateLimitExpiry: null,        // Timestamp when rate limit expires
    
    // Error state
    error: null,                  // Current error message
    errorCode: null,              // SData error code
    
    // Original request (for retry)
    originalRequest: null,        // Stored request configuration
    
    // Session timeout tracking
    sessionTimeouts: 0,           // Consecutive session timeout count
  }
}
```

### MFA Device Model

```javascript
{
  deviceId: string,      // Unique device identifier
  description: string,   // User-friendly device name
  method: number,        // 1 = AuthApp, 2 = Email
  isDefault: boolean,    // Whether this is the default device
}
```

### MFA Setup Response Model

```javascript
{
  deviceId: string,      // Created device ID
  qrCodeData: string,    // Base64-encoded PNG (AuthApp only)
  totpUri: string,       // TOTP URI (AuthApp only)
  secret: string,        // TOTP secret (AuthApp only)
}
```

### MFA Error Model

```javascript
{
  sdataCode: string,     // Error code: MfaRequired, InvalidCode, etc.
  message: string,       // Human-readable error message
  hasDevices: boolean,   // Whether user has devices (MfaRequired only)
}
```


## Error Handling

### Error Categories

#### 1. MFA Requirement Errors

**Error Code**: `MfaRequired` (401)

**Handling**:
- Interceptor catches error and extracts hasDevices flag
- Coordinator initiates appropriate flow (setup or verification)
- Original request stored for retry after verification
- User presented with MFA UI

**Recovery**: Complete MFA flow and retry original request

#### 2. Verification Errors

**Error Code**: `InvalidCode` (401)

**Handling**:
- Display error message: "Invalid or expired code. Please try again."
- Clear TOTP input field
- Allow user to retry
- Track verification attempts

**Recovery**: User enters correct TOTP code

**Error Code**: `InvalidDevice` (400)

**Handling**:
- Display error message: "Device not found. Please select another device."
- Return to device selection view
- Refresh device list

**Recovery**: User selects valid device

#### 3. Setup Errors

**Error Code**: `SetupNotAllowed` (403)

**Handling**:
- Transition from setup flow to verification flow
- Fetch user's existing devices
- Display device selection view

**Recovery**: User verifies with existing device

**Error Code**: Invalid deviceType (400)

**Handling**:
- Display error message: "Invalid device type selected. Please try again."
- Reset device type selection
- Allow user to retry

**Recovery**: User selects valid device type

**Error Code**: Email MFA disabled (400)

**Handling**:
- Hide Email option in device type selection
- Show only Authenticator App option
- Display message: "Email authentication is not available."

**Recovery**: User selects Authenticator App

#### 4. Rate Limiting Errors

**Error Code**: `RateLimitExceeded` (429)

**Handling**:
- Display message: "Please wait 30 seconds before requesting another email."
- Disable "Send Email" button
- Start countdown timer (30 seconds)
- Re-enable button when timer expires

**Recovery**: Wait for rate limit to expire

#### 5. Email Delivery Errors

**Error Code**: `SmtpError` (500)

**Handling**:
- Display error message: "Failed to send email. Please try another authentication method."
- Provide option to select different device
- Log error for debugging

**Recovery**: User selects different device or retries

#### 6. Network Errors

**Handling**:
- Display error message: "Network error. Please check your connection and try again."
- Provide retry button
- Preserve MFA state for retry

**Recovery**: User retries when network available

#### 7. Session Timeout Errors

**Handling**:
- Track consecutive session timeouts
- Display message: "Your session has expired. Please try again."
- Allow retry up to 3 times
- After 3 timeouts, return to login screen

**Recovery**: User retries verification or re-authenticates

### Error Display Strategy

**Inline Errors**: Display errors within the current view for:
- Invalid TOTP codes
- Rate limiting
- Validation errors

**Modal Errors**: Display modal dialogs for:
- Network errors
- Unexpected server errors
- Session timeouts

**Toast Notifications**: Use for:
- Successful verification
- Email sent confirmation

### Error Recovery Flow

```
┌─────────────────┐
│  Error Occurs   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse Error    │
│  Extract Code   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Determine      │
│  Recovery Path  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Retry  │ │ Switch │
│ Action │ │ Flow   │
└────────┘ └────────┘
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases using Jasmine (argos-sdk) or Mocha (argos-saleslogix).

**Test Coverage**:

1. **MFA Interceptor**:
   - Detects MfaRequired errors correctly
   - Extracts hasDevices flag from error response
   - Stores original request for retry
   - Handles missing or malformed hasDevices field
   - Retries original request after verification

2. **MFA Coordinator**:
   - Routes to setup flow when hasDevices is false
   - Routes to verification flow when hasDevices is true
   - Handles view transitions correctly
   - Tracks retry attempts for session timeouts
   - Limits retries to 3 before returning to login

3. **Device Setup View**:
   - Validates device name input
   - Handles SetupNotAllowed error by switching flows
   - Displays QR code for AuthApp setup
   - Proceeds directly to verification for Email setup
   - Handles network errors gracefully

4. **QR Code Display**:
   - Decodes base64 QR code data correctly
   - Renders image at minimum 200x200 pixels
   - Toggles manual entry display
   - Copies secret to clipboard

5. **Device List View**:
   - Sorts devices with default first
   - Auto-selects when only one device exists
   - Redirects to setup when no devices found
   - Displays correct device type icons

6. **Verification View**:
   - Validates TOTP code format (6 numeric digits)
   - Disables submit button for invalid codes
   - Shows "Send Email" button only for email devices
   - Handles rate limiting with countdown timer
   - Displays device-specific instructions

7. **SData Client**:
   - Uses existing cookie handling (already implemented in argos-sdk)
   - MFA service wraps SData client for MFA endpoints
   - Parses MFA error responses correctly
   - Makes MFA-specific API calls via service layer

8. **Redux Actions and Reducers**:
   - Updates MFA state correctly
   - Handles all action types
   - Preserves state during errors
   - Clears state on logout

### Property-Based Testing

Property-based tests will verify universal properties across many generated inputs using fast-check. Each test will run a minimum of 100 iterations.

**Property Test Configuration**:
- Library: fast-check
- Minimum iterations: 100 per test
- Tag format: **Feature: basic-auth-mfa, Property {number}: {property_text}**

**Note**: Correctness properties will be defined in the Correctness Properties section below.

### Integration Testing

Integration tests will verify end-to-end MFA flows using Playwright (for argos-saleslogix).

**Test Scenarios**:

1. **First-Time Setup Flow (AuthApp)**:
   - User makes API call requiring MFA
   - Setup view displays with device type options
   - User selects Authenticator App
   - QR code displays correctly
   - User proceeds to verification
   - User enters valid TOTP code
   - Original request retries successfully

2. **First-Time Setup Flow (Email)**:
   - User makes API call requiring MFA
   - Setup view displays with device type options
   - User selects Email
   - Verification view displays immediately
   - User requests email code
   - User enters valid TOTP code
   - Original request retries successfully

3. **Returning User Flow (Single Device)**:
   - User makes API call requiring MFA
   - Verification view displays automatically
   - User enters valid TOTP code
   - Original request retries successfully

4. **Returning User Flow (Multiple Devices)**:
   - User makes API call requiring MFA
   - Device list displays
   - User selects device
   - Verification view displays
   - User enters valid TOTP code
   - Original request retries successfully

5. **Error Handling**:
   - Invalid TOTP code displays error and allows retry
   - Rate limiting prevents multiple email sends
   - Session timeout allows retry up to 3 times
   - Network error displays message and allows retry

6. **Session Persistence**:
   - MFA verification persists across multiple API calls
   - Session expires after timeout
   - MFA re-verification required after session expiration

### Manual Testing

Manual testing will verify user experience and visual design:

1. QR code scans correctly with common authenticator apps
2. Instructions are clear and helpful
3. Error messages are understandable
4. UI is responsive and accessible
5. Flow feels natural and not disruptive


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: MFA Requirement Detection

For any HTTP response with status 401 and sdataCode "MfaRequired", the MFA interceptor should detect and intercept the error, extracting the hasDevices field from the response.

**Validates: Requirements 1.1, 1.2**

### Property 2: Missing hasDevices Defaults to False

For any MfaRequired error response where the hasDevices field is missing, null, undefined, or malformed, the MFA handler should treat it as false.

**Validates: Requirements 1.3**

### Property 3: Flow Routing Based on Device Status

For any MFA requirement, if hasDevices is false, the system should route to device setup flow; if hasDevices is true, the system should route to verification flow.

**Validates: Requirements 1.4, 1.5**

### Property 4: Cookie Persistence Round Trip

For any API response containing Set-Cookie headers, the session manager should store those cookies and include them in all subsequent API requests.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 5: Session Expiration Triggers Re-authentication

For any API request made with an expired session, if the response is MfaRequired, the MFA handler should re-initiate the authentication flow.

**Validates: Requirements 2.5**

### Property 6: Device Setup API Call Format

For any device setup submission with deviceName and deviceType, the SData client should POST to /slx/system/-/mfa/setup with both parameters included in the request body.

**Validates: Requirements 3.4**

### Property 7: AuthApp Setup Response Handling

For any successful device setup response where deviceType is "AuthApp", the system should display both the QR code from qrCodeData and provide access to the secret for manual entry.

**Validates: Requirements 3.5, 3.6**

### Property 8: Email Setup Flow Transition

For any successful device setup response where deviceType is "Email", the system should proceed directly to the verification view without displaying QR code.

**Validates: Requirements 3.7**

### Property 9: SetupNotAllowed Error Recovery

For any device setup request that fails with sdataCode "SetupNotAllowed", the MFA handler should transition from setup flow to verification flow and fetch existing devices.

**Validates: Requirements 3.8, 8.5**

### Property 10: QR Code Base64 Decoding

For any valid base64-encoded PNG image data provided as qrCodeData, the QR code display component should successfully decode and render the image at a minimum size of 200x200 pixels.

**Validates: Requirements 4.1, 4.2**

### Property 11: Device List API Call

For any verification flow initiation, the SData client should GET /slx/system/-/mfa/devices and parse the $resources array from the response.

**Validates: Requirements 5.1, 5.2**

### Property 12: Single Device Auto-Selection

For any device list response where the $resources array contains exactly one device, the MFA handler should automatically select that device and proceed to verification without showing device selection UI.

**Validates: Requirements 5.3**

### Property 13: Multiple Device Display

For any device list response where the $resources array contains multiple devices, the device selector view should display all devices with their descriptions.

**Validates: Requirements 5.4**

### Property 14: Empty Device List Routing

For any device list response where the $resources array is empty, the MFA handler should initiate the device setup flow.

**Validates: Requirements 5.5**

### Property 15: Default Device Indication

For any device in the device list where isDefault is true, the device selector view should display a visual indicator marking it as the default device.

**Validates: Requirements 5.6**

### Property 16: TOTP Code Format Validation

For any input string, the verification view should validate that it contains exactly 6 numeric digits (0-9) before enabling submission, and should reject any non-numeric characters.

**Validates: Requirements 6.2, 6.7, 11.1, 11.2**

### Property 17: Verification API Call Format

For any valid TOTP code submission, the SData client should POST to /slx/system/-/mfa/verify with both deviceId and totpCode included in the request body.

**Validates: Requirements 6.3**

### Property 18: Original Request Retry After Verification

For any successful MFA verification (verified: true), the MFA handler should retry the original failed API request with the same parameters and return the response to the original caller.

**Validates: Requirements 6.4, 9.1, 9.2, 9.3**

### Property 19: InvalidCode Error Handling

For any verification response with sdataCode "InvalidCode", the verification view should display an error message and allow the user to retry with a new code.

**Validates: Requirements 6.5**

### Property 20: InvalidDevice Error Handling

For any verification response with sdataCode "InvalidDevice", the MFA handler should refresh the device list and return to device selection.

**Validates: Requirements 6.6**

### Property 21: Email Device Send Button Display

For any device where method equals 2, the verification view should display a "Send Email" button; for any device where method equals 1, the button should not be displayed.

**Validates: Requirements 7.1, 7.7**

### Property 22: Send Email API Call Format

For any "Send Email" button tap, the SData client should POST to /slx/system/-/mfa/send-email with the deviceId included in the request body.

**Validates: Requirements 7.2**

### Property 23: Email Send Success Confirmation

For any send email response with sent: true, the verification view should display a confirmation message to the user.

**Validates: Requirements 7.3**

### Property 24: Rate Limit Enforcement

For any send email response with sdataCode "RateLimitExceeded", the verification view should disable the "Send Email" button and display a countdown timer for 30 seconds.

**Validates: Requirements 7.4, 7.6**

### Property 25: SMTP Error Handling

For any send email response with sdataCode "SmtpError", the verification view should display an error message suggesting the user try another device.

**Validates: Requirements 7.5**

### Property 26: Repeated MFA Requirement Error

For any retried request that fails with MfaRequired again, the MFA handler should display an error and return the user to the login screen.

**Validates: Requirements 9.4**

### Property 27: Non-MFA Error Propagation

For any retried request that fails with an error other than MfaRequired, the MFA handler should propagate the error to the original caller without additional MFA handling.

**Validates: Requirements 9.5**

### Property 28: Cookie Preservation Across App Lifecycle

For any application backgrounding event, the session manager should preserve all session cookies; for any subsequent foregrounding event, the session manager should include those preserved cookies in the next API request.

**Validates: Requirements 10.1, 10.2**

### Property 29: Expired Session Detection

For any API request made with preserved cookies where the session has expired, the SData client should receive MfaRequired and re-initiate the MFA flow.

**Validates: Requirements 10.3**

### Property 30: Logout Cookie Cleanup

For any logout action, the session manager should clear all stored session cookies.

**Validates: Requirements 10.4**

### Property 31: Submit Button State Based on Code Length

For any TOTP code input, if the length is less than 6 digits, the submit button should be disabled; if the length equals 6 digits, the submit button should be enabled; if the user attempts to enter more than 6 digits, additional input should be prevented.

**Validates: Requirements 11.3, 11.4, 11.5**

### Property 32: Email MFA Disabled Handling

For any device setup response indicating email MFA is disabled, the device setup view should hide the Email option and only display the Authenticator App option.

**Validates: Requirements 12.2**

### Property 33: Device Description Display

For any device in the device selector view, the view should display the device's description field.

**Validates: Requirements 13.1**

### Property 34: Device Method Type Mapping

For any device displayed in the device selector view, if method equals 1, the view should display "Authenticator App" as the device type; if method equals 2, the view should display "Email" as the device type.

**Validates: Requirements 13.2, 13.3**

### Property 35: Default Device Badge Display

For any device where isDefault is true, the device selector view should display a "Default" badge alongside the device information.

**Validates: Requirements 13.4**

### Property 36: Default Device Sorting

For any device list containing a device with isDefault true, the device selector view should sort the list such that the default device appears first.

**Validates: Requirements 13.5**

### Property 37: Device-Specific Instructions

For any device selected for verification, the verification view should display instructions appropriate to the device type (authenticator app instructions for method 1, email instructions for method 2).

**Validates: Requirements 14.3**

### Property 38: Setup State Preservation During Timeout

For any session timeout that occurs during device setup, the MFA handler should preserve the setup state to allow retry without losing progress.

**Validates: Requirements 15.1**

### Property 39: Verification Retry After Timeout

For any session timeout that occurs during verification, the MFA handler should allow the user to retry verification without returning to login.

**Validates: Requirements 15.2**

### Property 40: Consecutive Timeout Limit

For any sequence of consecutive session timeouts, the MFA handler should limit retry attempts to 3, after which the user should be returned to the login screen.

**Validates: Requirements 15.3, 15.5**

