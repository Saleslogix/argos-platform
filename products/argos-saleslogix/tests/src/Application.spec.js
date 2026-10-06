/* eslint-disable */
define('spec/Application.spec', [
  'Mobile/SalesLogix/Application',
  'configuration/development' // TODO: Should we add a test configuration?
], function(application, configuration) {
  describe('Mobile/SalesLogix/Application', function() {
    describe('bootstrap', function() {
      it('should activate', function() {
        configuration.ping = function() {};
        var instance = new application(configuration);

        spyOn(instance, 'activate')
          .and.callThrough();
        spyOn(instance, 'init')
          .and.callThrough();
        spyOn(instance, 'initConnects')
          .and.callThrough();
        spyOn(instance, 'initServices')
          .and.callThrough();
        spyOn(instance, 'initModules');
        spyOn(instance, 'initToolbars');
        spyOn(instance, 'initHash');
        spyOn(instance, 'initToasts');
        spyOn(instance, 'run')
          .and.callThrough();

        instance.activate();
        expect(instance.activate)
          .toHaveBeenCalled();

        instance.init();
        expect(instance.initConnects)
          .toHaveBeenCalled();
        expect(instance.initServices)
          .toHaveBeenCalled();
        expect(instance.initModules)
          .toHaveBeenCalled();
        expect(instance.initToolbars)
          .toHaveBeenCalled();
        expect(instance.initHash)
          .toHaveBeenCalled();

        instance.run();

        instance.destroy();
        window.App = null;
      });
    });

    describe('configurations', function() {
      it('should have default configs', function() {
        var instance = new application(configuration);

        expect(instance.connections)
          .toBeDefined();
        expect(instance.connections.crm)
          .toBeDefined();
        expect(instance.connections.crm.isDefault)
          .toBe(true);
        expect(instance.connections.crm.offline)
          .toBe(true);
        expect(instance.connections.crm.url)
          .toBe('http://localhost:8000/sdata/slx/dynamic/-/');
        expect(instance.connections.crm.json)
          .toBe(true);
        expect(instance.hasMultiCurrency())
          .toBe(false);
      });
    });

    describe('multicurrency', function() {
      it('should check if multicurrency is on or off', function() {
        var instance = new application(configuration);
        expect(instance.hasMultiCurrency())
          .toBe(false);
      });

      it('should check if user can lock opportunity rate', function() {
        var instance = new application(configuration);
        expect(instance.canLockOpportunityRate())
          .toBe(false);

        // Fake what we store in the context when we hit the system options endpoint
        instance.context = {
          systemOptions: {
            LockOpportunityRate: 'True'
          }
        };

        expect(instance.canLockOpportunityRate())
          .toBe(true);
      });

      it('should check if user can change opportunity rate', function() {
        var instance = new application(configuration);
        expect(instance.canChangeOpportunityRate())
          .toBe(false);

        instance.context = {
          systemOptions: {
            ChangeOpportunityRate: 'True'
          }
        };

        expect(instance.canChangeOpportunityRate())
          .toBe(true);
      });

      it('should get my exchange rate', function() {
        var instance = new application(configuration);

        // Test with multicurrency off
        expect(instance.getMyExchangeRate())
          .toEqual({
            code: '',
            rate: 1
          });

        // with multicurrency on
        spyOn(instance, 'hasMultiCurrency')
          .and.returnValue(true);
        expect(instance.getMyExchangeRate())
          .toEqual({
            code: '',
            rate: 1
          });

        instance.context = {
          exchangeRates: {
            'USD': 2,
            'AUD': 4
          },
          userOptions: {
            'General:Currency': 'USD'
          }
        };

        expect(instance.getMyExchangeRate())
          .toEqual({
            code: 'USD',
            rate: 2
          });
      });

      it('should get base exchange rate', function() {
        var instance = new application(configuration);

        // Test with multicurrency off
        expect(instance.getBaseExchangeRate())
          .toEqual({
            code: '',
            rate: 1
          });

        // Test with it on
        spyOn(instance, 'hasMultiCurrency')
          .and.returnValue(true);
        expect(instance.getBaseExchangeRate())
          .toEqual({
            code: '',
            rate: 1
          });

        instance.context = {
          exchangeRates: {
            'USD': 3,
            'EUR': 4
          },
          systemOptions: {
            'BaseCurrency': 'EUR'
          }
        };

        expect(instance.getBaseExchangeRate())
          .toEqual({
            code: 'EUR',
            rate: 4
          });
      });

      it('should get current opportunity exchange rate', function() {
        var instance = new application(configuration);

        expect(instance.getCurrentOpportunityExchangeRate())
          .toEqual({
            code: '',
            rate: 1
          });

        spyOn(instance, 'queryNavigationContext')
          .and.returnValue({
            options: {
              ExchangeRateCode: 'EUR',
              ExchangeRate: 5
            }
          });

        expect(instance.getCurrentOpportunityExchangeRate())
          .toEqual({
            code: 'EUR',
            rate: 5
          });
      });
    });

    describe('authenticateUser', function() {
      var Req = Sage.SData.Client.SDataServiceOperationRequest;
      var handlers;
      var fake;
      var failure;

      beforeEach(function() {
        Sage.SData.Client.SDataServiceOperationRequest = function() {
          this.setContractName = function() { return this; };
          this.setOperationName = function() { return this; };
          this.execute = function(entry, h) { handlers = h; };
        };
        var service = { setUserName: function() { return service; }, setPassword: function() { return service; } };
        fake = {
          getService: function() { return service; },
          onAuthenticateUserFailure: application.prototype.onAuthenticateUserFailure,
          onAuthenticateUserSuccess: function() {}
        };
        failure = jasmine.createSpy('failure');
        application.prototype.authenticateUser.call(fake, { username: 'admin' }, { failure: failure, scope: {} });
      });

      afterEach(function() {
        Sage.SData.Client.SDataServiceOperationRequest = Req;
      });

      it('reports a timeout once, flagged, even though the XHR also reported status 0 first', function(done) {
        var xhr = { status: 0 };
        handlers.aborted(xhr); // Chromium: readyState 4 / status 0, routed to aborted by sdata-client
        handlers.timeout(xhr); // then the timeout event, same task
        setTimeout(function() {
          expect(failure.calls.count()).toEqual(1);
          expect(failure.calls.argsFor(0)[0]).toEqual({ response: xhr, timeout: true });
          done();
        }, 10);
      });

      it('reports an aborted request (e.g. CORS block) as a failure without the timeout flag', function(done) {
        var xhr = { status: 0 };
        handlers.aborted(xhr);
        setTimeout(function() {
          expect(failure.calls.count()).toEqual(1);
          expect(failure.calls.argsFor(0)[0]).toEqual({ response: xhr, timeout: false });
          done();
        }, 10);
      });

      it('reports a plain failure at once', function() {
        var xhr = { status: 403 };
        handlers.failure(xhr);
        expect(failure).toHaveBeenCalledWith({ response: xhr, timeout: false });
      });
    });
  });
});
