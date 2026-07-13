'use strict';

/**
 * cordova/lib/stager.js
 *
 * Pure Node (CommonJS) helper that materialises `cordova/www/` from
 * `products/argos-saleslogix/deploy/` (overlaid with `argos-sdk/deploy/`) plus
 * the version-controlled entry template plus optional ARGOS_SERVER_* overrides.
 *
 * This module is consumed by the Cordova Grunt pipeline (the `cordova:stage`
 * task) and is intentionally framework-free: it is NOT an AMD module. It uses
 * only Node core modules (`fs`, `path`) and the sibling `configRewriter`
 * helper, so it stays dependency-free.
 *
 * The compiled web application is the OVERLAY of two independent build
 * outputs, exactly as the production IIS deploy assembles it (the Jenkinsfile
 * `iiscopy` step unstashes `slx` then `sdk` into the same directory):
 *
 *   - `products/argos-saleslogix/deploy/` (the "slx" layer) supplies
 *     `content/javascript/argos-saleslogix.js`, `content/dojo/dojo-dependencies.js`,
 *     `configuration/`, `localization/`, `help/`, and `content/css/app.min.css`.
 *   - `argos-sdk/deploy/` (the "sdk" layer) supplies
 *     `content/javascript/argos-dependencies.js`,
 *     `content/javascript/argos-amd-dependencies.js`,
 *     `content/javascript/argos-sdk.js`, the Dojo core under `content/dojo/`,
 *     `content/javascript/cultures/`, and the CSS themes.
 *
 * Staging only the slx layer produces a blank page because none of the SDK /
 * Dojo `<script>` tags in the entry template resolve. The `sdkDeployDir`
 * overlay closes that gap.
 *
 * Contract (design.md "Stager" + Correctness Property 1):
 *   1. Assert `deployDir` exists; otherwise throw StagerError(MISSING_DEPLOY).
 *   2. Recursively delete and recreate `wwwDir`.
 *   3. Walk `deployDir`, copying every file whose POSIX-relative path is not in
 *      EXCLUDED_FILES, preserving the relative directory structure.
 *   3b. When `sdkDeployDir` is provided, assert it exists (throw
 *      StagerError(MISSING_SDK_DEPLOY) otherwise) and overlay it into `wwwDir`
 *      on top of the slx layer, honouring the same exclusion list.
 *   4. Copy `templatePath` over `wwwDir/index.html`.
 *   5. If buildProfile === 'debug', overwrite `wwwDir/configuration/production.js`
 *      with the contents of `deployDir/configuration/development.js`.
 *   6. If any ARGOS_SERVER_* override is non-empty, validate it and rewrite
 *      `wwwDir/configuration/production.js`. When no override is present, the
 *      file is left byte-for-byte identical (no rewrite at all).
 *   7. Return { filesCopied }.
 *
 * The Stager NEVER writes under `deployDir` or `sdkDeployDir`; it only reads
 * from them. Every write goes under `wwwDir`.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 7.2, 7.3, 7.4, 7.5, 7.6
 *
 * @module cordova/lib/stager
 */

const fs = require('fs');
const path = require('path');
const configRewriter = require('./configRewriter');

/**
 * Files excluded from Cordova_WWW by every stage call. These are POSIX-style
 * relative paths (relative to deployDir). Server-only IIS artifacts plus the
 * service worker (which must not register on the `file://` origin).
 *
 * Public for testing.
 *
 * @type {string[]}
 */
const EXCLUDED_FILES = [
  'web.config',
  'Global.asax',
  'index.aspx',
  'index.aspx.cs',
  'index-head.ascx',
  'index-body.ascx',
  'index-body.ascx.cs',
  'scripts/iis.ps1',
  'serviceworker.js',
];

/** Set form of EXCLUDED_FILES for O(1) membership checks. */
const EXCLUDED_SET = new Set(EXCLUDED_FILES);

/** Relative POSIX path (within wwwDir) of the staged production configuration. */
const PRODUCTION_CONFIG_RELPATH = 'configuration/production.js';

/** Relative POSIX path (within deployDir) of the development configuration. */
const DEVELOPMENT_CONFIG_RELPATH = 'configuration/development.js';

