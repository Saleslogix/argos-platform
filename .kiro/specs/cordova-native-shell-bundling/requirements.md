# Requirements Document

## Introduction

The Argos SalesLogix mobile product is currently shipped as a browser-based mobile web app. The compiled web app is produced into `products/argos-saleslogix/deploy/` by the existing Grunt + JsBit release pipeline (`build/release.cmd`) and is later wrapped into deployment zips by `grunt bundle` and `grunt lang-pack` for the Infor CRM portal. Customers have asked for installable native mobile applications (Android and iOS) so that the same web app can be distributed through internal MDM channels and the public app stores.

This feature wraps the existing built web app in an Apache Cordova native shell. The Cordova project hosts the unmodified contents of the SalesLogix `deploy/` folder inside its `www/` directory, exposes a vetted set of native capabilities through Cordova plugins (geolocation, network state, splash screen, status bar, in-app browser, file, device), and produces installable artifacts (Android APK and AAB, iOS IPA) from the existing Jenkins pipeline alongside the current web bundles. Web build artifacts must remain unchanged so that customers who deploy the web app to IIS continue to receive identical bits.

A single Cordova project lives in the `cordova/` directory at the monorepo root (sibling to `argos-sdk/`, `products/`, `packages/`, and `tests/`) and is driven by a new Grunt task (`grunt cordova`) that the Jenkinsfile invokes after the existing web build has produced `products/argos-saleslogix/deploy/`. The `cordova/www/` directory is treated as a build artifact and is regenerated from `products/argos-saleslogix/deploy/` on every build.

The Cordova shell ships its own version-controlled `index.html` template at `cordova/www-template/index.html`. Stager copies the `products/argos-saleslogix/deploy/` web content into `cordova/www/` and then overwrites `cordova/www/index.html` with this template. The template mirrors the bootstrap shape of the current `products/argos-saleslogix/index.html` (Soho config, Dojo AMD configuration, package map, `crm/polyfills/index` + `crm/Bootstrap` invocation, supported locales, configuration module, application module, locale files, regional files, root element) and adds the Cordova-specific pieces: a `<script src="cordova.js">` reference and a `deviceready` wrapper around the `crm/Bootstrap` call. The legacy `products/argos-saleslogix/index-phonegap.html` file is treated as a historical reference for the `deviceready` pattern only and is not copied into the Cordova bundle, because its localization configuration, `dojoConfig` shim, and `<body>` placement are out of date relative to the current `index.html`.

## Glossary

- **Argos_Web_App**: The compiled mobile web application produced by `build\release.cmd` into `products/argos-saleslogix/deploy/`. Contents include `index.html`, `content/`, `configuration/`, `localization/`, and `help/`.
- **Cordova_Shell**: The Apache Cordova project located at `cordova/` at the monorepo root (sibling to `argos-sdk/`, `products/`, `packages/`, and `tests/`) that wraps Argos_Web_App into native Android and iOS applications.
- **Cordova_WWW**: The `cordova/www/` directory inside Cordova_Shell. Cordova copies the contents of Cordova_WWW into the platform-specific WebView asset folders during `cordova prepare`.
- **Stager**: The Grunt task `cordova:stage` that synchronises the contents of `products/argos-saleslogix/deploy/` into Cordova_WWW and rewrites the WebView entry document.
- **Cordova_Entry_Template**: The version-controlled HTML file at `cordova/www-template/index.html` that Stager copies over the staged `cordova/www/index.html` to add the Cordova script reference and `deviceready` wrapper to the standard web bootstrap.
- **Cordova_Build**: The Grunt task `cordova:build` that runs `cordova prepare` and `cordova build` for each requested platform and emits installable artifacts.
- **Cordova_Config**: The `config.xml` file at the root of Cordova_Shell that declares the application id, version, allowed navigations, content security policy, plugins, platforms, and platform-specific preferences.
- **Native_Artifact**: An installable native binary produced by Cordova_Build. For Android, this is an `.apk` file (debug) and an `.aab` file (release). For iOS, this is an `.ipa` file.
- **Plugin_Set**: The set of Cordova plugins required by Argos_Web_App. The minimum Plugin_Set is: `cordova-plugin-device`, `cordova-plugin-network-information`, `cordova-plugin-statusbar`, `cordova-plugin-splashscreen`, `cordova-plugin-inappbrowser`, `cordova-plugin-file`, `cordova-plugin-geolocation`, and `cordova-plugin-whitelist` (or its successor on the target Cordova version).
- **Server_Endpoint**: The SData server hostname, port, protocol, virtual directory, and Mingle settings that Argos_Web_App uses to communicate with the SalesLogix backend, as defined in `products/argos-saleslogix/configuration/production.default.js`.
- **Build_Profile**: A named build configuration (`debug` or `release`) that controls signing, minification, and the source `configuration/*.js` file used at runtime.
- **Signing_Configuration**: The platform-specific credentials used to sign Native_Artifact. For Android, a keystore file plus key alias and passwords. For iOS, an Apple Developer signing identity and provisioning profile.
- **Jenkins_Pipeline**: The build pipeline defined in `Jenkinsfile` at the repository root.
- **Cordova_Stage**: A new stage added to Jenkins_Pipeline that invokes Cordova_Build after the existing `Building argos-saleslogix` stage and publishes Native_Artifact to the build server share.

