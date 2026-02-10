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

define('crm/Integrations/BOE/Modules/ShipmentModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  '../Views/ERPShipments/Detail',
  '../Views/ERPShipments/List',
  '../Views/ERPShipmentItems/List',
  '../Models/ErpShipment/Offline',
  '../Models/ErpShipment/SData',
], (declare, lang, _Module, ShipmentsDetail, ShipmentsList, ShipmentItemsList) => {
  const __class = declare('crm.Integrations.BOE.Modules.ShipmentModule', [_Module], {
    defaultViews: ['erpshipments_list'],
    init: function init() {
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;

      am.registerView(new ShipmentsDetail());
      am.registerView(new ShipmentsList());

      am.registerView(new ShipmentItemsList({
        id: 'shipment_lines_related',
        hasSettings: false,
        expose: false,
      }));
    },
    loadCustomizations: function loadCustomizations() {
      const am = this.applicationModule;
      am.registerCustomization('list/tools', 'erpshipments_list', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });

      am.registerCustomization('list/tools', 'shipment_lines_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });

      am.registerCustomization('detail/tools', 'erpshipments_detail', {
        at: function at(tool) {
          return tool.id === 'edit';
        },
        type: 'remove',
      });
    },
    loadToolbars: function loadToolbars() {
    },
  });
  lang.setObject('icboe.Modules.ShipmentModule', __class);

  return __class;
});
