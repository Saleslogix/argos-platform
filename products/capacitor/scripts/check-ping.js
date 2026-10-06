// Self-check for the Capacitor connectivity override in configuration/production.js
// (probe classifier, offline vs config error decision, probeServer, _ping). Run: npm test
const assert = require('assert');

let cfg;
global.define = (id, deps, cb) => { cfg = cb({ mixin: Object.assign }, {}); };
require('../configuration/production.js');

const store = {};
let net = { connected: true, connectionType: 'wifi' };
let getImpl;
let gets = [];
global.window = {
  localStorage: { getItem: k => (k in store ? store[k] : null) },
  capacitorExports: {
    CapacitorHttp: { get: (opts) => { gets.push(opts); return getImpl(opts); } },
    registerPlugin: () => ({ getStatus: () => Promise.resolve(net) }),
  },
};

let forced = 0;
let shown = [];
const app = Object.assign({}, cfg, {
  PING_TIMEOUT: 200,
  getService: () => ({
    getProtocol: () => 'https', getServerName: () => 'crm.example.com', getPort: () => false,
    getVirtualDirectory: () => 'sdata', getApplicationName: () => ({ text: 'slx' }), // sdata-client path segment shape, as observed
  }),
  forceOffline: () => { forced++; },
  getView: () => ({ showServerProbeError: (r) => { shown.push(r); } }),
});
const C = (r, e) => app._classifyProbe(r, e);
const kind = (r, e) => { const x = C(r, e); return `${x.kind}/${x.reason}`; };

