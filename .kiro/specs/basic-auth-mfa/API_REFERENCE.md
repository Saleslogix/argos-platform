# Infor CRM MFA Basic Auth API Reference

## Overview

Multi-Factor Authentication (MFA) API endpoints for REST API clients using basic authentication in Infor CRM. These endpoints enable API clients to check MFA status, manage devices, verify TOTP codes, and complete MFA setup.

## Base URL

All endpoints are relative to your Infor CRM SData portal base URL:

```
https://{your-crm-server}/sdata/slx/system/-
```

The MFA endpoints follow the nested resource convention under `mfa/devices`, with `$service` operations for status, verify, and sendEmail.

## Authentication

All endpoints require HTTP Basic Authentication with valid Infor CRM credentials:

```
Authorization: Basic {base64-encoded-credentials}
```

**Important**: You must maintain session cookies across requests. The API uses ASP.NET session state to track MFA verification status.

## URL Structure

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/mfa/devices` | List configured MFA devices |
| POST | `/mfa/devices` | Create a new MFA device (setup) |
| POST | `/mfa/devices/$service/status` | Check MFA status |
| POST | `/mfa/devices/$service/verify` | Verify a TOTP code |
| POST | `/mfa/devices/$service/sendEmail` | Send TOTP code via email |

## MFA Flow Overview

### First-Time User Flow (No Devices Configured)

```
1. Client → GET /api/some-protected-endpoint
   ← 401 MFA Required (hasDevices: false)

2. Client → POST /mfa/devices
   Body: { "deviceName": "My Phone", "deviceType": "AuthApp" }
   ← 200 OK (returns QR code, TOTP URI, secret)

3. User scans QR code with authenticator app

4. Client → POST /mfa/devices/$service/verify
   Body: { "request": { "deviceId": "ABC123", "totpCode": "123456" } }
   ← 200 OK (response.verified: true)

5. Client → GET /api/some-protected-endpoint (retry)
   ← 200 OK (access granted)
```

### Returning User Flow (Has Devices)

```
1. Client → GET /api/some-protected-endpoint
   ← 401 MFA Required (hasDevices: true)

2. Client → GET /mfa/devices
   ← 200 OK (list of devices)

3. User generates TOTP code from authenticator app
   OR
   Client → POST /mfa/devices/$service/sendEmail
   Body: { "request": { "deviceId": "ABC123" } }
   ← 200 OK (response.sent: true)

4. Client → POST /mfa/devices/$service/verify
   Body: { "request": { "deviceId": "ABC123", "totpCode": "123456" } }
   ← 200 OK (response.verified: true)

5. Client → GET /api/some-protected-endpoint (retry)
   ← 200 OK (access granted)