## Requirements

### Requirement 1: Cordova Project Layout

**User Story:** As a build engineer, I want the Cordova project to live at the monorepo root, so that the native shell is versioned and built alongside the web app it wraps.

#### Acceptance Criteria

1. THE Cordova_Shell SHALL reside at `cordova/` at the monorepo root, as a sibling to `argos-sdk/`, `products/`, `packages/`, and `tests/`.
2. THE Cordova_Shell SHALL contain a `config.xml` file, a `package.json` file declaring the Cordova CLI version and Plugin_Set, and a `www/` directory.
3. THE Cordova_Shell SHALL declare an application id of `com.infor.crm.mobile` in Cordova_Config.
4. THE Cordova_Shell SHALL declare an application display name of `Infor CRM SLX` in Cordova_Config.
5. THE Cordova_Shell SHALL derive the application version in Cordova_Config from the `version` field of `products/argos-saleslogix/package.json` at build time.
6. THE Cordova_Shell SHALL exclude generated content from version control by listing `cordova/www/`, `cordova/platforms/`, `cordova/plugins/`, and `cordova/node_modules/` in the monorepo root `.gitignore`.
7. THE Cordova_Shell SHALL keep `config.xml`, hook scripts, platform resources (icons, splash images), and `package.json` under version control.

### Requirement 2: Platform Support

**User Story:** As a product owner, I want the Cordova shell to support Android and iOS, so that the application is available on the two platforms our enterprise customers deploy to.

#### Acceptance Criteria

1. THE Cordova_Shell SHALL declare `android` and `ios` as supported platforms in Cordova_Config.
2. THE Cordova_Shell SHALL pin the `cordova-android` platform version in `package.json`.
3. THE Cordova_Shell SHALL pin the `cordova-ios` platform version in `package.json`.
4. THE Cordova_Shell SHALL declare a minimum Android SDK version of 24 (Android 7.0) in Cordova_Config.
5. THE Cordova_Shell SHALL declare a target Android SDK version that satisfies the current Google Play submission policy in Cordova_Config.
6. THE Cordova_Shell SHALL declare a minimum iOS deployment target of 13.0 in Cordova_Config.
7. WHERE a build is requested for a platform that is not declared in Cordova_Config, Cordova_Build SHALL fail with a non-zero exit code and an error message that names the unsupported platform.

### Requirement 3: Staging the Web App into Cordova_WWW

**User Story:** As a build engineer, I want the Cordova shell to host the same web bits that we ship to IIS, so that I do not maintain a second copy of the web application.

#### Acceptance Criteria

1. WHEN Stager runs, THE Stager SHALL delete the existing contents of Cordova_WWW before copying new content.
2. WHEN Stager runs, THE Stager SHALL copy every file from `products/argos-saleslogix/deploy/` into Cordova_WWW preserving the relative directory structure.
3. WHEN Stager runs, THE Stager SHALL copy Cordova_Entry_Template (`cordova/www-template/index.html`) to `cordova/www/index.html`, overwriting the staged web `index.html`.
4. IF `products/argos-saleslogix/deploy/` does not exist when Stager runs, THEN THE Stager SHALL fail with a non-zero exit code and an error message instructing the operator to run the SalesLogix release build first.
5. THE Stager SHALL exclude server-only files `web.config`, `Global.asax`, `index.aspx`, `index.aspx.cs`, `index-head.ascx`, `index-body.ascx`, `index-body.ascx.cs`, and `scripts/iis.ps1` from Cordova_WWW.
6. THE Stager SHALL exclude `serviceworker.js` from Cordova_WWW so that the WebView does not attempt to register a service worker on the `file://` origin.
7. THE Stager SHALL not modify any file under `products/argos-saleslogix/deploy/`.

