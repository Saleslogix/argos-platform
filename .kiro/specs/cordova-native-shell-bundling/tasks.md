# Implementation Plan: Cordova Native Shell Bundling

## Overview

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

The plan starts by scaffolding the top-level `cordova/` directory (sibling to `argos-sdk/`, `products/`, `packages/`, and `tests/`) and the pure-Node helper layer (`cordova/lib/`), then layers the version-controlled authoring assets (`config.xml`, entry template, resources, README) and Cordova hooks on top, then creates the Cordova-specific Grunt task pipeline (`cordova/Gruntfile.js`, `cordova/grunt-tasks/grunt-cordova.js`, `cordova/grunt-tasks/grunt-shell.js`) and npm scripts in `cordova/package.json`, and finally wires the Cordova stage into the Jenkinsfile via a `dir('cordova')` block. The web build under `products/argos-saleslogix/` is not modified by any task in this plan; the Cordova shell only reads `products/argos-saleslogix/deploy/` as a read-only input. Every helper has a property test sub-task that maps directly to one of the twelve correctness properties in the design. Configuration and entry-template structural checks are unit tests. Integration / device-driven verification is intentionally out of scope for this code-only plan.

Implementation language is JavaScript / Node (AMD is not used in `cordova/lib/`; the helpers are CommonJS Node modules consumed by Grunt). The web app inside the WebView keeps the existing AMD bootstrap unchanged.

## Tasks