```

## API Endpoints

### 1. Check MFA Status

Check if MFA is enabled and whether the current session has completed verification.

**Endpoint**: `POST /sdata/slx/system/-/mfa/devices/$service/status?format=json`

**Request Body**: Empty object or `{}`

**Response** (200 OK):
```json
{
  "response": {
    "mfaEnabled": true,
    "mfaVerified": false,
    "hasDevices": true
  }
}
```

**Response Fields** (inside `response`):
- `mfaEnabled` (boolean): Whether MFA is enabled for the system
- `mfaVerified` (boolean): Whether the current session has completed MFA verification
- `hasDevices` (boolean): Whether the current user has any MFA devices configured

---

### 2. Get MFA Devices

Retrieve the list of MFA devices configured for the authenticated user.

**Endpoint**: `GET /sdata/slx/system/-/mfa/devices?format=json`

**Response** (200 OK):
```json
{
  "$resources": [
    {
      "$key": "DEVICE123",
      "deviceId": "DEVICE123",
      "description": "My iPhone",
      "method": 1,
      "isDefault": true
    },
    {
      "$key": "DEVICE456",
      "deviceId": "DEVICE456",
      "description": "Work Email",
      "method": 2,
      "isDefault": false
    }
  ]
}
```

**Response Fields**:
- `deviceId` (string): Unique identifier for the device
- `description` (string): User-friendly device name
- `method` (integer): Device type (1 = Authenticator App, 2 = Email)
- `isDefault` (boolean): Whether this is the default device

---

### 3. Create MFA Device (Setup)

Create a new MFA device for users who have no devices configured.

**Endpoint**: `POST /sdata/slx/system/-/mfa/devices?format=json`

**Request Body**:
```json
{
  "deviceName": "My iPhone",
  "deviceType": "AuthApp"
}
```

**Request Fields**:
- `deviceName` (string, required): User-friendly name for the device
- `deviceType` (string, required): `"AuthApp"` or `"Email"`

**Success Response - AuthApp** (200 OK):
```json
{
  "$key": "DEVICE123",
  "deviceId": "DEVICE123",
  "description": "My iPhone",
  "method": 1,
  "isDefault": false,
  "qrCodeData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "totpUri": "otpauth://totp/InforCRM:username?secret=JBSWY3DPEHPK3PXP&issuer=InforCRM",
  "secret": "JBSWY3DPEHPK3PXP"
}
```

**Success Response - Email** (200 OK):
```json
{
  "$key": "DEVICE456",
  "deviceId": "DEVICE456",
  "description": "Work Email",
  "method": 2,
  "isDefault": false
}
```

**Response Fields**:
- `deviceId` (string): Unique identifier for the created device
- `description` (string): Device description
- `method` (integer): Device type (1 = AuthApp, 2 = Email)
- `qrCodeData` (string, AuthApp only): Base64-encoded PNG image of QR code
- `totpUri` (string, AuthApp only): TOTP URI for manual entry in authenticator apps
- `secret` (string, AuthApp only): Shared secret for manual entry

**Error Response - Already Has Devices** (403 Forbidden):
```json
{
  "$diagnoses": [{
    "severity": "Error",
    "sdataCode": "ApplicationDiagnosis",
    "message": "Setup not allowed. User already has MFA devices configured. Use the web portal to manage existing devices."
  }]
}
```

**Error Response - Invalid Device Type** (400 Bad Request):
```json
{
  "$diagnoses": [{
    "severity": "Error",
    "sdataCode": "BadQueryParameter",
    "message": "Invalid device type. Valid values are: AuthApp, Email"
  }]
}
```

**Note**: The server automatically determines whether to create a user-based or contact-based MFA device based on the portal context. On a customer portal, the device is associated with the authenticated contact. On the internal portal, it is associated with the authenticated user.

---

### 4. Verify TOTP Code

Verify a Time-based One-Time Password (TOTP) code and mark the session as MFA verified.

**Endpoint**: `POST /sdata/slx/system/-/mfa/devices/$service/verify?format=json`

**Request Body**:
```json
{
  "request": {
    "deviceId": "DEVICE123",
    "totpCode": "123456"
  }
}
```

**Request Fields** (inside `request`):
- `deviceId` (string, required): The device ID to verify against
- `totpCode` (string, required): The 6-digit TOTP code

**Success Response** (200 OK):
```json
{
  "response": {
    "verified": true,
    "message": "TOTP code verified successfully"
  }
}
```

**Error Response - Invalid Code** (401 Unauthorized):
```json
{
  "$diagnoses": [{
    "severity": "Error",
    "sdataCode": "ApplicationDiagnosis",
    "message": "Invalid TOTP code"
  }]
}
```

**Error Response - Invalid Device** (400 Bad Request):
```json
{
  "$diagnoses": [{
    "severity": "Error",
    "sdataCode": "ApplicationDiagnosis",
    "message": "Invalid device ID or device does not belong to current user"
  }]
}
```

**Important**: After successful verification, the session is marked as MFA verified. Subsequent API calls in the same session will not require MFA verification until the session expires.

---

### 5. Send Email TOTP Code

Request a TOTP code to be sent via email for email-based MFA devices.

**Endpoint**: `POST /sdata/slx/system/-/mfa/devices/$service/sendEmail?format=json`

**Request Body**:
```json
{
  "request": {
    "deviceId": "DEVICE456"
  }
}
```

**Request Fields** (inside `request`):
- `deviceId` (string, required): The email-type device ID

**Success Response** (200 OK):
```json
{
  "response": {
    "sent": true,
    "message": "Email sent successfully"
  }
}
```

**Error Response - Not Email Device** (400 Bad Request):
```json
{
  "$diagnoses": [{
    "severity": "Error",
    "sdataCode": "ApplicationDiagnosis",
    "message": "Device is not an email-type MFA device"
  }]
}
```

**Error Response - Rate Limited** (429 Too Many Requests):
```json
{
  "$diagnoses": [{
    "severity": "Error",
    "sdataCode": "ApplicationDiagnosis",
    "message": "Rate limit exceeded. Please wait 25 seconds before requesting another email."
  }]
}
```

**Rate Limiting**: Maximum one email per 30 seconds per session.

---

## Error Handling

### Standard Error Response Format

All errors follow the SData diagnoses format:

```json
{
  "$diagnoses": [{
    "severity": "Error",
    "sdataCode": "ErrorCode",
    "applicationCode": "...",
    "message": "Human-readable error message",
    "stackTrace": "..."
  }]
}
```

### Common Error Codes

| HTTP Status | SData Code | Description |
|-------------|------------|-------------|
| 400 | BadQueryParameter | Missing or invalid request parameters |
| 400 | ApplicationDiagnosis | Invalid device, device type not enabled, etc. |
| 401 | MfaRequired | MFA verification is required (from MfaBasicAuthModule) |
| 401 | ApplicationDiagnosis | Invalid TOTP code |
| 403 | ApplicationDiagnosis | Setup not allowed (user already has devices) |
| 429 | ApplicationDiagnosis | Rate limit exceeded for email sends |
| 500 | ApplicationDiagnosis | SMTP failure, server error |

### MFA Required Error (from MfaBasicAuthModule)

When a basic auth API call requires MFA verification:

```json
{
  "severity": "Error",
  "sdataCode": "ApplicationDiagnosis",
  "message": "Multi-factor authentication verification is required.",
  "mfaRequired": true,
  "hasDevices": false,
  "mfaStatusUrl": "/sdata/slx/system/-/mfa/devices/$service/status",
  "mfaDevicesUrl": "/sdata/slx/system/-/mfa/devices",
  "mfaVerifyUrl": "/sdata/slx/system/-/mfa/devices/$service/verify"
}
```

---

## Session Management

### Session Cookies

The API uses ASP.NET session state to track MFA verification. Your HTTP client must:

1. Accept and store cookies (`ASP.NET_SessionId`, `.SLXAUTH`)
2. Send cookies with every request
3. Handle session expiration by re-authenticating and re-verifying MFA

### Session Lifetime

- Default session timeout: 20 minutes (configurable in web.config)
- MFA verification is cleared when session expires
- You must re-verify MFA after session expiration

### Example with cURL

```bash
# Check MFA status
curl -X POST \
  "https://your-crm-server/sdata/slx/system/-/mfa/devices/\$service/status?format=json" \
  -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{}'

