'use strict';

/**
 * Bootstrap Guard
 *
 * Formalizes the `deviceready` guard semantics used by the Cordova entry
 * template (`cordova/www-template/index.html`). The web app bootstrap
 * (`crm/Bootstrap`) must run exactly once per page load, deferred until either
 * the Cordova `deviceready` event fires or a fallback timeout elapses (so the
 * same `index.html` can be opened in a desktop browser for diagnostics).
 *
 * This is a pure Node (CommonJS) helper consumed by the Cordova Grunt tasks
 * and exercised by the property test with a fake scheduler; it is not an AMD
 * module. The entry template inlines the same logic. To keep both call sites
 * deterministic and testable, this module never touches real timers or the
 * global console - all timing goes through the injected `scheduler` and all
 * logging through the injected `console`.
 *
 * Feature: cordova-native-shell-bundling
 * Requirements: 4.3, 4.4, 4.5
 */

/** Default fallback delay (ms) before bootstrapping without `deviceready`. */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Create a bootstrap guard.
 *
 * The returned handlers share a single `bootstrapped` flag. The first handler
 * to fire invokes `bootstrap()` and sets the flag; every later invocation -
 * whether from a repeated `deviceready` event or from the fallback timeout - is
 * a no-op. The fallback timeout emits a `console.warn` naming the `deviceready`
 * timeout ONLY when it is the trigger that actually performs the bootstrap
 * (i.e. when `bootstrapped` was still `false` when the timer fired).
 *
 * @param {object} options
 * @param {{ setTimeout: function }} options.scheduler - injected timer source;
 *   `scheduler.setTimeout(callback, timeoutMs)` is used instead of the global
 *   `setTimeout` so tests can drive timing with a fake scheduler.
 * @param {{ warn: function }} options.console - injected console used for the
 *   timeout warning.
 * @param {function} options.bootstrap - the inner bootstrap callback (the
 *   `crm/Bootstrap` invocation in the entry template). Called at most once.
 * @param {number} [options.timeoutMs=10000] - fallback delay in milliseconds.
 * @returns {{ onDeviceReady: function, onDomContentLoaded: function }} event
 *   handlers to wire to `deviceready` and `DOMContentLoaded` respectively.
 */
function createBootstrapGuard(options) {
  const settings = options || {};
  const scheduler = settings.scheduler;
  const guardConsole = settings.console;
  const bootstrap = settings.bootstrap;
  const timeoutMs = settings.timeoutMs === undefined
    ? DEFAULT_TIMEOUT_MS
    : settings.timeoutMs;

  let bootstrapped = false;

  /**
   * Invoke `bootstrap()` exactly once. Subsequent calls are no-ops because the
   * `bootstrapped` flag is set on the first invocation.
   *
   * @returns {boolean} true if this call performed the bootstrap, false if it
   *   was a no-op because bootstrapping had already happened.
   */
  function startApp() {
    if (bootstrapped) {
      return false;
    }

    bootstrapped = true;
    bootstrap();
    return true;
  }

  /**
   * Handler for the Cordova `deviceready` event. Bootstraps the app on the
   * first invocation; later invocations are no-ops.
   */
  function onDeviceReady() {
    startApp();
  }

  /**
   * Handler for `DOMContentLoaded`. Schedules the fallback timeout through the
   * injected scheduler. When the timer fires, the app is bootstrapped only if
   * `deviceready` has not already done so, and a warning naming the
   * `deviceready` timeout is emitted in that fallback case only.
   */
  function onDomContentLoaded() {
    scheduler.setTimeout(function onFallbackTimeout() {
      if (bootstrapped) {
        return;
      }

      guardConsole.warn(
        'cordova: deviceready did not fire within ' + timeoutMs
          + ' ms; bootstrapping anyway'
      );
      startApp();
    }, timeoutMs);
  }

  return {
    onDeviceReady,
    onDomContentLoaded,
  };
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  createBootstrapGuard,
};
