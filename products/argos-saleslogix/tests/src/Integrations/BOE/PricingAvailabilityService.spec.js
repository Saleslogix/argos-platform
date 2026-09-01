/* eslint-disable */
define('spec/Integrations/BOE/PricingAvailabilityService.spec', [
  'crm/Integrations/BOE/PricingAvailabilityService'
], function(
  PricingAvailabilityService
) {
  describe('crm.Integrations.BOE.PricingAvailabilityService', function() {
    var service = PricingAvailabilityService;

    function pricingResult(properties) {
      return { Children: [{ Properties: properties }] };
    }

    describe('transformPricing', function() {
      it('resolves with the transformed properties when the service returns a line', function(done) {
        service.transformPricing(pricingResult({
          DocCalculatedPrice: '250.5',
          UnitOfMeasure: 'EA'
        })).then(function(data) {
          expect(data.DocCalculatedPrice.value).toEqual(250.5);
          expect(data.DocCalculatedPrice.type).toEqual('numeric');
          expect(data.UnitOfMeasure.value).toEqual('EA');
          done();
        }, function() {
          done.fail('expected the transform to resolve');
        });
      });

      it('splits code#id values into a Code and an Id entry', function(done) {
        service.transformPricing(pricingResult({
          SlxLocation: 'MAIN#LOCATIONKEY1'
        })).then(function(data) {
          expect(data.SlxLocationCode.value).toEqual('MAIN');
          expect(data.SlxLocationId.value).toEqual('LOCATIONKEY1');
          done();
        }, function() {
          done.fail('expected the transform to resolve');
        });
      });

      // The line item views disable Product/Quantity/Warehouse/UnitOfMeasure for the duration of a
      // pricing request and only re-enable them from the then/catch. A transform that never settled
      // stranded the whole form with the prices left at 0.00.
      it('rejects rather than hanging when the service returns no line', function(done) {
        service.transformPricing({ Children: [] }).then(function() {
          done.fail('expected the transform to reject');
        }, function(error) {
          expect(typeof error.Results).toEqual('string');
          expect(error.Results.length).toBeGreaterThan(0);
          done();
        });
      });

      it('rejects rather than hanging when the response body was empty', function(done) {
        // executeRequest falls back to '' when data.response.Result is missing.
        service.transformPricing('').then(function() {
          done.fail('expected the transform to reject');
        }, function(error) {
          expect(typeof error.Results).toEqual('string');
          done();
        });
      });

      // requestProductPricing detects service-reported problems by reading results.messageText,
      // so a messageText line has to survive the transform rather than be treated as pricing.
      it('passes a service messageText through to the caller', function(done) {
        service.transformPricing(pricingResult({
          messageText: 'Item is not priced'
        })).then(function(data) {
          expect(data.messageText.value).toEqual('Item is not priced');
          done();
        }, function() {
          done.fail('expected the transform to resolve');
        });
      });
    });

    describe('executeRequest', function() {
      var showBusy;
      var hideBusy;
      var getRequest;
      var _app = window.App;

      beforeEach(function() {
        showBusy = spyOn(service, 'showBusy').and.callFake(function() {});
        hideBusy = spyOn(service, 'hideBusy').and.callFake(function() {});
        spyOn(service, 'createAlertDialog').and.callFake(function() {});
        getRequest = spyOn(service, 'getRequest').and.returnValue({
          execute: function(entry, callbacks) {
            callbacks.success({ response: { Result: '{"Children":[]}' } });
          }
        });
      });

      afterEach(function() {
        window.App = _app;
      });

      it('forwards a transform rejection to the caller', function(done) {
        service.executeRequest({
          resourceKind: 'quotes',
          operationName: 'requestPricingAvailability',
          requestOptions: {},
          transform: service.transformPricing
        }).then(function() {
          done.fail('expected executeRequest to reject');
        }, function(error) {
          expect(typeof error.Results).toEqual('string');
          done();
        });
      });
    });
  });
});
