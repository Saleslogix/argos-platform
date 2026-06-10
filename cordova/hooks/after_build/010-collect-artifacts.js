#!/usr/bin/env node
/**
 * cordova/hooks/after_build/010-collect-artifacts.js
 *
 * Cordova `after_build` hook (CommonJS Node module, NOT AMD) that gathers the
 * native build artifacts Cordova just produced under `platforms/` and copies
 * them into the version-named `cordova/dist/` tree the Jenkins pipeline
 * publishes.
 *
 * Behaviour:
 *   1. Resolve the application version from
 *      `products/argos-saleslogix/package.json` via `cordova/lib/version.js`
 *      and read the build number from `process.env.BUILD_NUMBER`. The composed
 *      artifact names come from `cordova/lib/filename.js`
 *      (`composeArtifactFilename`), which defaults the build number to `'0'`
 *      when it is missing.
 *   2. Recursively locate every `.apk` and `.aab` produced under
 *      `cordova/platforms/android/app/build/outputs/` and copy each to
 *      `cordova/dist/android/<composed-name>.{apk,aab}`.
 *   3. Recursively locate every `.ipa` produced under
 *      `cordova/platforms/ios/build/` and copy each to
 *      `cordova/dist/ios/<composed-name>.ipa`.
 *   4. When a platform output directory does not exist (for example, only one
 *      platform was built), that platform is skipped rather than throwing.
 *
 * Secret handling (Requirement 11.8, defense in depth on top of Jenkins
 * `withCredentials` masking):
 *   - Every log line the hook writes is passed through
 *     `cordova/lib/redact.js` `redactAll(line, secrets)` so a signing secret
 *     can never leak into the build log.
 *   - Each emitted artifact is scanned for any literal occurrence of any
 *     required signing secret value. If one is found the hook aborts with a
 *     non-zero exit code and a redacted error message, because an artifact that
 *     embeds a signing secret must never be published.
 *
 * The hook works both when invoked by Cordova (which calls the exported
 * function with a `context` argument supplying `context.opts.projectRoot`) and
 * when run directly for testing
 * (`node cordova/hooks/after_build/010-collect-artifacts.js`). Paths are
 * resolved relative to this file with `__dirname` + `path.resolve` so the hook
 * is portable regardless of the directory Cordova was invoked from.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 11.1, 11.2, 11.3, 11.8
 */

'use strict';

var fs = require('fs');
var path = require('path');

var filename = require('../../lib/filename');
var redact = require('../../lib/redact');
var version = require('../../lib/version');

/**
 * Environment variable names that hold Signing_Configuration secret values
 * (Requirements 11.4, 11.5). Any of these that are present and non-empty form
 * the secret list used both for log redaction and for the artifact scan.
 * @type {string[]}
 */
var SIGNING_SECRET_VARS = [
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEYSTORE_PATH',
  'IOS_SIGNING_IDENTITY',
  'IOS_PROVISIONING_PROFILE',
];

/**
 * Resolve the Cordova project directory (the directory that contains
 * `config.xml`, `platforms/`, and `dist/`). Prefer the Cordova-supplied
 * `context.opts.projectRoot` when available; otherwise resolve relative to this
 * hook file:
 *   __dirname = <cordova>/hooks/after_build  ->  <cordova>
 *
 * @param {object} [context] - the Cordova hook context, when invoked by Cordova
 * @returns {string} absolute path to the Cordova project directory
 */
function resolveCordovaDir(context) {
  if (context && context.opts && context.opts.projectRoot) {
    return context.opts.projectRoot;
  }
  return path.resolve(__dirname, '..', '..');
}

/**
 * Collect the present, non-empty Signing_Configuration secret values from an
 * environment object. Missing / empty variables are skipped.
 *
 * @param {object} env - environment object (a subset of process.env)
 * @returns {string[]} the list of secret values to redact / scan for
 */