- [x] 1. Scaffold the Cordova project skeleton
  - [x] 1.1 Create the top-level `cordova/` directory layout
    - Create empty directories at the monorepo root: `cordova/`, `cordova/lib/`, `cordova/tests/unit/`, `cordova/www-template/`, `cordova/resources/android/`, `cordova/resources/ios/`, `cordova/hooks/before_prepare/`, `cordova/hooks/after_build/`, `cordova/grunt-tasks/`
    - Add a placeholder `.gitkeep` only where required by git to track empty directories that hold no version-controlled files yet
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Append generated-content exclusions to the monorepo root `.gitignore`
    - Edit the root `.gitignore` (sibling to `argos-sdk/`, `products/`, `packages/`, and `tests/`)
    - Add lines for `cordova/www/`, `cordova/platforms/`, `cordova/plugins/`, `cordova/node_modules/`, `cordova/dist/`
    - Preserve all existing entries
    - _Requirements: 1.6_

  - [x] 1.3 Create `cordova/package.json`
    - Declare an exact `cordova` CLI version under `devDependencies`
    - Declare `cordova-android` and `cordova-ios` engines as dev dependencies pinned to exact `MAJOR.MINOR.PATCH` values
    - Declare every plugin in Plugin_Set (`cordova-plugin-device`, `cordova-plugin-network-information`, `cordova-plugin-statusbar`, `cordova-plugin-splashscreen`, `cordova-plugin-inappbrowser`, `cordova-plugin-file`, `cordova-plugin-geolocation`, `cordova-plugin-whitelist`) under `dependencies` pinned to exact `MAJOR.MINOR.PATCH` values (no `^`, `~`, `>`, `<`, `>=`, `<=`, `*`, ` `, `|`)
    - Declare `cordova` configuration block listing the same plugins so the Cordova CLI recognises them
    - Set `name`, `description`, and a minimal `scripts` block (the cordova:* npm scripts are added in task 6.4 once the Grunt tasks exist)
    - _Requirements: 1.2, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 2. Implement the pure-Node build helpers in `cordova/lib/`
  - [x] 2.1 Implement `cordova/lib/version.js`
    - Export `resolveVersion(pkgJson)` returning `pkgJson.version` as a string
    - Export `resolveVersionCode(env)` returning `parseInt(env.BUILD_NUMBER, 10)` when `BUILD_NUMBER` parses as a positive integer ≥ 1, otherwise `1`
    - _Requirements: 1.5, 14.1, 14.2, 14.3_

  - [ ]* 2.2 Write property test for Version Resolver
    - **Property 5: Version Resolver**
    - **Validates: Requirements 1.5, 14.1, 14.2, 14.3**
    - File: `cordova/tests/unit/version.property.test.js`
    - Use Mocha + `fast-check`, minimum 100 runs, shrinking enabled
    - Tag with comment `Feature: cordova-native-shell-bundling, Property 5: Version Resolver`

  - [x] 2.3 Implement `cordova/lib/configRewriter.js`
    - Export `validate(env)` enforcing `ARGOS_SERVER_PORT` is empty / unset / decimal integer in `[1, 65535]` and `ARGOS_SERVER_PROTOCOL` is empty / unset / `http` / `https`; return `{ valid: false, variable, reason }` otherwise
    - Export `rewrite(source, env)` that runs `validate(env)` first (throwing `RewriteError` with code `INVALID_ENV` on failure) and substitutes the four `ARGOS_SERVER_*` non-empty values into the `connections.crm` block via text-level regex replacement of the `serverName`, `port`, `protocol`, and `virtualDirectory` assignment expressions
    - Guarantee byte-for-byte identity (`rewrite(source, env) === source`) when every value in `env` is empty / unset
    - _Requirements: 7.4, 7.5, 7.6_

  - [ ]* 2.4 Write property test for Config Rewriter
    - **Property 2: Config Rewriter Validity and Substitution**
    - **Validates: Requirements 7.4, 7.5, 7.6**
    - File: `cordova/tests/unit/configRewriter.property.test.js`
    - Generate realistic `connections.crm` source snippets and `ARGOS_SERVER_*` env shapes; assert validity, substitution, and the byte-for-byte no-op invariant
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.5 Implement `cordova/lib/pluginCheck.js`
    - Export `diff(pkgJson, configXml)` returning `{ ok, missing }` where `missing` lists every plugin present in only one of the two files, with the `file` field naming the file in which the plugin is absent
    - Parse `config.xml` plugin set with a lightweight regex over `<plugin name="...">` rather than a full XML parser to keep the helper dependency-free
    - Export `validatePinFormat(pkgJson)` returning `{ ok, offenders }` where `offenders` lists every dependency whose value contains any of `^`, `~`, `>`, `<`, `=`, `*`, ` `, `|` or fails the regex `^\d+\.\d+\.\d+$`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.11_

  - [ ]* 2.6 Write property test for Plugin Cross-Check
    - **Property 3: Plugin Cross-Check**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.11**
    - File: `cordova/tests/unit/pluginCheck.diff.property.test.js`
    - Generate arbitrary plugin name sets for `package.json` and `config.xml` and assert the symmetric-difference contract
    - Use Mocha + `fast-check`, minimum 100 runs

  - [ ]* 2.7 Write property test for Plugin Pin Format
    - **Property 4: Plugin Pin Format**
    - **Validates: Requirements 5.8**
    - File: `cordova/tests/unit/pluginCheck.pin.property.test.js`
    - Generate dependency-version maps mixing valid exact-semver and invalid range strings; assert `validatePinFormat` reports every offender
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.8 Implement `cordova/lib/stager.js`
    - Export `EXCLUDED_FILES` exactly as listed in design (`web.config`, `Global.asax`, `index.aspx`, `index.aspx.cs`, `index-head.ascx`, `index-body.ascx`, `index-body.ascx.cs`, `scripts/iis.ps1`, `serviceworker.js`)
    - Export `StagerError` class with a `code` field
    - Export `async stage({ deployDir, sdkDeployDir, wwwDir, templatePath, buildProfile, env })` implementing the algorithm: assert `deployDir` exists (throw `MISSING_DEPLOY` otherwise) → when `sdkDeployDir` is provided assert it exists (throw `MISSING_SDK_DEPLOY` otherwise) → recursively delete and recreate `wwwDir` → walk `deployDir` copying every file whose POSIX-relative path is not in `EXCLUDED_FILES` → when `sdkDeployDir` is provided overlay it into `wwwDir` (same exclusion list; SDK wins on collision) → copy `templatePath` over `wwwDir/index.html` → if `buildProfile === 'debug'` overwrite `wwwDir/configuration/production.js` with the contents of `deployDir/configuration/development.js` → if any of `ARGOS_SERVER_*` is non-empty validate via `configRewriter.validate` then write `configRewriter.rewrite(...)` over `wwwDir/configuration/production.js` → return `{ filesCopied }` (both layers)
    - `sdkDeployDir` is optional so the property test can exercise the single-layer contract; the `cordova:stage` Grunt task always passes `argos-sdk/deploy/`
    - Use POSIX-style relative paths for the exclusion check on every host OS
    - Never write under `deployDir` or `sdkDeployDir`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 2.9 Write property test for Stager
    - **Property 1: Stager Correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9, 3.11, 7.2, 7.3**
    - File: `cordova/tests/unit/stager.property.test.js`
    - Use `memfs` (or equivalent in-memory FS) so 100 iterations remain fast and never touch real disk
    - Generate arbitrary deploy-tree shapes including files with names from `EXCLUDED_FILES`, then assert every non-excluded file is copied byte-for-byte, no excluded file appears in `wwwDir`, `index.html` equals the template, `configuration/production.js` matches the profile-appropriate source, and `deployDir` is unchanged
    - Add a second generator that also provides an `sdkDeployDir` tree and assert the overlay contract: every non-excluded SDK file appears byte-for-byte, SDK wins on any shared path, and `sdkDeployDir` is unchanged; also assert `MISSING_SDK_DEPLOY` is thrown when a provided `sdkDeployDir` does not exist
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.10 Implement `cordova/lib/mingleRedirect.js`
    - Export `parseRedirect(url)` returning `{ accessToken, expiresIn }` extracted from the `access_token` and `expires_in` query parameters of a redirect URL; return `null` when the URL does not match `infor-crm-slx://oauth/callback` or lacks both parameters
    - Export `composeRedirect(baseUrl, { accessToken, expiresIn })` for the round-trip used by the property test
    - _Requirements: 9.3, 9.4_

  - [ ]* 2.11 Write property test for Mingle Redirect Parser
    - **Property 7: Mingle Redirect Parser Round-Trip**
    - **Validates: Requirements 9.3**
    - File: `cordova/tests/unit/mingleRedirect.property.test.js`
    - Generate `(accessToken, expiresIn, baseRedirectUrl)` triples (with realistic URL-safe alphabets) and assert `parseRedirect(composeRedirect(...)) === { accessToken, expiresIn }`
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.12 Implement `cordova/lib/filename.js`
    - Export `composeArtifactFilename({ version, buildNumber, format })` returning `infor-crm-slx-<version>-<buildNumber>.<format>` where `format ∈ {apk, aab, ipa}` and `buildNumber` defaults to `'0'` when missing
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 2.13 Write property test for Native Artifact Filename Composition
    - **Property 8: Native Artifact Filename Composition**
    - **Validates: Requirements 11.3**
    - File: `cordova/tests/unit/filename.property.test.js`
    - Generate `(version, buildNumber, platform, format)` tuples and assert filename contains `version`, contains `String(buildNumber)`, ends with the correct extension
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.14 Implement `cordova/lib/signing.js`
    - Export `validateAndroidSigning(env)` requiring `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` to be present and non-empty
    - Export `validateIosSigning(env)` requiring `IOS_SIGNING_IDENTITY` and `IOS_PROVISIONING_PROFILE` to be present and non-empty
    - Export `validateSigning({ env, platform, buildProfile })` returning `{ ok: true }` when `buildProfile === 'debug'`, otherwise dispatching to the platform-specific validator and returning `{ ok: false, missing }` listing every missing variable name when applicable
    - _Requirements: 11.4, 11.5, 11.6, 11.7_

  - [ ]* 2.15 Write property test for Signing Configuration Validity
    - **Property 9: Signing Configuration Validity**
    - **Validates: Requirements 11.4, 11.5, 11.6**
    - File: `cordova/tests/unit/signing.property.test.js`
    - Generate arbitrary subsets of the union of Android and iOS signing variables across both build profiles and both platforms
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.16 Implement `cordova/lib/redact.js`
    - Export `redact(line, secret)` returning `line` with every occurrence of the non-empty `secret` substring replaced by `***REDACTED***`, and the original `line` unchanged when `secret` is absent
    - Export `redactAll(line, secrets)` for batch redaction over a list of secrets
    - _Requirements: 11.8_

  - [ ]* 2.17 Write property test for Log Redaction
    - **Property 10: Log Redaction**
    - **Validates: Requirements 11.8**
    - File: `cordova/tests/unit/redact.property.test.js`
    - Generate `(secret, line)` pairs, including lines that contain `secret` zero, one, or many times; assert the output never contains `secret` as a substring and is otherwise equal to the input modulo the redaction marker
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.18 Implement `cordova/lib/toolchain.js`
    - Export `detectToolchains({ env, platform, hasXcodebuild })` returning `{ android, ios }` booleans where `android` is true iff `env.ANDROID_SDK_ROOT` and `env.JAVA_HOME` are both set non-empty, and `ios` is true iff `platform === 'darwin'` and `hasXcodebuild === true`
    - Export `probeXcodebuild()` that returns true when `xcodebuild` is on PATH (synchronous `which` lookup); kept separate so tests can pass an explicit boolean and avoid disk probing
    - _Requirements: 12.3_

  - [ ]* 2.19 Write property test for Toolchain Detection
    - **Property 11: Toolchain Detection**
    - **Validates: Requirements 12.3**
    - File: `cordova/tests/unit/toolchain.property.test.js`
    - Generate environment states (presence/absence of `ANDROID_SDK_ROOT`, `JAVA_HOME`), host platforms, and `hasXcodebuild` booleans
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.20 Implement `cordova/lib/liveReload.js`
    - Export `applyLiveReload(config, env)` returning a new config with `contentSrc` set to `process.env.ARGOS_LIVE_RELOAD_URL || 'http://localhost:8000/products/argos-saleslogix/'` when `env.ARGOS_LIVE_RELOAD` is a non-empty truthy string (`'1'`, `'true'`, `'yes'`, case-insensitive), otherwise returning `config` unchanged
    - _Requirements: 13.5_

  - [ ]* 2.21 Write property test for Live Reload Override
    - **Property 12: Live Reload Override**
    - **Validates: Requirements 13.5**
    - File: `cordova/tests/unit/liveReload.property.test.js`
    - Generate environment states with various truthy / falsy / mixed-case values for `ARGOS_LIVE_RELOAD` and arbitrary base config objects
    - Use Mocha + `fast-check`, minimum 100 runs

  - [x] 2.22 Implement `cordova/lib/bootstrapGuard.js`
    - Export `createBootstrapGuard({ scheduler, console, bootstrap, timeoutMs = 10000 })` that returns `{ onDeviceReady, onDomContentLoaded }` event handlers
    - Internally tracks a `bootstrapped` flag set on first invocation
    - On `deviceready`, invokes `bootstrap()` exactly once
    - On `DOMContentLoaded`, schedules a `scheduler.setTimeout` that, when it fires, invokes `bootstrap()` only if `bootstrapped` is still `false` and writes a `console.warn` naming the `deviceready` timeout
    - Used both by the entry template (via inline expansion) and by the property test (with a fake scheduler)
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]* 2.23 Write property test for Bootstrap Guard Single-Invocation
    - **Property 6: Bootstrap Guard Single-Invocation**
    - **Validates: Requirements 4.3, 4.4, 4.5**
    - File: `cordova/tests/unit/bootstrapGuard.property.test.js`
    - Generate arbitrary event sequences over `{deviceready, fallbackTimeout}` with arbitrary delays; assert `bootstrap()` is called exactly once and the timeout warning is emitted iff the first event is `fallbackTimeout`
    - Drive `setTimeout` through a fake scheduler; do not use real timers
    - Use Mocha + `fast-check`, minimum 100 runs