### Requirement 4: WebView Entry Document and Bootstrap

**User Story:** As a developer, I want the Cordova WebView to wait for `deviceready` before starting the application, so that the application starts only when native APIs are available, while keeping the bootstrap shape aligned with the current web `index.html`.

#### Acceptance Criteria

1. THE Cordova_WWW SHALL contain `cordova.js` at its root path so that the `<script src="cordova.js">` tag in Cordova_Entry_Template resolves at runtime. (Cordova injects `cordova.js` automatically during `cordova prepare`; this requirement records the dependency.)
2. THE Cordova_Entry_Template SHALL declare the same Soho configuration block, Dojo AMD `require` configuration (packages, map, baseUrl), polyfill imports, supported locales, default and current locale resolution from `window.localStorage`, and `crm/Bootstrap` configuration shape (configuration module `configuration/production`, application module `crm/Application`, locale files, regional files, legacy localization paths, root element id `rootNode`) as the current `products/argos-saleslogix/index.html`, so that the Cordova bootstrap and the web bootstrap diverge only in the Cordova-specific guard added by criteria 3 through 6.
3. WHEN the Cordova WebView loads `index.html`, THE Cordova_Entry_Template SHALL register a `deviceready` listener and SHALL defer calling `crm/Bootstrap` until either the `deviceready` event fires or the fallback timeout in criterion 4 elapses.
4. IF the `deviceready` event has not fired within 10000 milliseconds of `DOMContentLoaded`, THEN THE Cordova_Entry_Template SHALL log a console warning that names the `deviceready` timeout and SHALL invoke `crm/Bootstrap` so that running the same `index.html` in a desktop browser for diagnostic purposes does not hang.
5. THE Cordova_Entry_Template SHALL invoke `crm/Bootstrap` exactly once per page load regardless of whether the trigger is `deviceready` or the fallback timeout, by guarding the call with a flag set on first invocation.
6. THE Cordova_Entry_Template SHALL NOT copy logic verbatim from the legacy `products/argos-saleslogix/index-phonegap.html` file; it MAY reference the `deviceready` listener pattern from that file as a starting point only.

### Requirement 5: Cordova Plugin Set

**User Story:** As a developer, I want the Cordova shell to install the native plugins the web app already uses, so that runtime feature detection succeeds inside the WebView.

#### Acceptance Criteria

1. THE Cordova_Shell SHALL declare `cordova-plugin-device` in Cordova_Config and `package.json`.
2. THE Cordova_Shell SHALL declare `cordova-plugin-network-information` in Cordova_Config and `package.json` so that Argos_Web_App can detect online and offline transitions through the `online`, `offline`, and `Connection` APIs.
3. THE Cordova_Shell SHALL declare `cordova-plugin-statusbar` in Cordova_Config and `package.json`.
4. THE Cordova_Shell SHALL declare `cordova-plugin-splashscreen` in Cordova_Config and `package.json`.
5. THE Cordova_Shell SHALL declare `cordova-plugin-inappbrowser` in Cordova_Config and `package.json` so that external links and Mingle OAuth redirects open in the in-app browser instead of replacing the application WebView.
6. THE Cordova_Shell SHALL declare `cordova-plugin-file` in Cordova_Config and `package.json` so that PouchDB and the FileManager have access to the persistent file system on platforms that require it.
7. THE Cordova_Shell SHALL declare `cordova-plugin-geolocation` in Cordova_Config and `package.json` so that the existing `navigator.geolocation` call in `src/Integrations/Contour/Views/PxSearch/AccountPxSearch.js` resolves on iOS and Android WebViews that gate access behind native permissions.
8. THE Cordova_Shell SHALL pin every plugin in Plugin_Set to an exact semantic version (MAJOR.MINOR.PATCH, with no range operators such as `^`, `~`, `>`, `<`, `>=`, `<=`, or `*`) in `package.json`.
9. WHERE a plugin in Plugin_Set requires a runtime permission on Android, Cordova_Config SHALL declare the corresponding `<uses-permission>` entry in the Android platform configuration, including `android.permission.ACCESS_FINE_LOCATION` and `android.permission.ACCESS_COARSE_LOCATION` for `cordova-plugin-geolocation`.
10. WHERE `cordova-plugin-geolocation` is declared in Plugin_Set, Cordova_Config SHALL declare a non-empty `NSLocationWhenInUseUsageDescription` value in the iOS platform configuration that names the application and states the reason location access is requested.
11. IF a plugin declared in Plugin_Set is missing from `package.json` or from Cordova_Config when Cordova_Build runs, THEN THE Cordova_Build SHALL fail with a non-zero exit code and an error message that names the missing plugin and the file in which the declaration is missing.

