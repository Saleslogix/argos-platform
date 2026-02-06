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

define('crm/Integrations/BOE/Modules/QuoteLineModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  '../Views/Products/List',
  '../Views/Locations/PricingAvailabilityList',
  '../Views/QuoteLines/Edit',
  '../Views/Quotes/List',
  '../Views/UnitsOfMeasure/List',
  '../Models/QuoteItem/Offline',
  '../Models/QuoteItem/SData'
], function(declare, lang, _Module, ProductList, LocationPricingAvailabilityList, QuoteLineEdit, QuoteList, UnitOfMeasureList) {
  const __class = declare('crm.Integrations.BOE.Modules.QuoteLineModule', [_Module], {
    init: function init() {
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;

      am.registerView(new QuoteList({
        expose: false,
        id: 'quoteline_quote_list',
      }));

      am.registerView(new QuoteLineEdit());

      am.registerView(new ProductList({
        id: 'quoteline_product_related',
        expose: false,
      }));

      am.registerView(new LocationPricingAvailabilityList({
        id: 'quoteline_pricingAvailabilityLocations',
        entityType: 'QuoteItem',
        requestType: 'QuoteItemAvailable',
        parentEntity: 'Quote',
        singleSelectAction: 'complete',
      }));

      am.registerView(new UnitOfMeasureList({
        id: 'quoteline_unitofmeasure_list',
        hasSettings: false,
      }));
    },
    loadCustomizations: function loadCustomizations() {
    },
    loadToolbars: function loadToolbars() {
    },
  });

  lang.setObject('icboe.Modules.QuoteLineModule', __class);

  return __class;
});