/** ARGOS_SERVER_* variables whose presence triggers a config rewrite. */
const SERVER_OVERRIDE_VARS = [
  'ARGOS_SERVER_NAME',
  'ARGOS_SERVER_PORT',
  'ARGOS_SERVER_PROTOCOL',
  'ARGOS_SERVER_VDIR',
];

/**
 * Error thrown by stage() when staging cannot proceed. Carries a
 * machine-readable `code` field and, where relevant, the offending environment
 * variable name.
 */
class StagerError extends Error {
  /**
   * @param {string} message
   * @param {string} code       - machine-readable error code
   *   (e.g. 'MISSING_DEPLOY', 'INVALID_ENV')
   * @param {string} [variable] - the offending environment variable name
   */
  constructor(message, code, variable) {
    super(message);
    this.name = 'StagerError';
    this.code = code;
    if (variable !== undefined) {
      this.variable = variable;
    }
  }
}

/**
 * Returns true when an environment value is present and non-empty. Treats
 * undefined, null, and the empty string as "unset".
 *
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmpty(value) {
  return value !== undefined && value !== null && String(value) !== '';
}

/**
 * Convert a host-OS relative path into a POSIX-style relative path so the
 * exclusion check behaves identically on Windows and POSIX hosts.
 *
 * @param {string} relativePath - a path produced relative to deployDir
 * @returns {string} the same path with separators normalised to `/`
 */
function toPosixRelative(relativePath) {
  return relativePath.split(path.sep).join('/');
}

/**
 * Recursively walk `absDir`, copying every contained file whose POSIX-relative
 * path is not excluded into the mirrored location under `wwwDir`. Returns the
 * number of files copied.
 *
 * @param {string} absDir   - absolute path of the directory currently walked
 * @param {string} relDir   - POSIX-style path of `absDir` relative to deployDir
 *                            ('' at the root)
 * @param {string} wwwDir   - absolute path of the staging output directory
 * @returns {Promise<number>} the count of files copied from this subtree
 */