# List devices
curl -X GET \
  "https://your-crm-server/sdata/slx/system/-/mfa/devices?format=json" \
  -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" \
  -b cookies.txt

# Create device (setup)
curl -X POST \
  "https://your-crm-server/sdata/slx/system/-/mfa/devices?format=json" \
  -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"deviceName":"My Phone","deviceType":"AuthApp"}'

# Verify TOTP code
curl -X POST \
  "https://your-crm-server/sdata/slx/system/-/mfa/devices/\$service/verify?format=json" \
  -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"request":{"deviceId":"DEVICE123","totpCode":"123456"}}'

# Send email TOTP
curl -X POST \
  "https://your-crm-server/sdata/slx/system/-/mfa/devices/\$service/sendEmail?format=json" \
  -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"request":{"deviceId":"DEVICE456"}}'
```


---

## Complete Integration Example (JavaScript)

```javascript
const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');

axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();

const client = axios.create({
  baseURL: 'https://your-crm-server/sdata/slx/system/-',
  auth: { username: 'your-username', password: 'your-password' },
  jar: cookieJar,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

async function makeApiCall(endpoint) {
  try {
    return await client.get(endpoint);
  } catch (error) {
    if (error.response?.status === 401) {
      const diag = error.response.data?.$diagnoses?.[0];
      if (diag?.mfaRequired) {
        await handleMfa(diag.hasDevices);
        return await client.get(endpoint); // retry
      }
    }
    throw error;
  }
}

async function handleMfa(hasDevices) {
  if (!hasDevices) {
    // First-time setup
    const setup = await client.post('/mfa/devices?format=json', {
      deviceName: 'My Device',
      deviceType: 'AuthApp'
    });

    console.log('Scan QR code:', setup.data.qrCodeData);
    console.log('Or enter secret:', setup.data.secret);

    const totpCode = await promptUserForCode();
    await client.post('/mfa/devices/$service/verify?format=json', {
      request: { deviceId: setup.data.deviceId, totpCode }
    });
  } else {
    // Existing devices
    const devices = await client.get('/mfa/devices?format=json');
    const device = devices.data.$resources[0];

    if (device.method === 2) {
      await client.post('/mfa/devices/$service/sendEmail?format=json', {
        request: { deviceId: device.deviceId }
      });
      console.log('Check your email for TOTP code');
    }

    const totpCode = await promptUserForCode();
    await client.post('/mfa/devices/$service/verify?format=json', {
      request: { deviceId: device.deviceId, totpCode }
    });
  }
}
```

---

## Best Practices

1. **Cookie Management**: Always enable cookie support. Store cookies securely. Clear on logout.
2. **Error Handling**: Check for 401 with `mfaRequired: true`. Parse `hasDevices` to determine setup vs verify flow. Handle 429 rate limiting for email sends.
3. **Security**: Always use HTTPS. Never log TOTP codes. Validate TOTP format before sending (6 digits). Implement timeout for MFA prompts.
4. **User Experience**: Show clear QR code scanning instructions. Provide manual secret entry fallback. Display 30-second countdown for TOTP validity.

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Every call returns 401 MFA Required | Session cookies not persisting | Enable cookie support, check `withCredentials: true` |
| QR code won't scan | Image too small or encoding issue | Display at sufficient size, verify base64 decoding |
| TOTP codes always invalid | Time sync issue | Check server/client clock synchronization (30-second window) |
| Email not received | SMTP config or spam filter | Check spam folder, verify SMTP settings, check server logs |
| "Device ID is required" on $service calls | Missing `request` wrapper | Wrap parameters in `{"request": {...}}` for $service operations |
| NHibernate mapping error on POST | Framework issue | Ensure handler overrides `CreateEntity`/`SaveEntity` |

---

## Changelog

### Version 2.0 (Current)
- Restructured endpoints under `mfa/devices` following dbManager nested resource convention
- `$service` operations (status, verify, sendEmail) use standard SData `request`/`response` wrapper pattern
- Device creation via `POST /mfa/devices` (replaces old `mfaSetup` endpoint)
- Automatic user/contact detection based on portal context
- Handler bypasses NHibernate for non-persistent `MfaCommonMethod` entity

### Version 1.0 (Initial)
- Flat endpoint paths (`mfaStatus`, `mfaDevices`, `mfaVerify`, `mfaSendEmail`, `mfaSetup`)
- Caused 404 errors due to SData framework routing limitations