- [ ] 3. Checkpoint - helpers complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Author static Cordova assets
  - [x] 4.1 Create `cordova/config.xml`
    - Declare `<widget id="com.infor.crm.mobile" version="${VERSION}" android-versionCode="${VERSION_CODE}" ios-CFBundleVersion="${VERSION_CODE}">` with placeholders that hooks fill at prepare time
    - Set `<name>Infor CRM SLX</name>` and `<description>` and `<author>`
    - Declare `<content src="index.html" />`
    - Declare `<access origin="...">` and `<allow-navigation href="...">` entries restricted to the configured Server_Endpoint hosts and to the Mingle authorization host (`mingleSettings.pu`); add `<allow-navigation href="infor-crm-slx://*" />` for the OAuth callback scheme
    - Declare `<allow-intent href="https://*/*" />` and `<allow-intent href="http://*/*" />`
    - Declare `<platform name="android">` with `android-minSdkVersion=24`, a `targetSdkVersion` that satisfies the current Google Play submission policy, `<edit-config>` block adding `android.permission.ACCESS_FINE_LOCATION` and `android.permission.ACCESS_COARSE_LOCATION`, and the icon and splash references
    - Declare `<platform name="ios">` with `deployment-target=13.0`, `<edit-config target="NSLocationWhenInUseUsageDescription">` set to a non-empty description naming the application and reason, and the icon and splash references
    - Declare every plugin in Plugin_Set with exact `MAJOR.MINOR.PATCH` `spec` attributes (no range operators); names must match `cordova/package.json` exactly
    - Declare `<engine name="android" spec="...">` and `<engine name="ios" spec="...">` pinned to exact versions matching `package.json`
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 6.1, 6.2, 6.3, 9.4, 14.1, 14.4, 14.5_

  - [ ]* 4.2 Write structural unit tests for `config.xml`
    - File: `cordova/tests/unit/configXml.test.js`
    - Parse `cordova/config.xml` as XML; assert `<widget id="com.infor.crm.mobile">`, `<name>` equals `Infor CRM SLX`, `<engine name="android">` and `<engine name="ios">` exist with exact versions, `android-minSdkVersion` equals `24`, iOS `deployment-target` equals `13.0`, `<allow-intent>` entries for both `https://*/*` and `http://*/*`, `<allow-navigation>` entry for `infor-crm-slx://*`, every plugin name from `cordova/package.json` appears as a `<plugin name="...">` element, and `NSLocationWhenInUseUsageDescription` is non-empty
    - _Requirements: 1.3, 1.4, 2.1, 2.4, 2.6, 5.10, 6.3, 9.4_

  - [x] 4.3 Create `cordova/www-template/index.html`
    - Mirror the bootstrap shape of `products/argos-saleslogix/index.html` exactly: Soho config block, `argos-dependencies.js` script, Dojo `data-dojo-config`, `require` configuration with the same `packages` and `map` (including `'Sage/Platform/Mobile': 'argos'` and `'Mobile/SalesLogix': 'crm'`), supported locales, `localStorage` locale resolution, locale and regional file lists, `crm/polyfills/index` + `crm/Bootstrap` invocation with the same arguments shape, `rootNode` element id
    - Add a `<script src="cordova.js"></script>` tag in `<head>` before the argos dependency scripts
    - Add a `<meta http-equiv="Content-Security-Policy">` tag whose `content` allows `'self'`, `gap:`, `'unsafe-eval'` (for the Dojo AMD loader), `'unsafe-inline'` in `script-src` (required for the inline `require({...})`/Soho/pdf.js/bootstrap-guard scripts; without it the WebView blocks them and the app never boots), and the configured Server_Endpoint hosts; cover `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`
    - Wrap the final `require(['crm/polyfills/index', 'crm/Bootstrap'], ...)` block in a guard that mirrors `cordova/lib/bootstrapGuard.js` semantics: a `bootstrapped` flag, `document.addEventListener('deviceready', startApp)`, and a `DOMContentLoaded` listener that schedules a 10000 ms fallback `setTimeout` which logs a `console.warn` naming the `deviceready` timeout and invokes `startApp`
    - Do NOT include any tokens forbidden by Requirement 4.6: no `localization/en` legacy path, no inline `dojoConfig` shim outside `<script data-dojo-config="...">`, and `<body>` placement matching the modern `index.html`
    - Do NOT call `navigator.serviceWorker.register`
    - Add a top-of-file comment block recording the contract: any change to the bootstrap shape in `products/argos-saleslogix/index.html` must be mirrored here
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.4, 7.1, 8.4_

  - [ ]* 4.4 Write structural unit tests for `www-template/index.html`
    - File: `cordova/tests/unit/wwwTemplate.test.js`
    - Read `cordova/www-template/index.html` from disk; assert it contains `cordova.js`, `'deviceready'`, `setTimeout`, `10000`, `'crm/polyfills/index'`, `'crm/Bootstrap'`, `'Sage/Platform/Mobile': 'argos'`, `'Mobile/SalesLogix': 'crm'`, `rootNode`, the CSP meta tag, `'self'`, `gap:`, `'unsafe-eval'`, and `'unsafe-inline'` (the last required in `script-src` so the inline scripts execute)
    - Assert the template does NOT contain `localization/en` (the forbidden legacy path), `navigator.serviceWorker.register`, nor any reference to `index-phonegap.html`
    - Assert structural tokens from `products/argos-saleslogix/index.html` that the template MUST mirror are present
    - _Requirements: 4.1, 4.2, 4.6, 6.4, 8.4_

  - [x] 4.5 Add Android resources under `cordova/resources/android/`
    - Create placeholder PNG icon files at `mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi` densities matching the `<icon>` references in `cordova/config.xml`
    - Create placeholder PNG splash files matching the `<splash>` references in `cordova/config.xml`
    - Files are version-controlled binary assets; production replacement is a follow-up content task
    - _Requirements: 14.4, 14.5_

  - [x] 4.6 Add iOS resources under `cordova/resources/ios/`
    - Create placeholder PNG icon files at every size required by App Store submission (matching the `<icon>` references in `cordova/config.xml`)
    - Create placeholder PNG splash files matching the `<splash>` references in `cordova/config.xml`
    - _Requirements: 14.4, 14.5_

