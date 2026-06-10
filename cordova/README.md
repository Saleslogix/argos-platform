# Cordova Native Shell

This directory is a self-contained Apache Cordova project that wraps the compiled
Argos SalesLogix mobile web app (`products/argos-saleslogix/deploy/`) into
installable Android and iOS applications. It is a sibling of `argos-sdk/`,
`products/`, `packages/`, and `tests/` at the monorepo root.

The Cordova shell **reads** `products/argos-saleslogix/deploy/` as a read-only
input and never modifies the web build. The web bits that ship to IIS and the
bits packaged into the native apps are identical, except for the WebView entry
document (see [Entry-template contract](#entry-template-contract)).

All commands below are run **from inside `cordova/`** (for example
`cd cordova && npm install`).

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18 LTS or later | The monorepo baseline is Node 16+, but `cordova-android@13` requires Node 18+. Use Node 18 LTS to cover both. npm 7+ is required for workspace support at the root. |
| Cordova CLI | 12.0.0 | Pinned in `cordova/package.json` `devDependencies` and run through `npx cordova`. Installed locally by `npm install`; you do not need a global install. |
| cordova-android | 13.0.0 | Pinned platform engine. Requires JDK 17 and Gradle (bundled with a recent Android Studio). |
| cordova-ios | 7.0.1 | Pinned platform engine. macOS only. |
| Android SDK | Platform 34 (`targetSdkVersion`), with `minSdkVersion` 24 (Android 7.0) | `cordova-android@13` builds against Android SDK Platform 34 and its build-tools. Set `ANDROID_SDK_ROOT` and `JAVA_HOME`. |
| Xcode | 14 or later (macOS only) | Required for `cordova-ios@7`. The iOS deployment target is 13.0. `xcodebuild` must be on `PATH`. |

The exact platform and plugin versions are pinned in both `cordova/package.json`
and `cordova/config.xml`. The two files are cross-checked on every build by
`hooks/before_prepare/020-check-plugins.js`; a mismatch or a non-exact
(`^`, `~`, range) pin fails the build.

## Build commands

Run these from inside `cordova/`. Each npm script maps to a Grunt task in
`grunt-tasks/grunt-cordova.js`.

| Command | Grunt task | What it does |
|---------|------------|--------------|
| `npm run cordova` | `grunt cordova` | Full pipeline: `cordova:install` → `cordova:stage` → `cordova:prepare` → `cordova:build:all:release`. This is what Jenkins runs. |
| `npm run cordova:build:android` | `grunt cordova:build:android:release` | Builds a signed Android release (`.apk` + `.aab`) into `cordova/dist/android/`. |
| `npm run cordova:build:ios` | `grunt cordova:build:ios:release` | Builds a signed iOS release (`.ipa`) into `cordova/dist/ios/`. macOS only; fails fast on any other host. |
| `npm run cordova:run:android` | `grunt cordova:run:android` | Stages, prepares, and runs on a connected Android device or emulator. |
| `npm run cordova:run:ios` | `grunt cordova:run:ios` | Stages, prepares, and runs on a connected iOS device or simulator. macOS only. |

Additional lower-level tasks are also available:

- `npm run cordova:install` — `npm install` inside `cordova/`.
- `npm run cordova:stage` — materialise `cordova/www/` from
  `products/argos-saleslogix/deploy/`, the entry template, and any
  `ARGOS_SERVER_*` overrides. Add `:debug` (`grunt cordova:stage:debug`) to stage
  with the development configuration.
- `npm run cordova:prepare` — run `cordova prepare`.
- `npm run cordova:build` — build (defaults to `all:release`).

Before any build can succeed, the SalesLogix web build must have produced
`products/argos-saleslogix/deploy/`. The staging step fails with a named error
if `deploy/` is missing (see [Troubleshooting](#troubleshooting)).

### Build profiles

- **release** (default): stages `deploy/configuration/production.js`.
- **debug**: stages `deploy/configuration/development.js` over
  `cordova/www/configuration/production.js`, so the AMD module path
  `configuration/production` resolves to the development configuration content.
  Debug builds use Cordova's default debug keystore and skip iOS signing
  requirements that are unnecessary for simulator builds.

## Server and environment configuration

The staged `configuration/production.js` is the single source of truth for the
runtime SData server settings. Under Cordova, `window.location.hostname`
resolves to the local `file://` origin, which is **not** a valid SData host, so
the staging step substitutes explicit values from the `ARGOS_SERVER_*`
environment variables into the `connections.crm` block of the staged
`configuration/production.js` before the app is packaged.

Set these in the environment before running `cordova:stage` (or any task that
stages, including `cordova`, `cordova:build`, and `cordova:run:*`).

| Variable | Maps to (`connections.crm` field) | Accepted values | Validation |
|----------|-----------------------------------|-----------------|------------|
| `ARGOS_SERVER_NAME` | `serverName` | Any non-empty string (hostname, optionally with a path segment) | Pass-through; not validated. |
| `ARGOS_SERVER_PORT` | `port` | Integer **1–65535** | Must match `^\d+$` and fall within `[1, 65535]`, otherwise staging fails. |
| `ARGOS_SERVER_PROTOCOL` | `protocol` | Exactly `http` or `https` | Any other non-empty value fails staging. |
| `ARGOS_SERVER_VDIR` | `virtualDirectory` | Any non-empty string (for example `sdata`) | Pass-through; not validated. |

Only variables set to a **non-empty** value are substituted. An unset or empty
variable leaves its corresponding field untouched.

### Defaults applied when no override is set

If **none** of the `ARGOS_SERVER_*` variables are set to a non-empty value, the
staged `configuration/production.js` is left **byte-for-byte identical** to the
file copied from `deploy/`. The defaults in
`products/argos-saleslogix/configuration/production.default.js` then apply:

| Field | Default expression | Effective value under Cordova |
|-------|--------------------|-------------------------------|
| `serverName` | `window.location.hostname` | The `file://` origin — **not a usable SData host**. |
| `port` | `window.location.port` (else `false`) | `false`. |
| `protocol` | `https` when `window.location.protocol` is https, else `false` | `false`. |
| `virtualDirectory` | `'sdata'` | `sdata`. |
| `applicationName` | `'slx'` | `slx`. |

> **Important:** Because the web defaults read from `window.location`, a native
> binary built **without** the `ARGOS_SERVER_*` overrides will not have a working
> SData host. Always set `ARGOS_SERVER_NAME` (and the others as needed) for any
> release or device build. Leaving the defaults is only useful for opening the
> staged `index.html` in a desktop browser for diagnostics.

Example (PowerShell):

```powershell
$env:ARGOS_SERVER_NAME = "crm.example.com"
$env:ARGOS_SERVER_PORT = "443"
$env:ARGOS_SERVER_PROTOCOL = "https"
$env:ARGOS_SERVER_VDIR = "sdata"
npm run cordova:build:android
```

### Live reload (developer convenience)

To iterate on source without rebuilding, point the WebView at the running
SalesLogix dev server (`npm start`):

| Variable | Accepted values | Effect |
|----------|-----------------|--------|
| `ARGOS_LIVE_RELOAD` | `1`, `true`, or `yes` (case-insensitive; surrounding whitespace ignored) | Enables live reload. Any other value (or unset) disables it. |
| `ARGOS_LIVE_RELOAD_URL` | Any URL | The dev-server URL to load. Defaults to `http://localhost:8000/products/argos-saleslogix/`. |

When enabled, `cordova:run:*` configures the WebView content source to the dev
server before staging, so source edits do not require a rebuild.

## Mingle SSO redirect scheme

The native shell preserves the existing Mingle SSO flow. The OAuth dance runs
inside `cordova-plugin-inappbrowser`, and the redirect target is a custom URL
scheme instead of an externally reachable web origin:

```
infor-crm-slx://oauth/callback
```

The shell intercepts navigations on the in-app browser, extracts the
`access_token` and `expires_in` values from the redirect (read from either the
`?` query string or the `#` fragment), closes the browser, and forwards the
token to the existing `crm/MingleUtility` token handler. Token storage and
refresh logic are unchanged. The scheme is authorised for navigation by the
`<allow-navigation href="infor-crm-slx://*" />` entry in `config.xml`.

### Mingle tenant configuration required

The custom scheme will only work after the Mingle tenant is configured to accept
it. This is a one-time tenant setup:

1. In the Mingle / Infor OS tenant, open the registered CRM Mobile application
   and add `infor-crm-slx://oauth/callback` as an **authorized redirect URL**
   (alongside any existing web redirect URLs).
2. Set `mingleRedirectUrl` in `products/argos-saleslogix/configuration/production.js`
   to `infor-crm-slx://oauth/callback` for native builds. (The shipped default in
   `production.default.js` points at a web URL, which only works for the
   browser-hosted web app.)
3. Confirm the Mingle authorization host (`mingleSettings.pu`, for example
   `https://<tenant>-sso.<env>.infor.com`) and the ION API host
   (`mingleSettings.iu`) are present in the `<access origin="...">` and
   `<allow-navigation href="...">` entries of `config.xml`. The shipped
   `config.xml` lists example integration hosts; replace them with the target
   environment's hosts for customer-specific builds.

## Plugin set

Every plugin is pinned to an exact `MAJOR.MINOR.PATCH` version in both
`package.json` and `config.xml`.

| Plugin | Version | Why Argos_Web_App needs it |
|--------|---------|----------------------------|
| `cordova-plugin-device` | 2.1.0 | Exposes device model/platform/version through `window.device` for platform and feature detection. |
| `cordova-plugin-network-information` | 3.0.0 | Fires `online`/`offline` window events and the `Connection` API so the offline sync layer detects connectivity transitions. |
| `cordova-plugin-statusbar` | 3.0.0 | Controls the native status bar so WebView content does not render underneath it. |
| `cordova-plugin-splashscreen` | 6.0.2 | Shows and hides the native splash screen while the web app bootstraps. |
| `cordova-plugin-inappbrowser` | 6.0.0 | Opens external links and the Mingle OAuth redirect in an in-app browser instead of replacing the application WebView. |
| `cordova-plugin-file` | 8.0.1 | Provides persistent file-system access that PouchDB and the FileManager require on platforms that gate it. |
| `cordova-plugin-geolocation` | 5.0.0 | Backs the `navigator.geolocation` call in `src/Integrations/Contour/Views/PxSearch/AccountPxSearch.js` on WebViews that gate location behind native permissions. |
| `cordova-plugin-whitelist` | 1.3.5 | Enforces the `<allow-navigation>` / `<allow-intent>` origin restrictions and logs rejected origins. |

Geolocation requires runtime permissions: `config.xml` declares
`android.permission.ACCESS_FINE_LOCATION` and
`android.permission.ACCESS_COARSE_LOCATION` for Android, and a non-empty
`NSLocationWhenInUseUsageDescription` for iOS.

## Entry-template contract

The Cordova WebView loads `cordova/www-template/index.html`, which is copied over
the staged `cordova/www/index.html` as the last step of staging. This template
**mirrors the bootstrap shape** of `products/argos-saleslogix/index.html` and is
intended to diverge from it only in the Cordova-specific deltas below.

> **Contract:** Any change to the bootstrap shape in
> `products/argos-saleslogix/index.html` MUST be mirrored in
> `cordova/www-template/index.html`. The web and native bootstraps are kept in
> lockstep by hand; there is no automatic generation.

The bootstrap shape that must stay in sync includes:

- the Soho configuration block (`SohoConfig`),
- the `argos-dependencies.js` script and the rest of the global dependency
  scripts,
- the Dojo `data-dojo-config` attribute,
- the AMD `require` configuration — `baseUrl`, `packages`, and the `map`
  (including `'Sage/Platform/Mobile': 'argos'`, `'Mobile/SalesLogix': 'crm'`, and
  `'icboe': 'crm/Integrations/BOE'`),
- the supported locales list and the `window.localStorage` locale resolution,
- the locale and regional `.l20n` file lists and the legacy localization paths,
- the `crm/polyfills/index` + `crm/Bootstrap` invocation and its argument shape,
- the `rootNode` root element id.

The native template adds exactly three Cordova-specific deltas:

1. A `<script src="cordova.js"></script>` tag in `<head>` (Cordova injects
   `cordova.js` during `cordova prepare`).
2. A `<meta http-equiv="Content-Security-Policy">` tag allowing `'self'`, `gap:`,
   `'unsafe-eval'` (required by the Dojo AMD loader), and the configured
   Server_Endpoint hosts.
3. A `deviceready` guard around the final `require([... 'crm/Bootstrap'], ...)`
   call. `crm/Bootstrap` runs exactly once per page load, deferred until either
   the Cordova `deviceready` event fires or a 10000 ms fallback timeout elapses
   (so the same `index.html` can be opened in a desktop browser for diagnostics).

The template intentionally does **not** reuse the legacy PhoneGap entry document,
does not call `navigator.serviceWorker.register`, and does not reference the
removed `localization/en` legacy path.

## Troubleshooting

### `deploy/ not found`

```
deploy/ not found at "<path>". Run the SalesLogix release build first to produce
the web app under products/argos-saleslogix/deploy/.
```

The staging step requires the compiled web app. Run the SalesLogix release build
(for example `build\release.cmd`, or the existing Grunt web build) to produce
`products/argos-saleslogix/deploy/`, then re-run the Cordova command. The same
error appears if `deploy/` exists but is not a directory.

### Invalid `ARGOS_SERVER_*` value

If `ARGOS_SERVER_PORT` is not an integer in `[1, 65535]`, or
`ARGOS_SERVER_PROTOCOL` is not exactly `http` or `https`, staging fails with a
message naming the offending variable, for example:

```
ARGOS_SERVER_PORT must be an integer between 1 and 65535 (got "abc").
ARGOS_SERVER_PROTOCOL must be exactly "http" or "https" (got "ftp").
```

Fix the variable and re-run. When validation fails, the staged
`configuration/production.js` is left in the profile-appropriate state (the file
copied for the `release`/`debug` profile) with no partial rewrite applied.

### Missing-toolchain warnings

The build detects whether each platform's native toolchain is available:

- **Android** requires both `ANDROID_SDK_ROOT` and `JAVA_HOME` to be set to
  non-empty values.
- **iOS** requires a macOS host with `xcodebuild` on `PATH`.

Behaviour when a toolchain is missing:

- On a **Jenkins** agent (`JENKINS_URL` is set), the affected target is skipped
  with a warning so the rest of the pipeline still produces the available
  artifacts:
  ```
  cordova:build: required toolchain for the "ios" target is unavailable
  (Xcode command-line tools (xcodebuild) on macOS). Skipping the ios target on
  this Jenkins agent.
  ```
- On a **local** machine, the missing toolchain is fatal so you see the missing
  dependency:
  ```
  cordova:build: required toolchain for the "android" target is unavailable
  (Android SDK (ANDROID_SDK_ROOT + JAVA_HOME)).
  ```

Separately, requesting an **iOS build on a non-macOS host** fails fast:

```
cordova:build:ios requires macOS (darwin); current host platform is "win32".
```

An `all` build on a non-macOS host drops the iOS target with a warning and builds
Android only.

### Signing variable errors

`release` builds must have the platform signing secrets in the environment. If
any are missing, the build fails before invoking the CLI with a message naming
the missing variable(s):

```
cordova:build:android:release is missing required signing variable(s):
ANDROID_KEYSTORE_PATH, ANDROID_KEY_ALIAS.
```

Required variables:

- **Android** (`release`): `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- **iOS** (`release`): `IOS_SIGNING_IDENTITY`, `IOS_PROVISIONING_PROFILE`.

`debug` builds skip signing entirely (Cordova's default debug keystore signs
Android; iOS simulator builds need no signing identity). In Jenkins these secrets
are supplied through `withCredentials` bindings and are never stored in version
control. Signing secret values are redacted from hook logs and the emitted
artifacts are scanned to ensure no secret leaks into a build output.

### Plugin declarations out of sync

If a plugin appears in only one of `package.json` / `config.xml`, or is pinned
with a range operator instead of an exact `MAJOR.MINOR.PATCH` version, the
`before_prepare` hook fails the build naming each offender:

```
Cordova plugin declarations are out of sync between package.json and config.xml:
  - plugin "cordova-plugin-file" is missing from config.xml
```

Declare every plugin in both files with matching names and exact version pins.
