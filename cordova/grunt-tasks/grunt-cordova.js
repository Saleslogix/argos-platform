'use strict';

/**
 * cordova/grunt-tasks/grunt-cordova.js
 *
 * Registers the Cordova-specific Grunt task pipeline. Each task is a thin shim
 * over the pure-Node helpers in `cordova/lib/` plus calls to the `shell:*`
 * targets defined in the sibling `cordova/grunt-tasks/grunt-shell.js`. This file
 * is a CommonJS Node module consumed by Grunt (it is NOT an AMD module) and is
 * loaded by `cordova/Gruntfile.js`.
 *
 * Tasks registered:
 *   - cordova:install
 *   - cordova:stage[:debug|:release]
 *   - cordova:prepare[:android|:ios|:all]
 *   - cordova:build[:android|:ios|:all][:debug|:release]
 *   - cordova:run:<target>
 *   - cordova                       (alias for the full pipeline)
 *
 * Design notes:
 *   - The build task fails fast and loud: an iOS-only build on a non-macOS host,
 *     an unknown target, a missing toolchain (locally), and missing signing
 *     secrets all produce a `grunt.fail.fatal` with a named cause.
 *   - On a Jenkins agent (`JENKINS_URL` set) a missing toolchain is a warning
 *     that skips the affected target rather than failing the whole pipeline.
 *   - The build task only invokes `shell:cordovaBuild`, whose Cordova CLI run
 *     plus the `after_build/010-collect-artifacts.js` hook emit artifacts into
 *     `cordova/dist/`. Nothing here writes to
 *     `products/argos-saleslogix/deploy/`.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 2.7, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8,
 *   11.4, 11.5, 11.6, 11.7, 12.3, 13.1, 13.2, 13.3, 13.4, 13.5
 *
 * @module cordova/grunt-tasks/grunt-cordova
 */

const os = require('os');
const path = require('path');
const stager = require('../lib/stager');
const signing = require('../lib/signing');
const toolchain = require('../lib/toolchain');
const liveReload = require('../lib/liveReload');

// __dirname === <monorepo-root>/cordova/grunt-tasks
const CORDOVA_DIR = path.resolve(__dirname, '..'); // <root>/cordova
const MONOREPO_DIR = path.resolve(__dirname, '..', '..'); // <root>

/** Build/run targets that map to a single native platform. */
const PLATFORM_TARGETS = ['android', 'ios'];

/** Targets accepted by `cordova:build` (per-platform plus the `all` fan-out). */
const BUILD_TARGETS = ['android', 'ios', 'all'];

/** Human-readable description of the toolchain each platform target needs. */
const TOOLCHAIN_LABELS = {
  android: 'Android SDK (ANDROID_SDK_ROOT + JAVA_HOME)',
  ios: 'Xcode command-line tools (xcodebuild) on macOS',
};

/**
 * Returns true when a value is present and non-empty (treats undefined, null,
 * and the empty string as "unset").
 *
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmpty(value) {
  return value !== undefined && value !== null && String(value) !== '';
}

/**
 * Normalise a `:debug` / `:release` suffix into a build profile, defaulting to
 * `release` for anything other than the literal `debug`.
 *
 * @param {string} [profile]
 * @returns {'debug'|'release'}
 */
function resolveBuildProfile(profile) {
  return profile === 'debug' ? 'debug' : 'release';
}