async function copyTree(absDir, relDir, wwwDir) {
  const entries = await fs.promises.readdir(absDir, { withFileTypes: true });
  let filesCopied = 0;

  for (const entry of entries) {
    const childAbs = path.join(absDir, entry.name);
    const childRel = relDir ? `${relDir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      filesCopied += await copyTree(childAbs, childRel, wwwDir);
      continue;
    }

    // Treat anything that is not a directory (regular files, symlinks) as a
    // file to copy. The exclusion check is on the POSIX-relative path.
    if (EXCLUDED_SET.has(childRel)) {
      continue;
    }

    const destPath = path.join(wwwDir, ...childRel.split('/'));
    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.copyFile(childAbs, destPath);
    filesCopied += 1;
  }

  return filesCopied;
}

/**
 * Stage the contents of `deployDir` into `wwwDir`, applying exclusions,
 * dropping in `templatePath` as `index.html`, selecting the profile-appropriate
 * configuration, and rewriting `configuration/production.js` when ARGOS_SERVER_*
 * overrides are present.
 *
 * @param {object} options
 * @param {string} options.deployDir    - absolute path to products/argos-saleslogix/deploy/
 * @param {string} [options.sdkDeployDir] - absolute path to argos-sdk/deploy/;
 *   when provided it is overlaid on top of the slx layer. Optional so the pure
 *   property tests can exercise the single-layer contract.
 * @param {string} options.wwwDir       - absolute path to cordova/www/
 * @param {string} options.templatePath - absolute path to www-template/index.html
 * @param {'debug'|'release'} options.buildProfile
 * @param {object} options.env          - subset of process.env (ARGOS_SERVER_*)
 * @returns {Promise<{ filesCopied: number }>}
 * @throws {StagerError} when deployDir is missing (MISSING_DEPLOY),
 *   sdkDeployDir is provided but missing (MISSING_SDK_DEPLOY), or an
 *   ARGOS_SERVER_* override is invalid (INVALID_ENV)
 */
async function stage(options) {
  const {
    deployDir,
    sdkDeployDir,
    wwwDir,
    templatePath,
    buildProfile,
    env,
  } = options || {};

  const environment = env || {};

  // Step 1: assert deployDir exists (Requirement 3.4).
  let deployStat;
  try {
    deployStat = await fs.promises.stat(deployDir);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw new StagerError(
        `deploy/ not found at "${deployDir}". Run the SalesLogix release build first to produce the web app under products/argos-saleslogix/deploy/.`,
        'MISSING_DEPLOY'
      );
    }
    throw err;
  }
  if (!deployStat.isDirectory()) {
    throw new StagerError(
      `deploy/ at "${deployDir}" is not a directory. Run the SalesLogix release build first to produce the web app under products/argos-saleslogix/deploy/.`,
      'MISSING_DEPLOY'
    );
  }

  // Step 1b: when an SDK deploy overlay is requested, assert it exists too. The
  // web app cannot boot without the SDK / Dojo layer, so a missing overlay is a
  // hard error rather than a silent skip.
  if (sdkDeployDir !== undefined && sdkDeployDir !== null && sdkDeployDir !== '') {
    let sdkStat;
    try {
      sdkStat = await fs.promises.stat(sdkDeployDir);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        throw new StagerError(
          `argos-sdk deploy/ not found at "${sdkDeployDir}". Run the argos-sdk release build first to produce the SDK layer under argos-sdk/deploy/.`,
          'MISSING_SDK_DEPLOY'
        );
      }
      throw err;
    }
    if (!sdkStat.isDirectory()) {
      throw new StagerError(
        `argos-sdk deploy/ at "${sdkDeployDir}" is not a directory. Run the argos-sdk release build first to produce the SDK layer under argos-sdk/deploy/.`,
        'MISSING_SDK_DEPLOY'
      );
    }
  }

  // Step 2: recursively delete and recreate wwwDir (Requirement 3.1).
  await fs.promises.rm(wwwDir, { recursive: true, force: true });
  await fs.promises.mkdir(wwwDir, { recursive: true });

  // Step 3: walk deployDir, copying every non-excluded file
  // (Requirements 3.2, 3.5, 3.6). All writes go under wwwDir; deployDir is
  // only read (Requirement 3.7).
  let filesCopied = await copyTree(deployDir, '', wwwDir);

  // Step 3b: overlay the SDK deploy on top of the slx layer, mirroring the
  // production IIS assembly (unstash slx, then sdk, into the same directory).
  // The two layers are complementary in practice, but should they ever share a
  // path the SDK layer wins, matching the IIS overlay order.
  if (sdkDeployDir !== undefined && sdkDeployDir !== null && sdkDeployDir !== '') {
    filesCopied += await copyTree(sdkDeployDir, '', wwwDir);
  }

  // Step 4: copy the entry template over wwwDir/index.html (Requirement 3.3).
  const indexDest = path.join(wwwDir, 'index.html');
  await fs.promises.mkdir(path.dirname(indexDest), { recursive: true });
  await fs.promises.copyFile(templatePath, indexDest);

  // Step 5: for debug builds, overwrite production.js with the development
  // configuration content (Requirement 7.3). For release, leave the copied
  // production.js as-is (Requirement 7.2).
  const productionDest = path.join(wwwDir, ...PRODUCTION_CONFIG_RELPATH.split('/'));
  if (buildProfile === 'debug') {
    const developmentSrc = path.join(deployDir, ...DEVELOPMENT_CONFIG_RELPATH.split('/'));
    await fs.promises.mkdir(path.dirname(productionDest), { recursive: true });
    await fs.promises.copyFile(developmentSrc, productionDest);
  }

  // Step 6: when any ARGOS_SERVER_* override is non-empty, validate it and
  // rewrite production.js (Requirements 7.4, 7.5). When no override is present,
  // do not rewrite at all so the file stays byte-for-byte identical
  // (Requirement 7.6).
  const hasOverride = SERVER_OVERRIDE_VARS.some((name) => isNonEmpty(environment[name]));
  if (hasOverride) {
    const validation = configRewriter.validate(environment);
    if (!validation.valid) {
      throw new StagerError(validation.reason, 'INVALID_ENV', validation.variable);
    }

    const currentContents = await fs.promises.readFile(productionDest, 'utf8');
    const rewritten = configRewriter.rewrite(currentContents, environment);
    await fs.promises.writeFile(productionDest, rewritten);
  }

  // Step 7: report how many files were copied from deployDir.
  return { filesCopied };
}

module.exports = {
  EXCLUDED_FILES,
  StagerError,
  stage,
};