- [x] 5. Implement Cordova hook scripts
  - [x] 5.1 Implement `cordova/hooks/before_prepare/010-set-version.js`
    - Read `products/argos-saleslogix/package.json` (relative to the monorepo root) and `process.env.BUILD_NUMBER`
    - Use `cordova/lib/version.js` (`resolveVersion`, `resolveVersionCode`) to compute values
    - Open `cordova/config.xml`, substitute `${VERSION}` and `${VERSION_CODE}` placeholders with the resolved values, and write back
    - Restore the placeholder values on subsequent runs by storing the original template form (or by reading from a sibling `.template` file) so the hook is idempotent across repeated invocations
    - _Requirements: 1.5, 14.1, 14.2, 14.3_

  - [x] 5.2 Implement `cordova/hooks/before_prepare/020-check-plugins.js`
    - Use `cordova/lib/pluginCheck.js` (`diff`, `validatePinFormat`) to compare `cordova/package.json` against `cordova/config.xml`
    - Exit with non-zero code and an error message naming each missing plugin and the file it is missing from when `diff.ok === false`
    - Exit with non-zero code and an error message naming every offender when `validatePinFormat.ok === false`
    - _Requirements: 5.8, 5.11_

  - [x] 5.3 Implement `cordova/hooks/after_build/010-collect-artifacts.js`
    - Use `cordova/lib/filename.js` to compose target filenames
    - Locate `.apk` and `.aab` outputs under `cordova/platforms/android/app/build/outputs/` and copy them to `cordova/dist/android/<composed-name>.{apk,aab}`
    - Locate `.ipa` outputs under `cordova/platforms/ios/build/` and copy them to `cordova/dist/ios/<composed-name>.ipa`
    - Use `cordova/lib/redact.js` to scrub any signing-related secret values out of any log line written by the hook (defense in depth on top of Jenkins masking)
    - Scan each emitted artifact for any literal occurrence of any required signing secret and abort with a non-zero exit if one is found
    - _Requirements: 11.1, 11.2, 11.3, 11.8_

  - [ ]* 5.4 Write unit tests for the hook scripts
    - File: `cordova/tests/unit/hooks.test.js`
    - Test `010-set-version.js` substitution against a fixture `config.xml`
    - Test `020-check-plugins.js` exit code and stderr content for matching and mismatching fixtures
    - Test `010-collect-artifacts.js` filename composition and the secret-scan abort path using fixture binaries with embedded test secrets
    - _Requirements: 1.5, 5.11, 11.3, 11.8_

