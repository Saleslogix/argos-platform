/* eslint-env node */
/* eslint-disable no-console */

const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const serveIndex = require('serve-index');
const httpProxy = require('http-proxy');

let config;
try {
  config = require('./config.json');
} catch (e) {
  console.warn(
    'WARNING:: Failed loading config.json, falling back to default.config.json. Copy the default.config.json to config.json for your environment.'
  );
  config = require('./default.config.json');
}

const proxyConfig = config.proxy || {};
const proxyOptions = {
  target: {
    host: proxyConfig.host,
    port: proxyConfig.port,
    protocol: proxyConfig.protocol,
  },
  secure: false, // ignore cert errors
  // Rewrite the Host header to the target host. Without this the incoming "localhost:8000"
  // Host header is forwarded, and Node derives the TLS SNI servername from that header, sending
  // SNI "localhost" to the backend. SNI-based HTTPS hosts (e.g. IIS) then reset the connection
  // before the TLS handshake completes. changeOrigin makes the SNI match the target host.
  changeOrigin: true,
  xfwd: true,
  ws: false,
  prependPath: true,
};

const proxy = httpProxy.createProxyServer(proxyOptions);

proxy.on('error', (err) => {
  console.error('Proxy error:', err);
});

const app = express();

app.use((req, res, next) => {
  if (req.path.startsWith('/sdata')) {
    proxy.web(req, res);
  } else {
    next();
  }
});
app.use(express.static('../../', { index: false }));
app.use(serveIndex('../../'));

const serverOptions = {
  key: fs.readFileSync('./scripts/server.key'),
  cert: fs.readFileSync('./scripts/server.crt'),
};

const port = Number(config.port);

if (config.https) {
  console.log(`Secure server started on https://localhost:${port}/`);
  https.createServer(serverOptions, app).listen(port);
} else {
  console.log(`Server started on http://localhost:${port}/`);
  http.createServer(app).listen(port);
}
