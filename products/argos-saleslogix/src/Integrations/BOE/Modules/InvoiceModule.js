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

define('crm/Integrations/BOE/Modules/InvoiceModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  '../Views/ERPInvoices/Detail',
  '../Views/ERPInvoices/List',
  '../Views/ERPInvoiceItems/Detail',
  '../Views/ERPInvoiceItems/List',
  '../Views/ERPReceivables/List',
  '../Models/ErpInvoice/Offline',
  '../Models/ErpInvoice/SData',
  '../Models/ErpInvoiceItem/Offline',
  '../Models/ErpInvoiceItem/SData',
  '../Models/ErpInvoicePerson/Offline',
  '../Models/ErpInvoicePerson/SData'
], function(declare, lang, _Module, ERPInvoiceDetail, ERPInvoiceList, ERPInvoiceItemDetail, ERPInvoiceItemList, ERPReceivablesList) {
  const __class = declare('crm.Integrations.BOE.Modules.InvoiceModule', [_Module], {
    defaultViews: ['invoice_list'],
    init: function init() {
      App.picklistService.registerPicklistToView('ErpInvoiceStatus');
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;
      am.registerView(new ERPInvoiceList());
      am.registerView(new ERPInvoiceDetail());
      am.registerView(new ERPInvoiceItemDetail());
      am.registerView(new ERPInvoiceItemList({
        id: 'invoice_items_related',
        hasSettings: false,
        expose: false,
      }));
      am.registerView(new ERPReceivablesList({
        id: 'invoice_receivables_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
      }));
    },
    loadCustomizations: function loadCustomizations() {
      const am = this.applicationModule;
      am.registerCustomization('detail/tools', 'invoice_detail', {
        at: function at(tool) {
          return tool.id === 'edit';
        },
        type: 'remove',
      });

      am.registerCustomization('detail/tools', 'invoice_item_detail', {
        at: function at(tool) {
          return tool.id === 'edit';
        },
        type: 'remove',
      });

      am.registerCustomization('list/tools', 'invoice_list', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });

      am.registerCustomization('list/tools', 'invoice_items_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });
    },
    loadToolbars: function loadToolbars() {
    },
  });

  lang.setObject('icboe.Modules.InvoiceModule', __class);

  return __class;
});
