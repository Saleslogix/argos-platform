/* eslint-disable */
define('spec/Views/Login.spec', [
  'crm/Views/Login'
], function(
  Login
) {
  describe('crm.Views.Login server URL', function() {
    var _app = window.App;
    var service;

    function makeService() {
      var s = { protocol: 'https', serverName: 'crm.example.com', port: false, virtualDirectory: 'sdata' };
      s.getProtocol = function() { return s.protocol; };
      s.getServerName = function() { return s.serverName; };
      s.getPort = function() { return s.port; };
      s.getVirtualDirectory = function() { return s.virtualDirectory; };
      s.setProtocol = function(v) { s.protocol = v; return s; };
      s.setServerName = function(v) { s.serverName = v; return s; };
      s.setPort = function(v) { s.port = v; return s; };
      s.setVirtualDirectory = function(v) { s.virtualDirectory = v; return s; };
      return s;
    }

    function makeView() {
      var view = Object.create(Login.prototype);
      view.layout = null;
      return view;
    }

    beforeEach(function() {
      service = makeService();
      window.App = {
        bars: {},
        getService: function() { return service; },
        getConnection: function() { return service; }
      };
      window.localStorage.removeItem('serverUrl');
      window.localStorage.removeItem('lastGoodServerUrl');
    });

    afterEach(function() {
      window.App = _app;
      window.localStorage.removeItem('serverUrl');
      window.localStorage.removeItem('lastGoodServerUrl');
    });

    function makeSubmitView(url) {
      var view = makeView();
      view.fields = { serverUrl: {} };
      view.getValues = function() { return { serverUrl: url, 'username-display': 'admin' }; };
      view.shown = [];
      view._showServerUrlError = function(msg) { view.shown.push(msg); };
      view.validateCredentials = jasmine.createSpy('validateCredentials');
      return view;
    }

    function signInFailure(result, probedOnline, capacitor) {
      var view = makeView();
      view.fields = capacitor ? { serverUrl: {} } : {};
      if (capacitor) {
        window.App.probeServer = function() {};
      }
      view.shown = [];
      view._showServerUrlError = function(msg) { view.shown.push(msg); };
      view.handleError = jasmine.createSpy('handleError');
      view.serverCorsText = 'CORS.';
      view.signInTimeoutText = 'Slow.';
      window.App.authenticateUser = function(credentials, options) {
        expect(view.busy).toBe(true);
        expect(document.body.classList.contains('busy')).toBe(true);
        options.failure.call(options.scope, result);
      };
      view.validateCredentials({ username: 'admin' }, probedOnline);
      expect(view.busy).toBe(false);
      expect(document.body.classList.contains('busy')).toBe(false);
      return view;
    }

    it('shows a CORS field error, not the alert, for a status 0 failure after an online probe', function() {
      var view = signInFailure({ response: { status: 0 }, timeout: false }, true, true);
      expect(view.shown).toEqual(['CORS.']);
      expect(view.handleError).not.toHaveBeenCalled();
      view = signInFailure({ response: undefined, timeout: false }, true, true);
      expect(view.shown).toEqual(['CORS.']);
    });

    it('shows a timeout field error for a sign-in timeout', function() {
      var view = signInFailure({ response: { status: 0 }, timeout: true }, true, true);
      expect(view.shown).toEqual(['Slow.']);
      expect(view.handleError).not.toHaveBeenCalled();
    });

    it('keeps the alert path for bad credentials, an unprobed URL and the web build', function() {
      var view = signInFailure({ response: { status: 403 }, timeout: false }, true, true);
      expect(view.shown).toEqual([]);
      expect(view.handleError.calls.argsFor(0)[0].status).toEqual(403);
      view = signInFailure({ response: { status: 0 }, timeout: false }, undefined, true);
      expect(view.handleError).toHaveBeenCalled();
      delete window.App.probeServer;
      view = signInFailure({ response: { status: 0 }, timeout: true }, true, false);
      expect(view.handleError).toHaveBeenCalled();
    });

    it('passes the longer submit budget to the probe and flags the online result', function(done) {
      window.App.probeServer = jasmine.createSpy('probeServer').and.returnValue(Promise.resolve({ kind: 'online' }));
      var view = makeSubmitView('http://host/sdata');
      view.authenticate().then(function() {
        expect(window.App.probeServer).toHaveBeenCalledWith('http://host/sdata', 10000);
        expect(view.validateCredentials.calls.argsFor(0)[1]).toBe(true);
        done();
      });
    });

    it('builds the probe error message from the reason', function() {
      var view = makeView();
      view.serverUnreachableText = 'Unreachable.';
      view.serverHostNotFoundText = 'Host.';
      view.serverRefusedText = 'Refused.';
      view.serverCertificateText = 'Cert.';
      view.serverNotSDataText = 'NotSData.';
      view.serverTimeoutText = 'Timeout.';
      view.serverNoNetworkText = 'NoNet.';
      expect(view.serverProbeErrorText({ reason: 'hostNotFound' })).toEqual('Unreachable. Host.');
      expect(view.serverProbeErrorText({ reason: 'refused' })).toEqual('Unreachable. Refused.');
      expect(view.serverProbeErrorText({ reason: 'certificate' })).toEqual('Unreachable. Cert.');
      expect(view.serverProbeErrorText({ reason: 'notSData' })).toEqual('Unreachable. NotSData.');
      expect(view.serverProbeErrorText({ reason: 'timeout' })).toEqual('Unreachable. Timeout.');
      expect(view.serverProbeErrorText({ reason: 'noNetwork' })).toEqual('Unreachable. NoNet.');
      expect(view.serverProbeErrorText({ reason: null })).toEqual('Unreachable.');
    });

    it('shows the probe error and does not sign in for a never-validated bad URL', function(done) {
      window.App.probeServer = jasmine.createSpy('probeServer').and.returnValue(Promise.resolve({ kind: 'wrongUrl', reason: 'notSData' }));
      var view = makeSubmitView('http://host/sdata');
      view.serverUnreachableText = 'Unreachable.';
      view.serverNotSDataText = 'NotSData.';
      view.authenticate().then(function() {
        expect(window.App.probeServer).toHaveBeenCalledWith('http://host/sdata', 10000);
        expect(view.shown[view.shown.length - 1]).toEqual('Unreachable. NotSData.');
        expect(view.validateCredentials).not.toHaveBeenCalled();
        expect(view.busy).toBe(false);
        done();
      });
    });

    it('disables the form during the submit probe and re-enables it after the error', function(done) {
      var resolveProbe;
      window.App.probeServer = function() { return new Promise(function(r) { resolveProbe = r; }); };
      var view = makeSubmitView('http://host/sdata');
      view.serverUnreachableText = 'Unreachable.';
      var pending = view.authenticate();
      expect(view.busy).toBe(true);
      expect(document.body.classList.contains('busy')).toBe(true);
      resolveProbe({ kind: 'timeout', reason: null });
      pending.then(function() {
        expect(view.busy).toBe(false);
        expect(document.body.classList.contains('busy')).toBe(false);
        expect(view.shown[view.shown.length - 1]).toEqual('Unreachable.');
        done();
      });
    });

    it('re-enables the form when the probe rejects, then signs in', function(done) {
      window.App.probeServer = function() { return Promise.reject(new Error('bug')); };
      var view = makeSubmitView('http://host/sdata');
      view.authenticate().then(function() {
        expect(view.validateCredentials).toHaveBeenCalled();
        expect(view.busy).toBe(false);
        expect(document.body.classList.contains('busy')).toBe(false);
        done();
      });
    });

    it('clears a probe error on a later online ping, but not other field errors', function() {
      var view = makeView();
      var container = document.createElement('div');
      var input = document.createElement('input');
      container.appendChild(input);
      view.fields = { serverUrl: { containerNode: container, inputNode: input } };
      view.serverUnreachableText = 'Unreachable.';
      view.showServerProbeError({ reason: null });
      expect(container.className).toContain('row-error');
      expect(container.querySelector('[role="alert"]').textContent).toEqual('Unreachable.');
      view.showServerProbeError(null);
      expect(container.className).not.toContain('row-error');
      expect(input.getAttribute('aria-invalid')).toEqual('false');
      expect(container.querySelector('[role="alert"]')).toBeNull();
      view._showServerUrlError('bad');
      view.showServerProbeError(null);
      expect(container.querySelector('[role="alert"]').textContent).toEqual('bad');
    });

    it('signs in after an online probe', function(done) {
      window.App.probeServer = jasmine.createSpy('probeServer').and.returnValue(Promise.resolve({ kind: 'online' }));
      var view = makeSubmitView('http://host/sdata');
      view.authenticate().then(function() {
        expect(view.validateCredentials).toHaveBeenCalled();
        done();
      });
    });

    it('skips the probe for the last good URL', function() {
      window.App.probeServer = jasmine.createSpy('probeServer');
      window.localStorage.setItem('lastGoodServerUrl', 'http://host/sdata/');
      var view = makeSubmitView('http://host/sdata');
      view.authenticate();
      expect(window.App.probeServer).not.toHaveBeenCalled();
      expect(view.validateCredentials).toHaveBeenCalled();
    });

    it('signs in without a probe when App.probeServer is not defined (web build)', function() {
      var view = makeSubmitView('http://host/sdata');
      view.authenticate();
      expect(view.validateCredentials).toHaveBeenCalled();
    });

    it('does not add the field when enableServerUrl is not set (web build)', function() {
      var names = makeView().createLayout().map(function(f) { return f.name; });
      expect(names).toEqual(['username-display', 'password-display', 'remember']);
    });

    it('adds the field first when enableServerUrl is set (Capacitor build)', function() {
      window.App.enableServerUrl = true;
      var names = makeView().createLayout().map(function(f) { return f.name; });
      expect(names).toEqual(['serverUrl', 'username-display', 'password-display', 'remember']);
    });

    it('accepts only absolute http(s) URLs', function() {
      var view = makeView();
      expect(view.parseServerUrl('crm.example.com')).toBeNull();
      expect(view.parseServerUrl('ftp://crm.example.com/sdata')).toBeNull();
      expect(view.parseServerUrl('')).toBeNull();
      expect(view.parseServerUrl('http://10.0.0.5:8080/SLX/sdata/')).toEqual({
        protocol: 'http', serverName: '10.0.0.5', port: '8080', virtualDirectory: 'SLX/sdata'
      });
      expect(view.parseServerUrl('https://crm.example.com').virtualDirectory).toEqual('sdata');
    });

    it('prefills from the connection, then from the saved value', function() {
      var view = makeView();
      expect(view.getServerUrl()).toEqual('https://crm.example.com/sdata');
      view.applyServerUrl('http://host:81/sdata');
      expect(service.protocol).toEqual('http');
      expect(service.serverName).toEqual('host');
      expect(service.port).toEqual('81');
      expect(view.getServerUrl()).toEqual('http://host:81/sdata');
    });

    it('does not authenticate when the URL is invalid', function() {
      window.App.enableServerUrl = true;
      var view = makeView();
      view.fields = { serverUrl: {} };
      view.getValues = function() { return { serverUrl: 'not a url', 'username-display': 'admin' }; };
      var shown;
      view._showServerUrlError = function(msg) { shown = msg; };
      view.invalidServerUrlText = 'bad';
      view.validateCredentials = jasmine.createSpy('validateCredentials');
      view.authenticate();
      expect(shown).toEqual('bad');
      expect(view.validateCredentials).not.toHaveBeenCalled();
      expect(service.serverName).toEqual('crm.example.com');
    });
  });
});