- [x] 6. Wire the Cordova-specific Grunt task pipeline
  - [x] 6.1 Create `cordova/grunt-tasks/grunt-cordova.js`
    - Register `cordova:install`, `cordova:stage[:debug|:release]`, `cordova:prepare[:android|:ios|:all]`, `cordova:build[:android|:ios|:all][:debug|:release]`, `cordova:run:<target>`, and the `cordova` alias task
    - Resolve `CORDOVA_DIR = path.resolve(__dirname, '..')` and `MONOREPO_DIR = path.resolve(__dirname, '..', '..')` so the helper module is portable
    - The `cordova:stage` task imports `cordova/lib/stager.js` and calls `stage({ deployDir: path.join(MONOREPO_DIR, 'products', 'argos-saleslogix', 'deploy'), sdkDeployDir: path.join(MONOREPO_DIR, 'argos-sdk', 'deploy'), wwwDir: path.join(CORDOVA_DIR, 'www'), templatePath: path.join(CORDOVA_DIR, 'www-template', 'index.html'), buildProfile, env: process.env })` — the SDK deploy overlay is required for a non-blank page
    - The `cordova:build` task fails via `grunt.fail.fatal` when `target === 'ios'` on a non-`darwin` host, mirroring the existing `bundle` throw pattern in `argos-sdk/grunt-tasks/grunt-shell.js`
    - The `cordova:build` task uses `cordova/lib/signing.js` to validate signing env vars before invoking the CLI; calls `grunt.fail.fatal` with a named missing variable on failure
    - The `cordova:build` task emits artifacts only into `cordova/dist/` and never writes to `products/argos-saleslogix/deploy/`
    - The `cordova:build` task uses `cordova/lib/toolchain.js` to detect missing toolchains; logs `grunt.log.warn` and skips the corresponding target (Jenkins-only behaviour) when `JENKINS_URL` is set, otherwise fails fatally so local developers see the missing dependency
    - Fail with `grunt.fail.fatal` and a named target when an unknown build target is supplied
    - The `cordova` alias runs `cordova:install`, `cordova:stage`, `cordova:prepare`, `cordova:build:all:release` in order
    - The `cordova:run:<target>` task runs `cordova:stage` then `cordova:prepare:<target>` then `shell:cordovaRun:<target>`; when `process.env.ARGOS_LIVE_RELOAD` is non-empty, applies `cordova/lib/liveReload.js` before staging
    - _Requirements: 2.7, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.4, 11.5, 11.6, 11.7, 12.3, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 6.2 Create `cordova/grunt-tasks/grunt-shell.js`
    - Define `shell:cordovaInstall`, `shell:cordovaPrepare`, `shell:cordovaBuild`, `shell:cordovaRun` entries
    - Each shell entry sets `cwd` to `path.resolve(__dirname, '..')` (the `cordova/` directory) so `npm install` and `npx cordova` run inside the Cordova shell regardless of the directory `grunt` was invoked from
    - `shell:cordovaInstall` runs `npm install`
    - `shell:cordovaPrepare` runs `npx cordova prepare <target>` for the given target (or omits the target for `all`)
    - `shell:cordovaBuild` runs `npx cordova build <target> --<profile>` and respects signing env vars supplied by `cordova:build`
    - `shell:cordovaRun` runs `npx cordova run <target>`
    - Mirror the throw pattern from `argos-sdk/grunt-tasks/grunt-shell.js` for any platform-mismatch case that needs to fail before exec
    - This file is new and lives entirely under `cordova/`; do not modify the existing `argos-sdk/grunt-tasks/grunt-shell.js` or `products/argos-saleslogix/grunt-tasks/grunt-shell.js`
    - _Requirements: 10.1, 10.3, 10.4, 10.6_

  - [x] 6.3 Create `cordova/Gruntfile.js`
    - This is the Cordova-specific Grunt entry point loaded when `grunt` is invoked with `cwd` set to `cordova/`
    - Load `grunt-shell` via `grunt.loadNpmTasks('grunt-shell')`
    - Load the local task files: `require('./grunt-tasks/grunt-shell')(grunt);` and `require('./grunt-tasks/grunt-cordova')(grunt);`
    - Keep the file intentionally minimal (no Less, no Connect, no Jasmine wiring) — those concerns live in `argos-sdk/Gruntfile.js` and the existing root-level `Gruntfile.js`, neither of which this task modifies
    - _Requirements: 10.5_

  - [x] 6.4 Add npm scripts to `cordova/package.json`
    - Edit the `scripts` block of `cordova/package.json` (created in task 1.3) to add: `cordova` → `grunt cordova`, `cordova:install` → `grunt cordova:install`, `cordova:stage` → `grunt cordova:stage`, `cordova:prepare` → `grunt cordova:prepare`, `cordova:build` → `grunt cordova:build`, `cordova:build:android` → `grunt cordova:build:android:release`, `cordova:build:ios` → `grunt cordova:build:ios:release`, `cordova:run:android` → `grunt cordova:run:android`, `cordova:run:ios` → `grunt cordova:run:ios`
    - These scripts resolve `grunt` against `cordova/node_modules/.bin` and are intended to be invoked from inside `cordova/` (e.g. `cd cordova && npm run cordova`)
    - Do NOT modify `products/argos-saleslogix/package.json` — the SalesLogix package is untouched by this spec
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 13.1, 13.2, 13.3_

