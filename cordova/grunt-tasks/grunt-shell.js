'use strict';

/**
 * Cordova shell task configuration.
 *
 * Defines the `grunt-shell` entries that wrap the Cordova CLI (`npm install`
 * and `npx cordova ...`) for the native shell. These entries are invoked by
 * `cordova/grunt-tasks/grunt-cordova.js` (e.g. `shell:cordovaBuild:android:release`).
 *
 * This is a CommonJS Node module consumed by Grunt (it is NOT an AMD module).
 * It lives entirely under `cordova/` and does not modify the existing
 * `argos-sdk/grunt-tasks/grunt-shell.js` or
 * `products/argos-saleslogix/grunt-tasks/grunt-shell.js`.
 *
 * Every shell entry runs with `cwd` set to the `cordova/` directory
 * (`path.resolve(__dirname, '..')`) so that `npm install` and `npx cordova`
 * resolve against `cordova/package.json` and `cordova/node_modules/.bin`
 * regardless of the directory `grunt` was invoked from.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 10.1, 10.3, 10.4, 10.6
 */

const os = require('os');
const path = require('path');

// __dirname = <monorepo-root>/cordova/grunt-tasks
// CORDOVA_DIR = <monorepo-root>/cordova
const CORDOVA_DIR = path.resolve(__dirname, '..');

// Cordova CLI output (especially gradle/xcodebuild) is verbose; allow a large
// stdout/stderr buffer so a successful build is not truncated mid-stream.
const MAX_BUFFER = 50 * 1024 * 1024;

/**
 * Normalise an optional build profile suffix to `'debug'` or `'release'`.
 * Anything other than the literal string `'debug'` resolves to `'release'`,
 * matching the behaviour of `cordova:build` in grunt-cordova.js.
 *
 * @param {string} [profile] - the raw profile task argument
 * @returns {'debug'|'release'}
 */
function normalizeProfile(profile) {
  return profile === 'debug' ? 'debug' : 'release';
}

/**
 * Fail before exec when an iOS target is requested on a non-macOS host.
 *
 * Mirrors the throw pattern used by the `bundle` task in
 * `products/argos-saleslogix/grunt-tasks/grunt-shell.js` (which throws on
 * non-windows): the command function throws synchronously so the shell task
 * fails with a non-zero exit before any child process is spawned.
 *
 * @param {string} target - the requested Cordova target
 * @param {string} verb - the Cordova verb being attempted (prepare/build/run)
 * @throws {Error} when `target === 'ios'` and the host platform is not darwin
 */
function assertPlatformSupported(target, verb) {
  if (target === 'ios' && os.platform() !== 'darwin') {
    throw new Error(
      `cordova ${verb} ios requires macOS (current platform: ${os.platform()}).`
    );
  }
}

module.exports = function gruntShell(grunt) {
  // Shared options for every entry: run inside cordova/, inherit the parent
  // environment (so signing env vars supplied by cordova:build reach the
  // Cordova CLI), and stream child output through to the Grunt console.
  const sharedOptions = {
    stderr: true,
    stdout: true,
    stdin: true,
    execOptions: {
      cwd: CORDOVA_DIR,
      env: process.env,
      maxBuffer: MAX_BUFFER,
    },
  };

  grunt.config('shell', {
    // `cordova:install` -> install the Cordova shell's own dependencies.
    cordovaInstall: {
      command: 'npm install',
      options: sharedOptions,
    },

    // `cordova:prepare[:<target>]` -> `npx cordova prepare [<target>]`.
    // A target of `all` (the default supplied by cordova:prepare) prepares
    // every declared platform, so the target is omitted from the command.
    cordovaPrepare: {
      command(target) {
        const platform = target || 'all';
        assertPlatformSupported(platform, 'prepare');

        if (platform === 'all') {
          return 'npx cordova prepare';
        }

        return `npx cordova prepare ${platform}`;
      },
      options: sharedOptions,
    },

    // `cordova:build:<target>:<profile>` -> `npx cordova build [<target>] --<profile>`.
    // Signing env vars validated by cordova:build are inherited via
    // execOptions.env (process.env) and consumed by the Cordova CLI.
    cordovaBuild: {
      command(target, profile) {
        const platform = target || 'all';
        const buildProfile = normalizeProfile(profile);
        assertPlatformSupported(platform, 'build');

        const parts = ['npx cordova build'];
        if (platform !== 'all') {
          parts.push(platform);
        }
        parts.push(`--${buildProfile}`);

        return parts.join(' ');
      },
      options: sharedOptions,
    },

    // `cordova:run:<target>` -> `npx cordova run <target>`.
    cordovaRun: {
      command(target) {
        const platform = target || 'android';
        assertPlatformSupported(platform, 'run');

        return `npx cordova run ${platform}`;
      },
      options: sharedOptions,
    },
  });

  grunt.loadNpmTasks('grunt-shell');
};
