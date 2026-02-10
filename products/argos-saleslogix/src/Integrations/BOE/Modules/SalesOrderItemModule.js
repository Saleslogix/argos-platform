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

define('crm/Integrations/BOE/Modules/SalesOrderItemModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  '../Views/Locations/PricingAvailabilityList',
  '../Views/SalesOrders/List',
  '../Views/SalesOrderItems/Detail',
  '../Views/SalesOrderItems/Edit',
  '../Views/UnitsOfMeasure/List',
  '../Views/Locations/List',
  '../Models/SalesOrderItem/Offline',
  '../Models/SalesOrderItem/SData',
], (declare, lang, _Module, LocationPricingAvailabilityList, SalesOrderList, SalesOrderItemDetail, SalesOrderItemEdit, UnitOfMeasureList, SlxLocationList) => {
  const __class = declare('crm.Integrations.BOE.Modules.SalesOrderItemModule', [_Module], {
    init: function init() {
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;
      am.registerView(new SalesOrderItemDetail());
      am.registerView(new SalesOrderList({
        expose: false,
        id: 'orderitem_salesorder_list',
      }));
      am.registerView(new SalesOrderItemEdit());
      am.registerView(new UnitOfMeasureList({
        id: 'orderitem_unitofmeasure_list',
        hasSettings: false,
      }));

      am.registerView(new LocationPricingAvailabilityList({
        id: 'orderline_pricingAvailabilityLocations',
        entityType: 'SalesOrderItem',
        requestType: 'SalesOrderItemAvailable',
        parentEntity: 'SalesOrder',
        singleSelectAction: 'complete',
      }));

      am.registerView(new SlxLocationList());
    },
    loadCustomizations: function loadCustomizations() {
    },
    loadToolbars: function loadToolbars() {
    },
  });

  lang.setObject('icboe.Modules.SalesOrderItemModule', __class);

  return __class;
});