### Requirement 6: Content Security and Allowed Origins

**User Story:** As a security reviewer, I want the Cordova shell to restrict which origins the WebView may load, so that the application cannot be redirected to an unexpected host.

#### Acceptance Criteria

1. THE Cordova_Config SHALL declare an `<access origin="...">` entry for each Server_Endpoint host that Argos_Web_App is allowed to call.
2. THE Cordova_Config SHALL declare `<allow-navigation href="...">` entries restricted to the configured Server_Endpoint hosts and to the Mingle authorization host configured in `mingleSettings.pu`.
3. THE Cordova_Config SHALL declare `<allow-intent href="https://*/*">` and `<allow-intent href="http://*/*">` so that external links opened through `cordova-plugin-inappbrowser` with `target="_system"` launch the device browser.
4. THE Cordova_Config SHALL declare a Content Security Policy meta tag value in the staged `index.html` that allows `'self'`, `gap:`, and the configured Server_Endpoint hosts, and that allows `'unsafe-eval'` for the Dojo AMD loader.
5. IF a runtime navigation attempts to load an origin not present in the `<allow-navigation>` set, THEN THE Cordova_Shell SHALL block the navigation and the existing whitelist plugin SHALL log the rejected origin.

### Requirement 7: Server and Environment Configuration

**User Story:** As a deployment engineer, I want to configure the SData server URL the native app connects to without rebuilding the web app, so that one binary can be retargeted to multiple customer environments when permitted.

#### Acceptance Criteria

1. THE Cordova_Shell SHALL load runtime configuration from the AMD module path `configuration/production` using the same `require` invocation pattern that the current `products/argos-saleslogix/index.html` uses for `crm/Bootstrap`.
2. WHEN Cordova_Build runs with Build_Profile `release`, THE Stager SHALL copy `products/argos-saleslogix/deploy/configuration/production.js` to `cordova/www/configuration/production.js`.
3. WHEN Cordova_Build runs with Build_Profile `debug`, THE Stager SHALL copy `products/argos-saleslogix/deploy/configuration/development.js` to `cordova/www/configuration/production.js` so that the AMD module path `configuration/production` resolves to the development configuration content.
4. WHEN Stager runs and any of the environment variables `ARGOS_SERVER_NAME`, `ARGOS_SERVER_PORT`, `ARGOS_SERVER_PROTOCOL`, or `ARGOS_SERVER_VDIR` is set to a non-empty value, THE Stager SHALL substitute that variable's value into the corresponding `serverName`, `port`, `protocol`, or `virtualDirectory` field of the `connections.crm` block in `cordova/www/configuration/production.js` before Cordova_Build packages Cordova_WWW.
5. IF `ARGOS_SERVER_PORT` is set to a non-empty value that is not an integer between 1 and 65535, OR IF `ARGOS_SERVER_PROTOCOL` is set to a non-empty value that is not exactly `http` or `https`, THEN THE Stager SHALL fail with a non-zero exit code and an error message that names the invalid environment variable, and SHALL leave `cordova/www/configuration/production.js` in the state produced by criterion 2 or 3.
6. IF none of the `ARGOS_SERVER_NAME`, `ARGOS_SERVER_PORT`, `ARGOS_SERVER_PROTOCOL`, or `ARGOS_SERVER_VDIR` environment variables are set to a non-empty value when Stager runs, THEN THE Stager SHALL leave the staged `cordova/www/configuration/production.js` byte-for-byte identical to the file copied in criterion 2 or 3 so that the existing `window.location.hostname` defaults apply only to the web build.
7. WHEN Argos_Web_App starts inside Cordova_Shell, THE Argos_Web_App SHALL resolve `serverName`, `port`, `protocol`, and `virtualDirectory` for the `crm` connection from explicit string values declared in the staged `configuration/production.js` rather than from `window.location` properties, because `window.location.hostname` resolves to the local file system origin under Cordova and is not a valid SData host.
8. THE Cordova_Shell SHALL document, in `cordova/README.md`, every supported `ARGOS_SERVER_*` override variable, its accepted value range, and the default Server_Endpoint values applied when no override is set.