- [ ] 7. Checkpoint - Cordova pipeline runnable locally
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Author documentation
  - [x] 8.1 Create `cordova/README.md`
    - Describe prerequisites: Node version, Cordova CLI version, Android SDK version, Xcode version
    - Describe build commands run from inside `cordova/`: `npm run cordova`, `npm run cordova:build:android`, `npm run cordova:build:ios`, `npm run cordova:run:android`, `npm run cordova:run:ios`
    - Document every supported `ARGOS_SERVER_*` override variable, accepted value range, and the default Server_Endpoint values applied when no override is set
    - Document the Mingle redirect scheme `infor-crm-slx://oauth/callback` and the configuration changes required on the Mingle tenant side to authorise it
    - List every plugin in Plugin_Set with a one-line justification of why Argos_Web_App needs it
    - Document the entry-template contract: any change to the bootstrap shape in `products/argos-saleslogix/index.html` must be mirrored in `cordova/www-template/index.html`
    - Add a troubleshooting section covering missing-toolchain warnings, signing variable errors, and the `deploy/ not found` error
    - _Requirements: 7.8, 9.4, 15.1, 15.2, 15.3_

  - [x] 8.2 Update the root-level `README.md`
    - Add a link from the build-instructions section to `cordova/README.md` (top-level path, sibling to `argos-sdk/`, `products/`, etc.)
    - Preserve all existing content
    - _Requirements: 15.4_

  - [ ]* 8.3 Write a structural test that asserts root README links to cordova README
    - File: `cordova/tests/unit/rootReadmeLink.test.js`
    - Read root `README.md`; assert it contains a Markdown link whose href ends with `cordova/README.md` (and not the legacy `products/argos-saleslogix/cordova/README.md`)
    - _Requirements: 15.4_

