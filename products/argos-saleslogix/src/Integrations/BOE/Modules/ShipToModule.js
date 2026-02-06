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

define('crm/Integrations/BOE/Modules/ShipToModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  'crm/Views/Account/List',
  '../Views/ERPBillTos/List',
  '../Views/ERPInvoices/List',
  '../Views/Quotes/List',
  '../Views/ERPReceivables/List',
  '../Views/Returns/List',
  '../Views/SalesOrders/List',
  '../Views/ERPShipTos/Detail',
  '../Views/ERPShipTos/Edit',
  '../Views/ERPShipTos/List',
  '../Views/SyncResults/List',
  '../Models/ErpShipToAccount/Offline',
  '../Models/ErpShipToAccount/SData',
  '../Models/ErpShipTo/Offline',
  '../Models/ErpShipTo/SData'
], function(declare, lang, _Module, AccountList, BillToList, InvoiceList, QuoteList, ReceivableList, ReturnList, SalesOrderList, ShipToDetail, ShipToEdit, ShipToList, SyncResultsList) {
  const __class = declare('crm.Integrations.BOE.Modules.ShipToModule', [_Module], {
    init: function init() {
      App.picklistService.registerPicklistToView('SyncStatus', 'erpshipto_detail');
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;
      am.registerView(new ShipToList());
      am.registerView(new ShipToDetail());
      am.registerView(new ShipToEdit());

      am.registerView(new AccountList({
        id: 'shipto_accounts_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new BillToList({
        id: 'shipto_billtos_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new QuoteList({
        id: 'shipto_quotes_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new SalesOrderList({
        id: 'shipto_orders_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new ReceivableList({
        id: 'shipto_receivables_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new InvoiceList({
        id: 'shipto_invoices_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new ReturnList({
        id: 'shipto_returns_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new SyncResultsList({
        id: 'shipto_synchistory_related',
      }));
    },
    loadCustomizations: function loadCustomizations() {
      const am = this.applicationModule;
      am.registerCustomization('detail/tools', 'erpshipto_detail', {
        at: function at(tool) {
          return tool.id === 'edit';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'shipto_accounts_related', {
        at: (tool) => {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'shipto_receivables_related', {
        at: (tool) => {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'shipto_invoices_related', {
        at: (tool) => {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'shipto_returns_related', {
        at: (tool) => {
          return tool.id === 'new';
        },
        type: 'remove',
      });
    },
    loadToolbars: function loadToolbars() {
    },
  });

  lang.setObject('icboe.Modules.ShipToModule', __class);

  return __class;
});
