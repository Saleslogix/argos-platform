/* eslint-disable */
define('spec/Integrations/BOE/LocalPricing.spec', [
  'crm/Integrations/BOE/Utility',
  'crm/Integrations/BOE/PricingAvailabilityService',
  'crm/Integrations/BOE/Views/QuoteLines/Edit'
], function(
  Utility,
  PricingAvailabilityService,
  QuoteLineEdit
) {
  describe('BOE local CRM pricing (INFORCRM-35229)', function() {
    var _app = window.App;

    function useSettings(settings) {
      window.App = {
        warehouseDiscovery: 'auto',
        context: { integrationSettings: { 'Back Office Extension': settings } }
      };
    }

    afterEach(function() {
      window.App = _app;
    });

    describe('isLocalPricingEnabled', function() {
      it('reads the per entity setting in any casing, like the server', function() {
        useSettings({ 'Local CRM Pricing Quote': 'True', 'Local CRM Pricing SalesOrder': 'true' });

        expect(Utility.isLocalPricingEnabled('Quote')).toEqual(true);
        expect(Utility.isLocalPricingEnabled('SalesOrder')).toEqual(true);
        expect(Utility.isLocalPricingEnabled('Opportunity')).toEqual(false);
      });

      it('is off when the settings have not loaded', function() {
        window.App = { context: {} };
        expect(Utility.isLocalPricingEnabled('Quote')).toEqual(false);
      });
    });

    describe('calculateLinePricing', function() {
      it('applies a percentage discount to the unit price (web client: 1000 at 10% = 900)', function() {
        var p = Utility.calculateLinePricing({ docPrice: 1000, discount: 0.1, quantity: 2, exchangeRate: 1 });

        expect(p.DocCalculatedPrice).toEqual(900);
        expect(p.DocUnitErpAdjustment).toEqual(100);
        expect(p.DocExtendedPrice).toEqual(1800);
        expect(p.DocTotalAmount).toEqual(1800);
        // The server sums the pretax amounts into the quote/order totals.
        expect(p.DocPretaxTotalAmount).toEqual(1800);
        expect(p.PretaxTotalAmount).toEqual(1800);
        expect(p.DocTotalDiscount).toEqual(200);
      });

      it('derives the base currency values from the document exchange rate', function() {
        var p = Utility.calculateLinePricing({ docPrice: 130, discount: 0, quantity: 1, exchangeRate: 1.3 });

        expect(p.DocPrice).toEqual(130);
        expect(p.Price).toEqual(100);
        expect(p.CalculatedPrice).toEqual(100);
        expect(p.ExtendedPrice).toEqual(100);
      });

      it('derives the discount from an adjusted price', function() {
        var p = Utility.calculateLinePricing({ docPrice: 1000, docCalculatedPrice: 850, quantity: 1, exchangeRate: 1 });

        expect(p.Discount).toEqual(0.15);
        expect(p.DocCalculatedPrice).toEqual(850);
      });

      it('uses the adjusted price as the unit price when the product has none', function() {
        var p = Utility.calculateLinePricing({ docPrice: 0, docCalculatedPrice: 500, quantity: 3, exchangeRate: 1 });

        expect(p.DocPrice).toEqual(500);
        expect(p.Discount).toEqual(0);
        expect(p.DocExtendedPrice).toEqual(1500);
      });
    });

    describe('quote line edit', function() {
      function makeField(initial) {
        var value = initial;
        var disabled = false;
        var hidden = false;
        return {
          applyTo: false,
          getValue: function() { return value; },
          setValue: function(v) { value = v; },
          setValueNoTrigger: function(v) { value = v; },
          enable: function() { disabled = false; },
          disable: function() { disabled = true; },
          isDisabled: function() { return disabled; },
          hide: function() { hidden = true; },
          isHidden: function() { return hidden; },
          isDirty: function() { return true; }
        };
      }

      function makeView() {
        var view = Object.create(QuoteLineEdit.prototype);
        view.fields = {};
        ['Product', 'ProductName', 'Quote', 'SlxLocation', 'UnitOfMeasure'].forEach(function(name) {
          view.fields[name] = makeField(null);
        });
        ['Quantity', 'DocPrice', 'Discount', 'Price', 'CalculatedPrice', 'DocCalculatedPrice',
         'ExtendedPrice', 'DocExtendedPrice', 'DocTotalAmount'].forEach(function(name) {
          view.fields[name] = makeField(name === 'Quantity' ? 2 : 0);
        });
        Object.keys(view.fields).forEach(function(name) {
          view.fields[name].property = name;
        });
        view.connect = function() {};
        view.options = { context: { Quote: { $key: 'Q1', ExchangeRate: 1 } } };
        return view;
      }

      // An integrated product: the CRM has no price for it.
      var product = { $key: 'P1', Name: 'EGB1303AE', Price: 0 };

      beforeEach(function() {
        spyOn(PricingAvailabilityService, 'getQuoteItemPricing').and.returnValue(new Promise(function() {}));
      });

      it('does not call the pricing service and lets the user price the line', function() {
        useSettings({ 'Local CRM Pricing Quote': 'True' });
        var view = makeView();
        view.initLocalPricing();

        view.onProductChange({ text: product.Name }, { currentSelection: product });
        expect(PricingAvailabilityService.getQuoteItemPricing).not.toHaveBeenCalled();
        expect(view.fields.DocPrice.isDisabled()).toEqual(false);
        expect(view.fields.Discount.isDisabled()).toEqual(false);

        view.fields.DocPrice.setValue(1000);
        view.onLocalPriceChange();
        view.fields.Discount.setValue(10);
        view.onLocalDiscountChange();

        expect(view.fields.DocCalculatedPrice.getValue()).toEqual(900);
        expect(view.fields.DocExtendedPrice.getValue()).toEqual(1800);

        var values = view.getValues();
        expect(values.DocPrice).toEqual(1000);
        expect(values.Discount).toEqual(0.1);
        expect(values.DocCalculatedPrice).toEqual(900);
        expect(values.DocPretaxTotalAmount).toEqual(1800);
        expect(values.OverridePricing).toEqual(true);
      });

      it('still uses the pricing service and hides the local fields when local pricing is off', function() {
        useSettings({ 'Local CRM Pricing Quote': 'False' });
        var view = makeView();
        view.initLocalPricing();

        view.onProductChange({ text: product.Name }, { currentSelection: product });

        expect(PricingAvailabilityService.getQuoteItemPricing).toHaveBeenCalled();
        expect(view.fields.DocPrice.isHidden()).toEqual(true);
        expect(view.fields.Discount.isHidden()).toEqual(true);
      });
    });
  });
});
