/* Copyright 2017 Infor
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
 * @module crm/Integrations/BOE/Utility
 */
define('crm/Integrations/BOE/Utility', [
  'dojo/_base/lang',
  'argos/Models/Adapter',
  './Models/Names',
  '../../Format',
], (lang, Adapter, MODEL_NAMES, format) => {
  /**
   * @class
   * @alias module:crm/Integrations/BOE/Utility
   * @classdesc Utility provides functions that are more javascript enhancers than application related code.
   * @static
   *
   */
  const __class = lang.setObject('crm.Integrations.BOE.Utility', /** @lends module:crm/Integrations/BOE/Utility */{
    // Lookup table for the aggregate functions used by DashboardWidget
    aggregateLookup: {
      calcProfit: function calcProfit(fn, widget, data) {
        const revenue = data[0];
        const cost = data[1];

        return fn.call(widget, revenue, cost);
      },
      calcMargin: function calcMargin(fn, widget, data) {
        const revenue = data[0];
        const cost = data[1];

        return fn.call(widget, revenue, cost);
      },
      calcYoYRevenue: function calcYoYRevenue(fn, widget, data) {
        const pastYear = data[0];
        const between = data[1];

        return fn.call(widget, pastYear, between);
      },
      calcYoYProfit: function calcYoYProfit(fn, widget, data) {
        return fn.call(widget, data[0], data[2], data[1], data[3]);
      },
      calcYoYMargin: function calcYoYMargin(fn, widget, data) {
        return fn.call(widget, data[0], data[2], data[1], data[3]);
      },
      sum: function sum(fn, widget, data) {
        return fn.call(widget, data);
      },
    },
    /**
     * @params
     * mappedLookups: Array of lookup names that must match the model names
     * mappedProperties: Array of the properties on the entry with the searched id
     * fields: Array of field names from the edit view
     * scope: 'this' of the edit view
     * @return
     * Returns a promise that is resolved once all entries are returned
     */
    setFieldsFromIds: function setFieldsFromIds(mappedLookups = [], mappedProperties = [], fields = [], scope, entry = {}) {
      const promises = [];
      fields.forEach((f, index) => {
        const temp = scope.options.entry ? scope.options.entry[f] : null;
        const value = entry[f] || scope.entry[f] || temp;
        if (!value) {
          return;
        }
        const model = Adapter.getModel(MODEL_NAMES[mappedLookups[index].toUpperCase()]);
        if (!model) {
          console.warn('Unable to locate model for ' + f); // eslint-disable-line
          return;
        }
        model.init();
        const options = {
          async: false,
          queryModelName: 'detail',
          query: `${mappedProperties[index]} eq "${value}"`,
        };
        const promise = model.getEntries(null, options);
        promises.push(promise);
        promise.then((entries) => {
          const returned = entries[0];
          if (returned) {
            scope.fields[mappedLookups[index]].setSelection(returned);
            scope.fields[mappedLookups[index]].onChange(scope.fields[mappedLookups[index]].currentSelection, scope.fields[mappedLookups[index]]);
          }
        });
      });
      return Promise.all(promises);
    },
    formatMultiCurrency: function formatMultiCurrency(val, currencyCode) {
      let result = null;
      const tempVal = val || 0;
      if (App.hasMultiCurrency() && currencyCode) {
        result = format.multiCurrency.call(null, tempVal, currencyCode);
      } else {
        result = format.currency.call(null, tempVal);
      }
      return result || '';
    },
    getBaseCurrencyCode: function getBaseCurrencyCode() {
      if (App.context && App.context.systemOptions && App.context.systemOptions.BaseCurrency) {
        const results = App.context.systemOptions.BaseCurrency;
        return results;
      }

      return '';
    },
    /**
     * Whether the "Local CRM Pricing {entityName}" back office setting is on, meaning CRM owns the
     * pricing for that entity and the back office pricing service must not be called.
     * Matches the server (AppIdMappingService.IsLocalCRMPricingEnabled), which accepts any casing of "true".
     * @param {String} entityName Quote, SalesOrder or Opportunity
     * @return {Boolean}
     */
    isLocalPricingEnabled: function isLocalPricingEnabled(entityName) {
      const settings = App.context && App.context.integrationSettings && App.context.integrationSettings['Back Office Extension'];
      const value = settings && settings[`Local CRM Pricing ${entityName}`];
      return String(value).toLowerCase() === 'true';
    },
    /**
     * Calculates every pricing field of a quote or sales order line from a unit price and either a
     * discount or an adjusted price, all in document (quote/order) currency. Base currency values
     * are derived with the document exchange rate.
     *
     * The server stores these fields as sent when local CRM pricing is on, and sums the pretax amounts
     * into the header totals, so the client has to send all of them. Formulas follow the web client's
     * QuoteItem/SalesOrderItem rules (CalculateDiscount, SetDocCalculatedPriceOnChange, SetExtendedPrice).
     * @param {Object} options
     * @param {Number} options.docPrice Unit price
     * @param {Number} [options.discount] Discount as a fraction (0.1 = 10%). When omitted it is derived from docCalculatedPrice.
     * @param {Number} [options.docCalculatedPrice] Adjusted unit price, used when discount is omitted
     * @param {Number} options.quantity
     * @param {Number} options.exchangeRate Document exchange rate (doc = base * rate)
     * @return {Object} Line field values keyed by SData property name
     */
    calculateLinePricing: function calculateLinePricing({ docPrice, discount, docCalculatedPrice, quantity, exchangeRate }) {
      // The server rounds currency to 4 places and truncates percentages to 6.
      const round = value => Number(value.toFixed(4));
      const truncate = value => Math.trunc(Number((value * 1e6).toFixed(6))) / 1e6;
      const rate = Number(exchangeRate) || 1;
      const qty = Number(quantity) || 0;
      let unitPrice = round(Number(docPrice) || 0);
      let pct;
      let adjusted;

      if (typeof discount === 'number') {
        pct = truncate(discount);
        adjusted = round(unitPrice - round(unitPrice * pct));
      } else {
        adjusted = round(Number(docCalculatedPrice) || 0);
        if (unitPrice <= 0) {
          unitPrice = adjusted;
        }
        pct = unitPrice ? truncate((unitPrice - adjusted) / unitPrice) : 0;
      }

      const basePrice = round(unitPrice / rate);
      const baseAdjusted = round(adjusted / rate);
      const docAdjustment = round(unitPrice - adjusted);
      const adjustment = round(basePrice - baseAdjusted);
      const docTotal = round(adjusted * qty);
      const total = round(baseAdjusted * qty);

      return {
        DocPrice: unitPrice,
        Price: basePrice,
        Discount: pct,
        UnitErpAdjustmentPercent: pct,
        DocCalculatedPrice: adjusted,
        CalculatedPrice: baseAdjusted,
        DocErpNetUnitPrice: adjusted,
        ErpNetUnitPrice: baseAdjusted,
        DocUnitErpAdjustment: docAdjustment,
        UnitErpAdjustment: adjustment,
        DocPretaxTotalAmount: docTotal,
        DocTotalAmount: docTotal,
        DocExtendedPrice: docTotal,
        PretaxTotalAmount: total,
        TotalAmount: total,
        ExtendedPrice: total,
        DocTotalDiscount: round(docAdjustment * qty),
        TotalDiscount: round(adjustment * qty),
      };
    },
  });

  lang.setObject('icboe.Utility', __class);

  return __class;
});
