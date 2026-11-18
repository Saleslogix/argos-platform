/* Copyright 2026 Infor
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module crm/Integrations/BOE/Views/_LocalPricingLineMixin
 */
define('crm/Integrations/BOE/Views/_LocalPricingLineMixin', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  '../Utility',
], (declare, lang, Utility) => {
  /**
   * @class
   * @alias module:crm/Integrations/BOE/Views/_LocalPricingLineMixin
   * @classdesc Local CRM pricing for the quote line and sales order item edit views.
   *
   * When the "Local CRM Pricing {entity}" setting is on, the back office pricing service is not
   * called. The user prices the line instead: unit price, discount and adjusted price are editable,
   * and every other pricing field is calculated on the client, as the web client does.
   *
   * The view sets `localPricingEntity` ('Quote' or 'SalesOrder'), which is also the name of its
   * parent document field and context property, and declares DocPrice and Discount fields.
   */
  const __class = declare('crm.Integrations.BOE.Views._LocalPricingLineMixin', null, {
    localPricingEntity: '',
    /**
     * Pricing calculated during this edit session, sent with the save. Null until the user (or a
     * product selection) changes the pricing, so an unrelated edit leaves stored prices alone.
     */
    _localPricing: null,

    isLocalPricing: function isLocalPricing() {
      return Utility.isLocalPricingEnabled(this.localPricingEntity);
    },
    initLocalPricing: function initLocalPricing() {
      if (!this.isLocalPricing()) {
        this.fields.DocPrice.hide();
        this.fields.Discount.hide();
        return;
      }

      this.fields.DocPrice.enable();
      this.fields.Discount.enable();
      this.fields.DocCalculatedPrice.enable();
      this.connect(this.fields.DocPrice, 'onChange', this.onLocalPriceChange);
      this.connect(this.fields.Discount, 'onChange', this.onLocalDiscountChange);
      this.connect(this.fields.DocCalculatedPrice, 'onChange', this.onLocalAdjustedPriceChange);
    },
    getLocalPricingExchangeRate: function getLocalPricingExchangeRate() {
      const name = this.localPricingEntity;
      const context = this.options && this.options.context;
      const parent = (context && context[name]) || (this.entry && this.entry[name]) || (this.fields[name] && this.fields[name].currentSelection);
      return (parent && Number(parent.ExchangeRate)) || 1;
    },
    /**
     * Prices a newly selected product from its CRM price. Integrated products usually have none,
     * leaving 0 for the user to fill in.
     */
    seedLocalPricing: function seedLocalPricing(product) {
      const basePrice = Number(product && product.Price) || 0;
      this._localPricing = null;
      this.updateLocalPricing({
        docPrice: basePrice * this.getLocalPricingExchangeRate(),
        discount: 0,
      }, false);
    },
    onLocalPriceChange: function onLocalPriceChange() {
      // A new unit price clears the discount, as in the web client.
      this.updateLocalPricing({ docPrice: this.fields.DocPrice.getValue(), discount: 0 }, true);
    },
    onLocalDiscountChange: function onLocalDiscountChange() {
      this.updateLocalPricing({ discount: this.fields.Discount.getValue() / 100 }, true);
    },
    onLocalAdjustedPriceChange: function onLocalAdjustedPriceChange() {
      this.updateLocalPricing({ docCalculatedPrice: this.fields.DocCalculatedPrice.getValue() }, true);
    },
    /**
     * Recalculates the line from the current pricing overlaid with `inputs`, then shows the result.
     * @param {Object} inputs Overrides for Utility.calculateLinePricing options
     * @param {Boolean} [overridePricing] New OverridePricing flag; omitted keeps the current one
     */
    updateLocalPricing: function updateLocalPricing(inputs, overridePricing) {
      const current = this._localPricing;
      const pricing = Utility.calculateLinePricing(lang.mixin({
        docPrice: current ? current.DocPrice : this.fields.DocPrice.getValue(),
        docCalculatedPrice: current ? current.DocCalculatedPrice : this.fields.DocCalculatedPrice.getValue(),
        quantity: this.fields.Quantity.getValue(),
        exchangeRate: this.getLocalPricingExchangeRate(),
      }, inputs));

      const override = typeof overridePricing === 'boolean' ? overridePricing : current && current.OverridePricing;
      if (typeof override === 'boolean') {
        pricing.OverridePricing = override;
      }

      this._localPricing = pricing;
      ['DocPrice', 'Price', 'CalculatedPrice', 'DocCalculatedPrice', 'ExtendedPrice', 'DocExtendedPrice', 'DocTotalAmount'].forEach((name) => {
        this.fields[name].setValueNoTrigger(pricing[name]);
      });
      this.fields.Discount.setValueNoTrigger(pricing.Discount * 100);
    },
    setValues: function setValues(values) {
      this.inherited(setValues, arguments);
      this._localPricing = null;

      if (values && 'Discount' in values && this.isLocalPricing()) {
        // Discount is stored as a fraction but edited as a percentage. Setting without a trigger
        // also stops a blur on an untouched field from firing a change that resets the pricing.
        this.fields.Discount.setValueNoTrigger((values.Discount || 0) * 100);
        ['DocPrice', 'DocCalculatedPrice', 'Quantity'].forEach((name) => {
          this.fields[name].setValueNoTrigger(this.fields[name].getValue());
        });
      }
    },
    getValues: function getValues() {
      const values = this.inherited(getValues, arguments);

      if (values && this.isLocalPricing()) {
        if (typeof values.Discount === 'number') {
          values.Discount = values.Discount / 100;
        }

        if (this._localPricing) {
          lang.mixin(values, this._localPricing);
        }
      }

      return values;
    },
  });

  lang.setObject('icboe.Views._LocalPricingLineMixin', __class);

  return __class;
});