(async () => {
  // (a) classifier: responses
  assert.strictEqual(kind({ status: 401, headers: { 'WWW-Authenticate': 'Basic realm="SalesLogix"' }, data: '' }), 'online/null');
  assert.strictEqual(kind({ status: 401, headers: { 'www-authenticate': 'Basic' }, data: '' }), 'online/null');
  assert.strictEqual(kind({ status: 200, headers: {}, data: '{"$resources":[]}' }), 'online/null');
  assert.strictEqual(kind({ status: 200, headers: {}, data: { $resources: [] } }), 'online/null');
  assert.strictEqual(kind({ status: 500, headers: {}, data: '[{"sdataCode":"ApplicationDiagnosis","severity":"Error","message":"x"}]' }), 'online/null');
  assert.strictEqual(kind({ status: 200, headers: {}, data: '<feed xmlns:sdata="http://schemas.sage.com/sdata/2008/1"></feed>' }), 'online/null');
  assert.strictEqual(kind({ status: 404, headers: {}, data: '<html>Not found</html>' }), 'wrongUrl/notSData');
  assert.strictEqual(kind({ status: 200, headers: { 'Content-Type': 'text/html' }, data: '<html>portal</html>' }), 'wrongUrl/notSData');
  assert.strictEqual(kind({ status: 401, headers: {}, data: 'nope' }), 'wrongUrl/notSData');
  assert.strictEqual(kind({ status: 200, headers: {}, data: '{"hello":1}' }), 'wrongUrl/notSData');
  // (a) classifier: native rejections (shapes as observed on the emulator, see verification.md)
  assert.strictEqual(kind(null, { message: 'Unable to resolve host "does-not-exist.invalid": No address associated with hostname' }), 'unreachable/hostNotFound');
  assert.strictEqual(kind(null, { code: 'UnknownHostException', message: 'Unable to resolve host "does-not-exist.invalid": No address associated with hostname' }), 'unreachable/hostNotFound');
  assert.strictEqual(kind(null, { code: 'ConnectException', message: 'Failed to connect to /127.0.0.1:9' }), 'unreachable/refused');
  assert.strictEqual(kind(null, { message: 'java.net.ConnectException: ECONNREFUSED (Connection refused)' }), 'unreachable/refused');
  assert.strictEqual(kind(null, { code: 'SSLException', message: 'Unable to parse TLS packet header' }), 'unreachable/certificate');
  assert.strictEqual(kind(null, { code: 'SocketTimeoutException', message: 'timeout' }), 'timeout/timeout');
  assert.strictEqual(kind(null, { code: 'SocketTimeoutException', message: 'failed to connect to /10.0.2.2 (port 9) from /10.0.2.15 (port 40686) after 3000ms' }), 'timeout/timeout');
  assert.strictEqual(kind(null, { message: 'java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.' }), 'unreachable/certificate');
  assert.strictEqual(kind(null, { message: 'failed to connect to /10.255.255.1 (port 80) from /10.0.2.16 (port 4000) after 3000ms' }), 'timeout/timeout');
  assert.strictEqual(kind(null, { message: 'Read timed out' }), 'timeout/timeout');
  assert.strictEqual(kind(null, { message: 'timeout' }), 'timeout/timeout');
  assert.strictEqual(kind(null, { message: 'CLEARTEXT communication to 10.0.2.2 not permitted by network security policy' }), 'unreachable/null');
  assert.strictEqual(kind(null, {}), 'unreachable/null');

  // (b) decision
  const good = 'https://crm.example.com/sdata';
  for (const k of ['unreachable', 'timeout', 'noNetwork', 'wrongUrl']) {
    assert.strictEqual(app._decideConnection({ kind: k }, `${good}/`, good), 'offline', k);
    assert.strictEqual(app._decideConnection({ kind: k }, good, null), 'configError', k);
    assert.strictEqual(app._decideConnection({ kind: k }, 'https://other/sdata', good), 'configError', k);
  }
  assert.strictEqual(app._decideConnection({ kind: 'online' }, good, null), 'online');

  // (c) probeServer
  net = { connected: false, connectionType: 'none' }; gets = [];
  assert.strictEqual((await app.probeServer(good)).kind, 'noNetwork');
  assert.strictEqual(gets.length, 0, 'no request when offline');
  // connected:false on cellular/wifi (unvalidated network, seen on the emulator) still probes
  net = { connected: false, connectionType: 'cellular' };
  getImpl = () => Promise.resolve({ status: 401, headers: { 'Www-Authenticate': 'Basic' }, data: '' });
  assert.strictEqual((await app.probeServer(good)).kind, 'online');
  assert.strictEqual(gets.length, 1, 'unvalidated network still probes');
  gets = [];
  net = { connected: true, connectionType: 'wifi' };
  assert.strictEqual((await app.probeServer(`${good}/`)).kind, 'online');
  assert.strictEqual(gets.length, 1);
  assert.strictEqual(gets[0].url, 'https://crm.example.com/sdata/slx/system/-/?format=json');
  assert.ok(!Object.keys(gets[0].headers).some(h => /authorization/i.test(h)), 'no credentials');
  assert.strictEqual(gets[0].connectTimeout, 160, 'native timeouts inside the ping interval');
  assert.strictEqual(gets[0].readTimeout, 160);
  getImpl = () => new Promise(() => {}); // hung
  const start = Date.now();
  assert.strictEqual((await app.probeServer(good)).kind, 'timeout');
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 170 && elapsed < 200, `guard fires before the next initPing tick (${elapsed} ms)`);
  // Longer submit-time budget (Login passes it): a slow (cold start) answer past the default guard still counts.
  gets = [];
  getImpl = () => new Promise(r => setTimeout(() => r({ status: 401, headers: { 'WWW-Authenticate': 'Basic' }, data: '' }), 250));
  assert.strictEqual((await app.probeServer(good)).kind, 'timeout', 'default budget gives up before 250 ms');
  assert.strictEqual((await app.probeServer(good, 500)).kind, 'online', 'longer budget waits for the slow answer');
  assert.strictEqual(gets[1].connectTimeout, 400, 'native timeouts scale with the budget');
  assert.strictEqual(gets[1].readTimeout, 400);
  getImpl = () => new Promise(() => {});
  const startLong = Date.now();
  assert.strictEqual((await app.probeServer(good, 500)).kind, 'timeout');
  assert.ok(Date.now() - startLong >= 440, 'guard follows the longer budget');
  getImpl = () => Promise.reject({ message: 'Failed to connect to /10.0.2.2:9' });
  assert.strictEqual((await app.probeServer(good)).reason, 'refused');

  // (d) _ping (no saved serverUrl -> connections.crm == good)
  shown = []; forced = 0;
  assert.strictEqual(await app._ping(), true, 'configError keeps the form enabled');
  assert.strictEqual(shown.length, 1);
  assert.strictEqual(shown[0].reason, 'refused');
  shown = [];
  store.lastGoodServerUrl = good;
  assert.strictEqual(await app._ping(), false, 'known-good URL down -> offline');
  assert.strictEqual(forced, 0);
  net = { connected: false, connectionType: 'none' };
  assert.strictEqual(await app._ping(), false);
  assert.strictEqual(forced, 1, 'noNetwork forces offline at once');
  net = { connected: true, connectionType: 'wifi' };
  getImpl = () => Promise.resolve({ status: 200, headers: {}, data: { $resources: [] } });
  shown = [];
  assert.strictEqual(await app._ping(), true);
  assert.deepStrictEqual(shown, [null], 'online clears a stale probe error');
  store.serverUrl = 'http://10.0.2.2:8090/x/sdata/';
  await app._ping();
  assert.strictEqual(gets[gets.length - 1].url, 'http://10.0.2.2:8090/x/sdata/slx/system/-/?format=json', 'saved Server URL wins');
  assert.strictEqual(gets[gets.length - 1].connectTimeout, 160, 'background _ping keeps the short budget');

  // (e) Server URL changed while a background probe ran: the stale (known-good, failing) result is dropped,
  // no error for the old URL and no offline decision; the answer is for the new URL.
  store.serverUrl = good; // known-good
  let release;
  getImpl = () => new Promise((r) => { release = r; });
  shown = []; gets = [];
  const stale = app._ping();
  await new Promise(r => setImmediate(r)); // let the probe start
  store.serverUrl = 'http://new-host/sdata'; // user submits a new URL
  getImpl = () => Promise.resolve({ status: 401, headers: { 'WWW-Authenticate': 'Basic' }, data: '' });
  release({ status: 404, headers: {}, data: '<html></html>' });
  assert.strictEqual(await stale, true, 'stale failure does not take the new URL offline');
  assert.deepStrictEqual(shown, [null], 'no stale error for the old URL');
  assert.strictEqual(gets[gets.length - 1].url, 'http://new-host/sdata/slx/system/-/?format=json', 're-probed the current URL');

  // No Capacitor (www in a desktop browser): never blocks
  delete global.window.capacitorExports;
  assert.strictEqual((await app.probeServer(good)).kind, 'online');

  console.log('check-ping ok');
})().catch((e) => { console.error(e); process.exit(1); });
