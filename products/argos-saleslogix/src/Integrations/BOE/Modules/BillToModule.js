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

define('crm/Integrations/BOE/Modules/BillToModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  '../../../Views/Account/List',
  '../Views/ERPBillTos/Detail',
  '../Views/ERPBillTos/Edit',
  '../Views/ERPBillTos/List',
  '../Views/ERPInvoices/List',
  '../Views/Quotes/List',
  '../Views/ERPReceivables/List',
  '../Views/Returns/List',
  '../Views/SalesOrders/List',
  '../Views/ERPShipTos/List',
  '../Views/SyncResults/List',
  '../Models/ErpBillTo/Offline',
  '../Models/ErpBillTo/SData'
], function(declare, lang, _Module, AccountList, BillToDetail, BillToEdit, BillToList, InvoiceList, QuoteList, ReceivableList, ReturnList, SalesOrderList, ShipToList, SyncResultsList) {
  const __class = declare('crm.Integrations.BOE.Modules.BillToModule', [_Module], {
    init: function init() {
      App.picklistService.registerPicklistToView('SyncStatus', 'erpbillto_detail');
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;
      am.registerView(new BillToList());
      am.registerView(new BillToDetail());
      am.registerView(new BillToEdit());

      am.registerView(new AccountList({
        id: 'billto_accounts_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new ShipToList({
        id: 'billto_shiptos_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new QuoteList({
        id: 'billto_quotes_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new SalesOrderList({
        id: 'billto_orders_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new ReceivableList({
        id: 'billto_receivables_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new InvoiceList({
        id: 'billto_invoices_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new ReturnList({
        id: 'billto_returns_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      am.registerView(new SyncResultsList({
        id: 'billto_synchistory_related',
      }));
    },
    loadCustomizations: function loadCustomizations() {
      const am = this.applicationModule;
      am.registerCustomization('detail/tools', 'erpbillto_detail', {
        at: function at(tool) {
          return tool.id === 'edit';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'billto_accounts_related', {
        at: (tool) => {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'billto_receivables_related', {
        at: (tool) => {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'billto_invoices_related', {
        at: (tool) => {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'billto_returns_related', {
        at: (tool) => {
          return tool.id === 'new';
        },
        type: 'remove',
      });
    },
    loadToolbars: function loadToolbars() {
    },
  });

  lang.setObject('icboe.Modules.BillToModule', __class);

  return __class;
});
