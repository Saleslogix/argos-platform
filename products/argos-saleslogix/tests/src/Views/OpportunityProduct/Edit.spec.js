/* eslint-disable */
define('spec/Views/OpportunityProduct/Edit.spec', [
  'crm/Views/OpportunityProduct/Edit'
], function(
  Edit
) {
  describe('crm.Views.OpportunityProduct.Edit', function() {
    var _app = window.App;
    var PRICE_FIELDS = ['Discount', 'Quantity', 'CalculatedPrice'];

    function makeField(initial) {
      var value = initial === undefined ? '' : initial;
      var disabled = true; // an insert starts with the pricing fields off
      return {
        getValue: function() { return value; },
        setValue: function(v) { value = v; },
        setValueNoTrigger: function(v) { value = v; },
        clearValue: function() { value = ''; },
        setCurrencyCode: function() {},
        enable: function() { disabled = false; },
        disable: function() { disabled = true; },
        isDisabled: function() { return disabled; }
      };
    }

    // The view needs a real DOM and a live SData feed to stand up, so drive the prototype against
    // stub fields instead. That is enough to cover the enablement rule, which is view logic only.
    function makeView() {
      var fields = {};
      ['Opportunity', 'ProductId', 'Product', 'Product.Family', 'Program',
       'Price', 'Discount', 'Quantity', 'CalculatedPrice', 'ExtendedPrice'].forEach(function(name) {
        fields[name] = makeField(name === 'Quantity' ? 0 : '');
      });

      var view = Object.create(Edit.prototype);
      view.fields = fields;
      return view;
    }

    function disabledPriceFields(view) {
      return PRICE_FIELDS.filter(function(name) {
        return view.fields[name].isDisabled();
      });
    }

    beforeEach(function() {
      window.App = {
        hasMultiCurrency: function() { return false; }
      };
    });

    afterEach(function() {
      window.App = _app;
    });

    it('leaves the pricing fields disabled while no product is selected', function() {
      var view = makeView();

      expect(view._hasProduct()).toEqual(false);

      view._enableUI(view._hasProduct());

      expect(disabledPriceFields(view)).toEqual(PRICE_FIELDS);
    });

    it('enables the pricing fields once a product is selected, without needing a price level', function() {
      var view = makeView();
      // A product with no family, which the old Product.Family gate treated as "not priceable".
      var selection = {
        $key: 'P1',
        Name: 'Lst Pressure Gauge 2000 Psi',
        Family: null,
        Price: 250
      };

      var productField = view.fields.Product;
      productField.currentSelection = selection;
      productField.getValue = function() {
        return { $key: selection.$key, Name: selection.Name };
      };

      view.onProductChange({ key: selection.$key }, productField);

      expect(disabledPriceFields(view)).toEqual([]);
      expect(view.fields.Price.getValue()).toEqual(250);
      expect(view.fields.CalculatedPrice.getValue()).toEqual(250);
    });

    it('does not throw when the entry has no product', function() {
      var view = makeView();

      expect(function() {
        view._enableUI(view._hasProduct());
      }).not.toThrow();
    });
  });
});
