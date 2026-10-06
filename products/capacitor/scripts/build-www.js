// Builds the Capacitor webDir (www) from the existing release outputs:
// argos-sdk/deploy first, then products/argos-saleslogix/deploy on top (same merge as the README).
// Server-only (ASP.NET) files and the service worker are left out. Adds capacitor.js to www/index.html only
// (the web deploy/index.html is not touched).
const fs = require('fs');
const path = require('path');

const sdkDeploy = path.resolve(__dirname, '../../../argos-sdk/deploy');
const appDeploy = path.resolve(__dirname, '../../argos-saleslogix/deploy');
const www = path.resolve(__dirname, '../www');

const EXCLUDE = ['App_Code', 'bin', 'scripts', 'Global.asax', 'index.aspx', 'index.aspx.cs',
  'index-head.ascx', 'index-body.ascx', 'index-body.ascx.cs', 'web.config', 'serviceworker.js',
  'ping.gif']; // configuration/production.js pings the SData server instead

if (!fs.existsSync(sdkDeploy) || !fs.existsSync(path.join(appDeploy, 'index.html'))) {
  console.error('Run build\\release.cmd in argos-sdk and products/argos-saleslogix first.');
  process.exit(1);
}

fs.rmSync(www, { recursive: true, force: true });
fs.cpSync(sdkDeploy, www, { recursive: true });
fs.cpSync(appDeploy, www, {
  recursive: true,
  filter: src => !EXCLUDE.includes(path.relative(appDeploy, src).split(path.sep)[0]),
});
fs.copyFileSync(path.resolve(__dirname, '../configuration/production.js'), path.join(www, 'configuration/production.js'));

// Capacitor JS API (CapacitorHttp, registerPlugin for Network) as a plain script, loaded before dojo.
// dist/capacitor.js is an IIFE (window.capacitorExports), not AMD, so the dojo loader is unaffected.
fs.copyFileSync(path.join(path.dirname(require.resolve('@capacitor/core/package.json')), 'dist/capacitor.js'),
  path.join(www, 'capacitor.js'));
const indexFile = path.join(www, 'index.html');
const html = fs.readFileSync(indexFile, 'utf8');
const anchor = html.match(/<script[^>]*src="content\/javascript\/argos-dependencies\.js"[^>]*><\/script>/);
if (!anchor) throw new Error('argos-dependencies.js script tag not found in index.html');
fs.writeFileSync(indexFile, html.replace(anchor[0], `<script type="text/javascript" src="capacitor.js"></script>\n    ${anchor[0]}`));

// Self-check
['index.html', 'capacitor.js', 'content/dojo/dojo/dojo.js', 'content/javascript/argos-sdk.js',
  'content/javascript/argos-saleslogix.js', 'content/css/app.min.css', 'content/css/themes/crm/sdk.min.crm.css',
  'configuration/production.default.js'].forEach((f) => {
  if (!fs.existsSync(path.join(www, f))) throw new Error(`missing ${f}`);
});
EXCLUDE.forEach((f) => {
  if (fs.existsSync(path.join(www, f))) throw new Error(`server-only file in www: ${f}`);
});
const capConfig = fs.readFileSync(path.join(www, 'configuration/production.js'), 'utf8');
if (!capConfig.includes('enableServiceWorker: false') || !capConfig.includes('_classifyProbe')) {
  throw new Error('Capacitor configuration/production.js was not applied');
}
if (!fs.readFileSync(indexFile, 'utf8').includes('src="capacitor.js"')) throw new Error('capacitor.js not in index.html');
console.log('www ready');