### Requirement 8: Offline Behaviour Continuity

**User Story:** As an end user, I want the briefcased data and offline behaviour I get in the web app to keep working in the native app, so that I can use the application when I do not have a connection.

#### Acceptance Criteria

1. WHEN Argos_Web_App runs inside Cordova_Shell, THE Argos_Web_App SHALL use the same PouchDB IndexedDB adapter that the web build uses, with the same database names.
2. WHEN the device transitions from online to offline, THE Argos_Web_App SHALL receive an `offline` window event from `cordova-plugin-network-information` within 5 seconds of the transition.
3. WHEN the device transitions from offline to online, THE Argos_Web_App SHALL receive an `online` window event from `cordova-plugin-network-information` within 5 seconds of the transition.
4. THE Cordova_Shell SHALL not register a service worker because the staging step in Requirement 3.6 excludes `serviceworker.js`, and Cordova_Entry_Template does not call `navigator.serviceWorker.register`.
5. THE Cordova_Shell SHALL preserve PouchDB data across application restarts on both Android and iOS by declaring `cordova-plugin-file` and by leaving the platform default WebView storage location unchanged.

### Requirement 9: Authentication Flow Continuity

**User Story:** As an end user, I want to sign in to the native app using the same credentials and Mingle SSO flow that the web app supports, so that my organisation's authentication policy is honoured.

#### Acceptance Criteria

1. WHEN Argos_Web_App runs inside Cordova_Shell with Mingle disabled, THE Argos_Web_App SHALL present the existing username and password login view and SHALL POST credentials to the configured Server_Endpoint over HTTPS.
2. WHERE Mingle SSO is enabled in `configuration/production.js`, THE Cordova_Shell SHALL open the Mingle authorisation URL with `cordova-plugin-inappbrowser` configured for an in-app modal presentation rather than redirecting the application WebView.
3. WHEN the Mingle authorisation flow returns to `mingleRedirectUrl`, THE Cordova_Shell SHALL intercept the navigation in the in-app browser, extract the OAuth `access_token` and `expires_in` query parameters, close the in-app browser, and forward the token to the existing `MingleUtility` token handler in Argos_Web_App.
4. THE Cordova_Shell SHALL register a custom URL scheme `infor-crm-slx://oauth/callback` for the Mingle redirect URL so that mobile redirects work without an externally reachable web origin.
5. IF the in-app browser closes before a token is received, THEN THE Cordova_Shell SHALL return the user to the login view and SHALL log a `mingle_auth_cancelled` event to the console.
6. THE Cordova_Shell SHALL persist the access token using the same `localStorage` keys that Argos_Web_App already uses so that token refresh logic works without modification.

### Requirement 10: Grunt Build Integration

**User Story:** As a build engineer, I want Cordova builds to run from the existing Grunt task graph, so that the Jenkins pipeline can invoke them with the same conventions as the web build.

#### Acceptance Criteria

1. THE Cordova_Shell SHALL register a `cordova:install` Grunt task that runs `npm install` inside `cordova/`.
2. THE Cordova_Shell SHALL register a `cordova:stage` Grunt task that performs the staging behaviour defined in Requirement 3.
3. THE Cordova_Shell SHALL register a `cordova:prepare` Grunt task that runs `cordova prepare` inside `cordova/`.
4. THE Cordova_Shell SHALL register a `cordova:build` Grunt task that accepts `:android`, `:ios`, and `:all` targets and a `:debug` or `:release` Build_Profile suffix.
5. THE Cordova_Shell SHALL register a `cordova` alias Grunt task that runs `cordova:install`, `cordova:stage`, `cordova:prepare`, and `cordova:build:all:release` in that order.
6. WHEN a build target is `ios` and the host operating system is not macOS, THE `cordova:build:ios` task SHALL fail with a non-zero exit code and an error message identifying the platform mismatch, matching the existing pattern in `grunt-tasks/grunt-shell.js` that throws on non-windows for the `bundle` task.
7. THE `cordova:build` Grunt task SHALL emit Native_Artifact files to a `cordova/dist/` directory and SHALL not write to `products/argos-saleslogix/deploy/`.
8. THE Cordova_Shell SHALL not require changes to the existing `build/release.cmd` script.

