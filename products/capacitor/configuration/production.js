/* eslint-disable */
// Capacitor-only override. scripts/build-www.js copies this over www/configuration/production.js;
// the web deployment keeps products/argos-saleslogix/configuration/production.js (SDK ping.gif ping,
// enableOfflineSupport default false).
//
// Connectivity (replaces the SDK ping.gif ping, which would hit the app bundle and always succeed):
// - @capacitor/network connectionType 'none' -> offline at once, no probe (its `connected` flag is not used, see probeServer).
// - Otherwise a native CapacitorHttp.get probes <Server URL>/<app>/system/-/?format=json without credentials.
//   It is native, so it bypasses CORS and can't raise a WebView auth prompt.
// Native HTTP (capacitor.config.json plugins.CapacitorHttp/CapacitorCookies): every absolute-URL fetch/XHR goes
//   native (GETs through the https://localhost/_capacitor_http_interceptor_ proxy, other methods over the bridge),
//   so no CORS. Server cookies (ASP.NET_SessionId, forms ticket) live in the native cookie jar, which keeps one
//   server session per app run (the jar's session cookies are cleared at each app start). See patchXhrTimeout
//   for the one gap in the patched XHR.
// - The JS API comes from www/capacitor.js (@capacitor/core/dist/capacitor.js, a plain IIFE that sets
//   window.capacitorExports; build-www.js adds its <script> tag). No bundler. It is read lazily at call time;
//   if it is missing (e.g. this www opened in a desktop browser) the probe reports online and blocks nothing.
// http:// SData hosts (e.g. http://10.0.2.2:8080/SlxClient/sdata) work only in debug APKs, which allow
// cleartext + mixed content. Release APKs block http://, so the probe reports it as unreachable.
define('configuration/production', [
  'dojo/_base/lang',
  'configuration/production.default'
], function cb(lang, defaultConfig) {
  const trim = u => (u || '').replace(/\/+$/, '');
  let network; // registerPlugin warns when called twice for the same plugin
  const getNetwork = cap => network || (network = cap.registerPlugin('Network'));

  // Capacitor's patched XHR sends non-GET requests over the bridge and never fires `timeout` (no native
  // connect/read timeout either), so a sign-in POST or data write to a server that never answers would hang.
  // Emulate xhr.timeout for those requests, in the order crm/Application.authenticateUser handles:
  // status 0, readyState 4 (the patch dispatches readystatechange async), then `timeout` synchronously.
  // GETs go through the real-XHR proxy, where xhr.timeout already works (no own readyState there).
  // ponytail: a native error arriving after the emulated timeout still fires `failure` once more
  // (authenticateUser settles once; other callers may see a second callback). Upgrade path: a Capacitor
  // patch that passes connectTimeout/readTimeout to CapacitorHttp.request.
  function patchXhrTimeout(win) {
    const capXhr = win.CapacitorWebXMLHttpRequest;
    if (!capXhr || win.XMLHttpRequest === capXhr.fullObject) {
      return;
    }
    const Patched = win.XMLHttpRequest;
    win.XMLHttpRequest = function XMLHttpRequest() {
      const xhr = new Patched();
      // Own property: the patch reassigns the shared prototype methods on every construction.
      xhr.send = function send(body) {
        const result = Object.getPrototypeOf(this).send.call(this, body);
        if (this.timeout > 0 && Object.getOwnPropertyDescriptor(this, 'readyState')) {
          setTimeout(() => {
            if (this.readyState !== 4 && this.readyState !== 0) {
              this.status = 0;
              this.readyState = 4;
              this.dispatchEvent(new Event('timeout'));
            }
          }, this.timeout);
        }
        return result;
      };
      return xhr;
    };
    Object.assign(win.XMLHttpRequest, Patched);
  }
  if (typeof window !== 'undefined') {
    patchXhrTimeout(window);
  }

  return lang.mixin(defaultConfig, {
    _patchXhrTimeout: patchXhrTimeout, // exposed for scripts/check-ping.js
    // Assets are bundled in the app, so no service worker app-shell cache.
    enableServiceWorker: false,
    // crm/Application turns the service worker on whenever enableOfflineSupport is set; keep it off here
    // (serviceworker.js is not shipped). All callers fall back to a resolved promise.
    isServiceWorkerEnabled() {
      return false;
    },

    // Capacitor only (the web build keeps the default false): PouchDB briefcase data, and skip login
    // to the offline home when a previously working Server URL can't be reached.
    enableOfflineSupport: true,

    // Temporary: show a "Server URL" field on the login view (prefilled from connections.crm below,
    // last value saved in localStorage). The web build never sets this, so its login is unchanged.
    enableServerUrl: true,

    // The app origin is https://localhost, so SData can't be same-origin.
    // Set serverName/port to the real SData host before building.
    // Full object required: the mixin is shallow.
    connections: {
      crm: {
        isDefault: true,
        offline: true,
        serverName: 'crm.example.com',
        virtualDirectory: 'sdata',
        applicationName: 'slx',
        contractName: 'dynamic',
        dataSet: '-',
        port: false,
        protocol: 'https',
        timeout: 30000,
        compact: true,
        json: true,
        // Must stay false: native HTTP ignores xhr.open(user, password), so credentials must go in the Authorization header.
        useCredentialedRequest: false,
      },
    },

    // Saved Server URL (Login view), else connections.crm. Same formula as Login.getServerUrl.
    _serverUrl() {
      try {
        const saved = window.localStorage.getItem('serverUrl');
        if (saved) {
          return saved;
        }
      } catch (e) {}
      const service = this.getService();
      const port = service.getPort();
      return `${service.getProtocol() || 'http'}://${service.getServerName()}${port ? `:${port}` : ''}/${service.getVirtualDirectory()}`;
    },

    // Classifies a CapacitorHttp.get result (response or rejection) as
    // { kind: online | wrongUrl | unreachable | timeout, reason, detail }. detail is for logging only.
    // ponytail: errors are classified by regex on the Android exception text that CapacitorHttp passes
    // through (see verification.md for the observed shapes). Upgrade path: native error codes if Capacitor exposes them.
    _classifyProbe(response, error) {
      if (error) {
        const detail = `${error.code || ''} ${error.message || ''}`.trim();
        const reasons = [
          ['timeout', /SocketTimeout|timed? ?out|timeout|after \d+ ?ms/i], // first: Android timeouts also say "failed to connect"
          ['hostNotFound', /UnknownHost|Unable to resolve host|No address associated/i],
          ['certificate', /SSL|TLS|Certificate|CertPath|Trust anchor|handshake/i],
          ['refused', /ConnectException|ECONNREFUSED|Connection refused|Failed to connect/i],
        ];
        const hit = reasons.find(([, re]) => re.test(detail));
        const reason = hit ? hit[0] : null;
        return { kind: reason === 'timeout' ? 'timeout' : 'unreachable', reason, detail };
      }

      const headers = response.headers || {};
      const hasAuthHeader = Object.keys(headers).some(h => h.toLowerCase() === 'www-authenticate');
      if ((response.status === 401 || response.status === 403) && hasAuthHeader) {
        return { kind: 'online', reason: null, detail: `${response.status}` };
      }

      let data = response.data;
      if (typeof data === 'string' && /^\s*[{[]/.test(data)) {
        try {
          data = JSON.parse(data);
        } catch (e) {}
      }
      const sdataKeys = ['$resources', '$diagnoses', 'diagnoses', '$url', '$descriptor'];
      const isSData = (typeof data === 'string' && data.includes('schemas.sage.com/sdata'))
        || (Array.isArray(data) && !!data[0] && typeof data[0] === 'object'
          && ('sdataCode' in data[0] || ('message' in data[0] && 'severity' in data[0])))
        || (!!data && typeof data === 'object' && !Array.isArray(data) && sdataKeys.some(k => k in data));
      if (isSData) {
        return { kind: 'online', reason: null, detail: `${response.status}` };
      }
      // 404, HTML (captive portals, proxies), non-SData 200, 5xx without an SData body.
      return { kind: 'wrongUrl', reason: 'notSData', detail: `${response.status}` };
    },

    // online | offline | configError. A URL that never worked is a configuration error, never offline.
    // ponytail: on a known-good URL even a wrongUrl answer means offline (most likely a captive portal);
    // a server that really moved shows the login again once the user changes the URL.
    _decideConnection(result, url, lastGood) {
      if (result.kind === 'online') {
        return 'online';
      }
      return lastGood && trim(url) === trim(lastGood) ? 'offline' : 'configError';
    },

    // Resolves a _classifyProbe result, or { kind: 'noNetwork' } when the device has no network (no request sent).
    // timeout (ms) is optional; the default fits the background ping interval.
    async probeServer(url, timeout) {
      const cap = window.capacitorExports;
      if (!cap || !cap.CapacitorHttp) {
        return { kind: 'online', reason: null, detail: 'no Capacitor' };
      }
      // Only connectionType 'none' (airplane mode, no interface) skips the probe. Android's `connected` is
      // NET_CAPABILITY_VALIDATED && INTERNET, i.e. "Google's connectivity check passed": it is false on intranet-only
      // Wi-Fi (on-prem SLX), behind TLS-inspecting proxies and captive portals even when SData is reachable,
      // so connected:false on wifi/cellular/unknown still runs the probe and lets it decide.
      try {
        const status = await getNetwork(cap).getStatus();
        if (status && status.connectionType === 'none') {
          return { kind: 'noNetwork', reason: 'noNetwork', detail: 'none' };
        }
      } catch (e) {} // Network plugin unavailable: fall through to the probe.

      const service = this.getService();
      // sdata-client returns the path segment object ({ text: 'slx' }), not a string.
      const product = service.getApplicationName && service.getApplicationName();
      const appName = (product && (product.text || (typeof product === 'string' && product))) || 'slx';
      // The SDK initPing loop calls _ping every PING_TIMEOUT without waiting, so by default the whole probe must
      // finish inside one interval: native timeouts at 80%, the JS guard (connect + read combined) at 90%.
      // The Login submit passes a longer budget (an IIS cold start can take several seconds).
      const budget = timeout || this.PING_TIMEOUT;
      const nativeTimeout = Math.floor(budget * 0.8);
      let timer;
      const guard = new Promise((resolve) => {
        timer = setTimeout(() => resolve({ kind: 'timeout', reason: 'timeout', detail: 'guard' }), Math.floor(budget * 0.9));
      });
      // No credentials and no X-Authorization-Mode: no-challenge, so SData answers 401 + WWW-Authenticate.
      const probe = cap.CapacitorHttp.get({
        url: `${trim(url)}/${appName}/system/-/?format=json`,
        headers: { Accept: 'application/json,*/*' },
        connectTimeout: nativeTimeout,
        readTimeout: nativeTimeout,
        responseType: 'text',
      }).then(r => this._classifyProbe(r, null), e => this._classifyProbe(null, e || {}));
      try {
        return await Promise.race([probe, guard]);
      } finally {
        clearTimeout(timer);
      }
    },

    // Replaces the SDK ping.gif ping (called by the SDK initPing retry loop).
    async _ping() {
      const url = this._serverUrl();
      const result = await this.probeServer(url);
      // The user submitted a different Server URL while this probe ran: drop the stale result (no field
      // error, no offline decision for the old URL) and answer for the current URL instead.
      if (url !== this._serverUrl()) {
        return this._ping();
      }
      let lastGood = null;
      try {
        lastGood = window.localStorage.getItem('lastGoodServerUrl');
      } catch (e) {}
      const decision = this._decideConnection(result, url, lastGood);
      if (decision === 'offline') {
        if (result.kind === 'noNetwork') {
          this.forceOffline(); // no need to wait out PING_RETRY x PING_TIMEOUT
        }
        return false;
      }
      // configError stays "online" so the login form stays enabled, and flags the Server URL field;
      // online clears a probe error left from an earlier ping (e.g. "No network connection.").
      const login = this.getView('login');
      if (login && login.showServerProbeError) {
        login.showServerProbeError(decision === 'configError' ? result : null);
      }
      return true;
    },

    initConnects() {
      Object.getPrototypeOf(this).initConnects.apply(this, arguments);
      const cap = window.capacitorExports;
      if (!cap) {
        return;
      }
      try {
        // Leaving 'none' re-probes through the debounced retry loop; entering 'none' goes offline at once.
        getNetwork(cap).addListener('networkStatusChange', (s) => {
          if (s.connectionType === 'none') {
            this._ping();
          } else {
            this.ping();
          }
        });
      } catch (e) {}
    },
  });
});