- [ ] 9. Wire Jenkins integration
  - [ ] 9.1 Add a `Cordova Stage` block to `Jenkinsfile`
    - Insert the stage at the monorepo root, after the existing `Building argos-saleslogix` and `Creating bundles` stages have completed; the new stage is a sibling of those `dir('products/argos-saleslogix')` blocks, not nested inside them
    - Wrap the body in `withCredentials([...])` bindings for `ANDROID_KEYSTORE_PATH` (file binding), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `IOS_SIGNING_IDENTITY`, `IOS_PROVISIONING_PROFILE` (string bindings); never embed secrets in the Jenkinsfile
    - Inside `withCredentials`, open `dir('cordova')` and inside that block run `bat 'npm run cordova'` so the npm script resolves against `cordova/package.json` and `grunt` is loaded from `cordova/node_modules/.bin`
    - On success, still inside `dir('cordova')`, open `dir('dist')` and run `bat """robocopy . \\\\usdavwtldata.testlogix.com\\devbuilds\\builds\\mobile\\bundles\\%BRANCH_NAME%\\%BUILD_NUMBER%\\native\\ *.* /S /r:3 /w:5\nIF %ERRORLEVEL% LEQ 1 EXIT /B 0"""` then `stash includes: '**/*', name: 'cordova'`
    - On failure, set `currentBuild.result = 'FAILURE'` and rethrow so existing web bundles produced earlier remain on the share
    - Do not modify existing stages
    - _Requirements: 12.1, 12.2, 12.4, 12.5, 12.6, 12.7_

  - [ ]* 9.2 Write a structural test that asserts Jenkinsfile contains the Cordova stage and uses `withCredentials`
    - File: `cordova/tests/unit/jenkinsfile.test.js`
    - Read root `Jenkinsfile`; assert it contains `'Cordova Stage'`, `withCredentials`, `dir('cordova')`, `npm run cordova`, `robocopy`, `stash`
    - Assert the Cordova Stage uses a top-level `dir('cordova')` block and is NOT nested inside a `dir('products/argos-saleslogix')` block
    - Assert no signing variable values are embedded as literals
    - _Requirements: 12.1, 12.7_