module.exports = function gruntCordova(grunt) {
  /**
   * cordova:install — install the Cordova shell's dependencies (Requirement 10.1).
   * Delegates to `shell:cordovaInstall`, which runs `npm install` with `cwd`
   * set to `cordova/`.
   */
  grunt.registerTask('cordova:install', 'Install the Cordova shell dependencies', function cordovaInstall() {
    grunt.task.run(['shell:cordovaInstall']);
  });

  /**
   * cordova:stage[:debug|:release] — materialise `cordova/www/` from
   * `products/argos-saleslogix/deploy/` plus the entry template plus optional
   * ARGOS_SERVER_* overrides (Requirements 10.2, 7.2, 7.3, 7.4, 7.5, 7.6).
   *
   * The Stager throws a named StagerError on a missing deploy/ (MISSING_DEPLOY)
   * or an invalid ARGOS_SERVER_* override (INVALID_ENV); we surface that as an
   * async task failure so Grunt exits non-zero with the named cause.
   */
  grunt.registerTask('cordova:stage', 'Stage products/argos-saleslogix/deploy/ into cordova/www/', function cordovaStage(profile) {
    const buildProfile = resolveBuildProfile(profile);
    const done = this.async();

    stager.stage({
      deployDir: path.join(MONOREPO_DIR, 'products', 'argos-saleslogix', 'deploy'),
      sdkDeployDir: path.join(MONOREPO_DIR, 'argos-sdk', 'deploy'),
      wwwDir: path.join(CORDOVA_DIR, 'www'),
      templatePath: path.join(CORDOVA_DIR, 'www-template', 'index.html'),
      buildProfile,
      env: process.env,
    }).then((result) => {
      grunt.log.ok(`Staged ${result.filesCopied} files (${buildProfile} profile)`);
      done();
    }, (err) => {
      // err carries a machine-readable `code` (MISSING_DEPLOY / INVALID_ENV) and,
      // for INVALID_ENV, the offending `variable` name. Failing the task with the
      // error surfaces that message and produces a non-zero exit.
      done(err);
    });
  });

  /**
   * cordova:prepare[:android|:ios|:all] — run `cordova prepare` for the target
   * (Requirement 10.3). Defaults to `all` when no target is supplied.
   */
  grunt.registerTask('cordova:prepare', 'Run cordova prepare for a target', function cordovaPrepare(target) {
    const resolvedTarget = isNonEmpty(target) ? target : 'all';
    grunt.task.run([`shell:cordovaPrepare:${resolvedTarget}`]);
  });

  /**
   * cordova:build[:android|:ios|:all][:debug|:release] — build native artifacts
   * for the requested target(s) (Requirements 10.4, 10.6, 10.7, 2.7, 11.4-11.7,
   * 12.3).
   *
   * Validation order, all before invoking the CLI:
   *   1. Unknown target            -> fail fatal naming the target.
   *   2. iOS-only on non-macOS host -> fail fatal (mirrors the `bundle` throw in
   *      argos-sdk/products grunt-shell.js).
   *   3. `all` on non-macOS host    -> skip iOS with a warning, build android.
   *   4. Missing toolchain          -> skip with a warning on Jenkins, else fail
   *      fatal so local developers see the missing dependency.
   *   5. Missing signing secrets    -> fail fatal naming the missing variable(s).
   */
  grunt.registerTask('cordova:build', 'Build native artifacts into cordova/dist/', function cordovaBuild(target, profile) {
    const resolvedTarget = isNonEmpty(target) ? target : 'all';
    const buildProfile = resolveBuildProfile(profile);
    const hostPlatform = os.platform();

    // 1. Unknown build target (Requirement 2.7).
    if (BUILD_TARGETS.indexOf(resolvedTarget) === -1) {
      grunt.fail.fatal(`cordova:build: unknown target "${resolvedTarget}". Valid targets are: ${BUILD_TARGETS.join(', ')}.`);
      return;
    }

    // 2. An iOS-only build can only run on macOS (Requirement 10.6). Mirrors the
    // existing `bundle` throw pattern in grunt-shell.js.
    if (resolvedTarget === 'ios' && hostPlatform !== 'darwin') {
      grunt.fail.fatal(`cordova:build:ios requires macOS (darwin); current host platform is "${hostPlatform}".`);
      return;
    }

    // Expand the target into the concrete list of platforms to build.
    let platforms = resolvedTarget === 'all' ? PLATFORM_TARGETS.slice() : [resolvedTarget];

    // 3. On a non-macOS host an `all` build cannot produce iOS; drop it with a
    // warning so the android build still proceeds.
    if (resolvedTarget === 'all' && hostPlatform !== 'darwin') {
      grunt.log.warn(`Skipping ios target on non-macOS host (${hostPlatform}).`);
      platforms = platforms.filter((platform) => platform !== 'ios');
    }

    // 4. Toolchain detection (Requirement 12.3). On Jenkins a missing toolchain
    // is a warning that skips the target; locally it is a fatal error.
    const onJenkins = isNonEmpty(process.env.JENKINS_URL);
    const toolchains = toolchain.detectToolchains({
      env: process.env,
      platform: hostPlatform,
      hasXcodebuild: toolchain.probeXcodebuild(),
    });

    const buildable = [];
    platforms.forEach((platform) => {
      if (toolchains[platform]) {
        buildable.push(platform);
        return;
      }

      const message = `cordova:build: required toolchain for the "${platform}" target is unavailable (${TOOLCHAIN_LABELS[platform]}).`;
      if (onJenkins) {
        grunt.log.warn(`${message} Skipping the ${platform} target on this Jenkins agent.`);
      } else {
        // Fatal: halts the task so a local developer sees the missing dependency.
        grunt.fail.fatal(message);
      }
    });

    // 5. Signing validation before invoking the CLI (Requirements 11.4-11.7).
    // For `debug` builds the validator is a no-op pass; for `release` builds it
    // names every missing platform-specific signing variable.
    buildable.forEach((platform) => {
      const result = signing.validateSigning({ env: process.env, platform, buildProfile });
      if (!result.ok) {
        grunt.fail.fatal(`cordova:build:${platform}:${buildProfile} is missing required signing variable(s): ${result.missing.join(', ')}.`);
      }
    });

    // Queue the CLI build for each buildable platform. shell:cordovaBuild runs
    // `npx cordova build <platform> --<profile>`; artifacts land in cordova/dist/
    // via the after_build hook and never under products/argos-saleslogix/deploy/.
    buildable.forEach((platform) => {
      grunt.task.run([`shell:cordovaBuild:${platform}:${buildProfile}`]);
    });
  });

  /**
   * cordova:run:<target> — stage, prepare, and run on a connected device or
   * emulator (Requirements 13.1, 13.2, 13.3). When ARGOS_LIVE_RELOAD is set the
   * WebView is pointed at the developer's dev server before staging
   * (Requirement 13.5).
   */
  grunt.registerTask('cordova:run', 'Stage, prepare, and run on a device or emulator', function cordovaRun(target) {
    if (!isNonEmpty(target)) {
      grunt.fail.fatal('cordova:run requires a target, e.g. cordova:run:android or cordova:run:ios.');
      return;
    }

    if (PLATFORM_TARGETS.indexOf(target) === -1) {
      grunt.fail.fatal(`cordova:run: unknown target "${target}". Valid targets are: ${PLATFORM_TARGETS.join(', ')}.`);
      return;
    }

    // Apply the live-reload override before staging (Requirement 13.5). When
    // enabled, the WebView loads from the dev server instead of the staged www/.
    if (isNonEmpty(process.env.ARGOS_LIVE_RELOAD)) {
      const effectiveConfig = liveReload.applyLiveReload({ contentSrc: 'index.html' }, process.env);
      grunt.log.ok(`Live reload enabled; WebView content source = ${effectiveConfig.contentSrc}`);
    }

    grunt.task.run([
      'cordova:stage',
      `cordova:prepare:${target}`,
      `shell:cordovaRun:${target}`,
    ]);
  });

  /**
   * cordova — full pipeline alias (Requirement 10.5): install, stage, prepare,
   * then build all platforms in the release profile, in that order.
   */
  grunt.registerTask('cordova', 'Run the full Cordova pipeline', [
    'cordova:install',
    'cordova:stage',
    'cordova:prepare',
    'cordova:build:all:release',
  ]);
};