function collectSecrets(env) {
  var source = env || {};
  return SIGNING_SECRET_VARS
    .map(function (name) { return source[name]; })
    .filter(function (value) {
      return value !== undefined && value !== null && String(value) !== '';
    })
    .map(function (value) { return String(value); });
}

/**
 * Build a logger whose every line is scrubbed through `redactAll` before being
 * written, so no secret value reaches the build log.
 *
 * @param {object} logger - underlying console-like object (log/warn/error)
 * @param {string[]} secrets - secret values to redact from every line
 * @returns {{ log: function, warn: function, error: function }}
 */
function makeRedactingLogger(logger, secrets) {
  function write(method, line) {
    var fn = (logger && typeof logger[method] === 'function')
      ? logger[method].bind(logger)
      : console[method].bind(console);
    fn(redact.redactAll(String(line), secrets));
  }

  return {
    log: function (line) { write('log', line); },
    warn: function (line) { write('warn', line); },
    error: function (line) { write('error', line); },
  };
}

/**
 * Recursively collect every file beneath `rootDir` whose name ends with one of
 * `extensions` (case-insensitive). Returns an empty array when `rootDir` does
 * not exist or is not a directory, so a platform that was not built is skipped
 * gracefully rather than throwing.
 *
 * @param {string} rootDir - directory to walk
 * @param {string[]} extensions - extensions including the leading dot (e.g. ['.apk'])
 * @returns {string[]} absolute paths of matching files, sorted for determinism
 */
function findFilesByExtension(rootDir, extensions) {
  var lowerExtensions = extensions.map(function (ext) { return ext.toLowerCase(); });

  function walk(dir) {
    var stat;
    try {
      stat = fs.statSync(dir);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }

    if (!stat.isDirectory()) {
      return [];
    }

    var found = [];
    var entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(function (entry) {
      var full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        found = found.concat(walk(full));
        return;
      }

      if (entry.isFile()) {
        var lowerName = entry.name.toLowerCase();
        var matches = lowerExtensions.some(function (ext) {
          return lowerName.length >= ext.length &&
            lowerName.slice(-ext.length) === ext;
        });
        if (matches) {
          found.push(full);
        }
      }
    });

    return found;
  }

  return walk(rootDir).sort();
}

/**
 * Copy `srcPath` to `destPath`, creating the destination directory tree first.
 *
 * @param {string} srcPath
 * @param {string} destPath
 */
function copyArtifact(srcPath, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
}

/**
 * Scan an artifact's bytes for any literal occurrence of any required signing
 * secret value.
 *
 * @param {string} artifactPath - absolute path to the emitted artifact
 * @param {string[]} secrets - secret values to search for
 * @returns {string|null} the first secret found embedded in the artifact, or
 *   null when none of the secrets appear
 */
function scanArtifactForSecrets(artifactPath, secrets) {
  if (!secrets || secrets.length === 0) {
    return null;
  }

  var buffer = fs.readFileSync(artifactPath);

  for (var i = 0; i < secrets.length; i += 1) {
    var secret = secrets[i];
    if (secret && buffer.includes(Buffer.from(secret))) {
      return secret;
    }
  }

  return null;
}

/**
 * Collect a single platform's artifacts of a given format into `cordova/dist/`.
 *
 * @param {object} options
 * @param {string} options.outputsDir - directory to search for the artifacts
 * @param {string} options.distDir - destination directory under cordova/dist/
 * @param {string} options.format - artifact format / extension (apk|aab|ipa)
 * @param {string} options.version - application version for the composed name
 * @param {string|number|undefined} options.buildNumber - Jenkins BUILD_NUMBER
 * @param {object} options.log - redacting logger
 * @returns {string[]} absolute paths of the emitted (copied) artifacts
 */
function collectFormat(options) {
  var sources = findFilesByExtension(options.outputsDir, ['.' + options.format]);
  var emitted = [];

  if (sources.length === 0) {
    return emitted;
  }

  var composedName = filename.composeArtifactFilename({
    version: options.version,
    buildNumber: options.buildNumber,
    format: options.format,
  });
  var destPath = path.join(options.distDir, composedName);

  sources.forEach(function (srcPath) {
    copyArtifact(srcPath, destPath);
    options.log.log('Collected ' + options.format + ' artifact: ' + srcPath + ' -> ' + destPath);
    emitted.push(destPath);
  });

  return emitted;
}