### Requirement 11: Native Artifacts and Signing

**User Story:** As a release manager, I want the Cordova build to produce signed installable artifacts, so that they can be distributed through MDM and app stores without further manual steps.

#### Acceptance Criteria

1. WHEN Cordova_Build runs for Android with Build_Profile `release`, THE Cordova_Build SHALL produce both an `.apk` and an `.aab` artifact in `cordova/dist/android/`.
2. WHEN Cordova_Build runs for iOS with Build_Profile `release`, THE Cordova_Build SHALL produce an `.ipa` artifact in `cordova/dist/ios/`.
3. THE Native_Artifact filenames SHALL include the application version from `products/argos-saleslogix/package.json` and the Jenkins `BUILD_NUMBER` value when set.
4. WHEN Cordova_Build runs for Android with Build_Profile `release`, THE Cordova_Build SHALL sign the Android Native_Artifact using a Signing_Configuration whose keystore path, alias, and passwords are read from environment variables (`ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).
5. WHEN Cordova_Build runs for iOS with Build_Profile `release`, THE Cordova_Build SHALL sign the iOS Native_Artifact using a Signing_Configuration whose code-signing identity and provisioning profile UUID are read from environment variables (`IOS_SIGNING_IDENTITY`, `IOS_PROVISIONING_PROFILE`).
6. IF a required signing environment variable is missing for the requested Build_Profile, THEN THE Cordova_Build SHALL fail with a non-zero exit code and an error message that names the missing variable.
7. WHEN Cordova_Build runs with Build_Profile `debug`, THE Cordova_Build SHALL sign Android Native_Artifact with the Cordova default debug keystore and SHALL skip iOS signing requirements that are unnecessary for simulator builds.
8. THE Cordova_Build SHALL not embed any Signing_Configuration secret value in any Native_Artifact, build log, or file under version control.

### Requirement 12: Jenkins CI Integration

**User Story:** As a build engineer, I want the existing Jenkins pipeline to produce Native_Artifact files alongside the existing web bundles, so that we deliver web and native outputs from a single build.

#### Acceptance Criteria

1. THE Jenkins_Pipeline SHALL invoke Cordova_Stage after the existing `Building argos-saleslogix` stage and after the `Creating bundles` stage have completed successfully.
2. WHEN Cordova_Stage runs, THE Jenkins_Pipeline SHALL execute `npm run cordova` (or the equivalent `grunt cordova` invocation) inside `cordova/`.
3. WHEN Cordova_Stage runs on a Jenkins agent that lacks the Android SDK or Xcode toolchain, THE Jenkins_Pipeline SHALL skip the corresponding platform target and SHALL emit a warning that names the missing toolchain rather than failing the entire pipeline.
4. WHEN Cordova_Stage produces Native_Artifact files, THE Jenkins_Pipeline SHALL copy them to `\\usdavwtldata.testlogix.com\devbuilds\builds\mobile\bundles\%BRANCH_NAME%\%BUILD_NUMBER%\native\` using `robocopy` with the same retry settings (`/r:3 /w:5`) used by the existing bundle copy step.
5. WHEN Cordova_Stage produces Native_Artifact files, THE Jenkins_Pipeline SHALL `stash` them under the name `cordova` so that downstream Jenkins stages can `unstash` them.
6. IF Cordova_Stage fails, THEN THE Jenkins_Pipeline SHALL mark the build as failed and SHALL preserve the existing web bundles already produced earlier in the pipeline.
7. THE Jenkins_Pipeline SHALL read Signing_Configuration secrets through Jenkins `withCredentials` bindings and SHALL not store them in `Jenkinsfile` or in any file under version control.

### Requirement 13: Local Developer Experience

**User Story:** As a developer, I want to run the Cordova shell on a local emulator or device, so that I can verify a change without going through Jenkins.

#### Acceptance Criteria

1. THE Cordova_Shell SHALL document a single command (`npm run cordova:run:android` and `npm run cordova:run:ios`) that runs the staged application on a connected device or emulator.
2. WHEN a developer runs `npm run cordova:run:android` from `cordova/` after a successful web build, THE Cordova_Shell SHALL stage Cordova_WWW, run `cordova prepare android`, and run `cordova run android` in that order.
3. WHEN a developer runs `npm run cordova:run:ios` from `cordova/` on macOS after a successful web build, THE Cordova_Shell SHALL stage Cordova_WWW, run `cordova prepare ios`, and run `cordova run ios` in that order.
4. THE Cordova_Shell SHALL expose a way to point the staged application at a developer SData server through the `ARGOS_SERVER_*` environment variables defined in Requirement 7.
5. WHERE the developer sets `ARGOS_LIVE_RELOAD=1`, THE Cordova_Shell SHALL configure the WebView to load the application from the developer's `npm start` URL (default `http://localhost:8000/products/argos-saleslogix/`) instead of from the staged `www/` so that source edits do not require a rebuild.

### Requirement 14: Versioning and Branding

**User Story:** As a release manager, I want the native artifacts to carry the same version metadata as the web build, so that customer support can correlate a reported issue to a specific build.

#### Acceptance Criteria

1. THE Cordova_Shell SHALL set the Cordova_Config `version` attribute to the value of the `version` field in `products/argos-saleslogix/package.json` at build time.
2. THE Cordova_Shell SHALL set the Cordova_Config Android `android-versionCode` attribute to a monotonically increasing integer derived from the Jenkins `BUILD_NUMBER` environment variable when set, and to `1` otherwise.
3. THE Cordova_Shell SHALL set the Cordova_Config iOS `ios-CFBundleVersion` attribute to the same value used for `android-versionCode`.
4. THE Cordova_Shell SHALL ship application icons for Android (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) and iOS (all sizes required by App Store submission) under `cordova/resources/`.
5. THE Cordova_Shell SHALL ship splash screens for Android and iOS under `cordova/resources/` and SHALL reference them from Cordova_Config.

### Requirement 15: Documentation

**User Story:** As a new team member, I want to know how to build and run the Cordova shell, so that I can contribute without tribal knowledge.

#### Acceptance Criteria

1. THE Cordova_Shell SHALL contain a `README.md` at `cordova/README.md` that describes prerequisites (Node version, Cordova CLI version, Android SDK version, Xcode version), build commands, environment variable overrides, and troubleshooting steps.
2. THE `README.md` SHALL list every plugin in Plugin_Set with a one-line justification of why Argos_Web_App needs it.
3. THE `README.md` SHALL document the Mingle redirect scheme registered in Requirement 9.4 and SHALL describe the configuration changes required on the Mingle side to authorise the scheme.
4. THE root-level `README.md` of the monorepo SHALL link to `cordova/README.md` from the build instructions section.

## Open Questions and Assumptions

The following assumptions were made while drafting these requirements. Each is called out so reviewers can confirm or correct before the design phase begins:

1. **Platform set**: Android and iOS only. Windows UWP and Electron are not included.
2. **Application id**: Assumed `com.infor.crm.mobile`. The actual id must match what is registered with Apple App Store Connect and Google Play Console.
3. **Plugin_Set**: Selected from a static analysis of the codebase (`navigator.geolocation` is used; camera, contacts, push notifications, and barcode scanning are not). If any of those capabilities is planned, additional plugins must be added.
4. **Signing**: Assumed Jenkins runs both Android and iOS builds. If iOS is built on a separate Mac agent, a follow-up requirement will describe stash/unstash between agents.
5. **MDM distribution**: Assumed enterprise MDM distribution rather than public App Store submission. App Store submission imposes additional review and asset requirements that are out of scope for this spec.
6. **Mingle OAuth redirect**: Assumed the Mingle tenant can be reconfigured to accept a custom URL scheme. If the tenant is locked to an HTTPS redirect, an alternative such as Universal Links / Android App Links will be required and should be added as a new requirement.
7. **Service worker**: Excluded from the Cordova bundle. The web build keeps it.
8. **Live reload**: Optional convenience for developers; not required for production.
9. **Legacy `index-phonegap.html`**: The existing `products/argos-saleslogix/index-phonegap.html` file is **not** reused. It is not copied into `deploy/` by `build/release.cmd` on Windows (only the unused Linux `release.sh` ever copied it), and its bootstrap is out of date relative to the current `index.html` (mixes string and regional files, omits `icboe`/`contour` strings, includes a `localization/en` legacy path the modern `index.html` dropped, declares an inline `dojoConfig` shim, and places `<body>` in the wrong scope). The Cordova shell ships its own version-controlled entry template at `cordova/www-template/index.html` that mirrors the current `index.html` and adds only the Cordova guard. The legacy file is treated as a historical reference for the `deviceready` pattern only.