- [ ] 10. Final checkpoint - all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but for property-bearing helpers, the core implementation (non-`*` tasks) and the corresponding property test (the `*` sub-task) form a unit; skipping the property test removes the correctness guarantee that the design relies on for that helper.
- Each task references specific requirements clauses for traceability.
- Property test sub-tasks each cite the property number and title from the design's Correctness Properties section, plus the requirement clauses they validate.
- Configuration assets (`config.xml`, the entry template, the README) are covered by example-based structural tests rather than property tests, matching the design's Layer 2 testing strategy.
- Native-artifact production, signing on real Cordova platforms, on-device runtime behaviour, and Mingle SSO end-to-end verification are intentionally out of scope for this code-only plan and are tracked separately as Layer 3 integration / device tests in the design.
- The web build (`build/release.cmd`, existing `grunt bundle`, existing `grunt lang-pack`) is not modified by any task in this plan. Likewise, `products/argos-saleslogix/Gruntfile.js`, `products/argos-saleslogix/grunt-tasks/grunt-shell.js`, and `products/argos-saleslogix/package.json` are NOT touched — the Cordova shell ships its own `Gruntfile.js`, `grunt-tasks/grunt-shell.js`, and `package.json` under the top-level `cordova/` directory.
- The Cordova shell lives at `cordova/` at the monorepo root (sibling to `argos-sdk/`, `products/`, `packages/`, and `tests/`). It reads `products/argos-saleslogix/deploy/` as a read-only input and writes only to `cordova/www/`, `cordova/platforms/`, `cordova/plugins/`, `cordova/node_modules/`, and `cordova/dist/`.
- The `cordova/www/`, `cordova/platforms/`, `cordova/plugins/`, `cordova/node_modules/`, and `cordova/dist/` directories are added to the monorepo root `.gitignore` by task 1.2 and treated as build artifacts thereafter.
- The placeholder icons and splashes added in tasks 4.5 and 4.6 unblock the build pipeline; replacing them with finished branding is a content task tracked outside this spec.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "2.10", "2.12", "2.14", "2.16", "2.18", "2.20", "2.22", "4.1", "4.5", "4.6"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.7", "2.8", "2.11", "2.13", "2.15", "2.17", "2.19", "2.21", "2.23", "4.2", "4.3", "5.1", "5.2", "5.3"] },
    { "id": 3, "tasks": ["2.9", "4.4", "5.4", "6.1", "6.2", "8.1"] },
    { "id": 4, "tasks": ["6.3", "8.2", "9.1"] },
    { "id": 5, "tasks": ["6.4", "8.3", "9.2"] }
  ]
}
```