/**
 * Cordova after_build hook entry point.
 *
 * @param {object} [context] - Cordova hook context (optional when run directly)
 * @returns {{ version: string, buildNumber: (string|undefined), artifacts: string[] }}
 */
function collectArtifacts(context) {
  var baseLogger = (context && context.console) || console;

  var secrets = collectSecrets(process.env);
  var log = makeRedactingLogger(baseLogger, secrets);

  var cordovaDir = resolveCordovaDir(context);
  var monorepoRoot = path.resolve(cordovaDir, '..');

  var pkgJsonPath = path.join(monorepoRoot, 'products', 'argos-saleslogix', 'package.json');
  var pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  var resolvedVersion = version.resolveVersion(pkgJson);

  // Pass BUILD_NUMBER through unchanged; composeArtifactFilename defaults it to
  // '0' when missing, which keeps the filename aligned with the spec.
  var buildNumber = process.env.BUILD_NUMBER;

  var androidOutputs = path.join(cordovaDir, 'platforms', 'android', 'app', 'build', 'outputs');
  var androidDist = path.join(cordovaDir, 'dist', 'android');

  var iosBuild = path.join(cordovaDir, 'platforms', 'ios', 'build');
  var iosDist = path.join(cordovaDir, 'dist', 'ios');

  var emitted = [];

  // Android: collect both .apk and .aab outputs (Requirements 11.1, 11.3).
  ['apk', 'aab'].forEach(function (format) {
    emitted = emitted.concat(collectFormat({
      outputsDir: androidOutputs,
      distDir: androidDist,
      format: format,
      version: resolvedVersion,
      buildNumber: buildNumber,
      log: log,
    }));
  });

  // iOS: collect .ipa outputs (Requirements 11.2, 11.3).
  emitted = emitted.concat(collectFormat({
    outputsDir: iosBuild,
    distDir: iosDist,
    format: 'ipa',
    version: resolvedVersion,
    buildNumber: buildNumber,
    log: log,
  }));

  // Scan every emitted artifact for embedded signing secrets (Requirement
  // 11.8). The error message itself is redacted, so the secret value never
  // appears in the failure output.
  emitted.forEach(function (artifactPath) {
    var foundSecret = scanArtifactForSecrets(artifactPath, secrets);
    if (foundSecret) {
      log.error(
        'Aborting: emitted artifact "' + artifactPath + '" contains a signing ' +
        'secret value (' + foundSecret + '). A signed artifact must never embed ' +
        'a signing secret. Remove the secret from the build inputs and rebuild.'
      );
      process.exit(1);
      return;
    }
  });

  if (emitted.length === 0) {
    log.warn(
      'No native artifacts were found under platforms/. Nothing was collected ' +
      'into cordova/dist/.'
    );
  } else {
    log.log('Artifact collection complete. Emitted ' + emitted.length + ' artifact(s) into cordova/dist/.');
  }

  return {
    version: resolvedVersion,
    buildNumber: buildNumber,
    artifacts: emitted,
  };
}

module.exports = collectArtifacts;
module.exports.collectArtifacts = collectArtifacts;
module.exports.collectSecrets = collectSecrets;
module.exports.findFilesByExtension = findFilesByExtension;
module.exports.scanArtifactForSecrets = scanArtifactForSecrets;
module.exports.SIGNING_SECRET_VARS = SIGNING_SECRET_VARS;

// Allow direct execution for local testing:
// `node cordova/hooks/after_build/010-collect-artifacts.js`.
if (require.main === module) {
  try {
    collectArtifacts();
  } catch (err) {
    console.error('010-collect-artifacts.js failed: ' + (err && err.message ? err.message : err));
    process.exit(1);
  }
}
