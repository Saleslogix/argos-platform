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

define('crm/Integrations/BOE/Modules/ShipToAccountModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  '../Views/ERPShipToAccounts/List',
  '../Views/ERPShipToAccounts/Detail',
  '../Views/ERPShipToAccounts/Edit',
  'crm/Views/Account/List',
  '../Views/Quotes/List',
  '../Views/SalesOrders/List',
  '../Views/ERPInvoices/List',
  '../Views/ERPShipments/List',
  '../Views/ERPReceivables/List',
  '../Views/Returns/List',
  '../Views/ERPContactAssociations/List',
  '../Views/ERPSalesOrderPersons/List',
  '../Views/ERPBillToAccounts/List',
  '../Views/ERPShipTos/List',
  '../Models/ErpShipToAccount/Offline',
  '../Models/ErpShipToAccount/SData'
], function(declare, lang, _Module, ShipToAccountList, ShipToAccountDetail, ShipToAccountEdit, AccountList, QuotesList, SalesOrdersList, InvoicesList, ShipmentsList, ReceivablesList, ReturnsList, ContactAssociationsList, SalesPersonList, BillToList, ShipToList) {
  const __class = declare('crm.Integrations.BOE.Modules.ShipToAccountModule', [_Module], {
    init: function init() {
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;

      am.registerView(new ShipToAccountDetail());
      am.registerView(new ShipToAccountEdit());
      am.registerView(new ShipToAccountList());

      am.registerView(new ShipToAccountList({
        id: 'erpshiptoaccount_related',
        groupsEnabled: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new AccountList({
        id: 'erpshiptoaccount_accounts',
        groupsEnabled: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new AccountList({
        id: 'erpshiptoaccount_accounts_related',
        groupsEnabled: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new QuotesList({
        id: 'erpshiptoaccount_quotes_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new SalesOrdersList({
        id: 'erpshiptoaccount_salesorders_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new InvoicesList({
        id: 'erpshiptoaccount_invoices_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new ShipmentsList({
        id: 'erpshiptoaccount_shipments_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new ReceivablesList({
        id: 'erpshiptoaccount_receivables_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new ReturnsList({
        id: 'erpshiptoaccount_returns_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new ContactAssociationsList({
        id: 'erpshiptoaccount_contactassociations_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new BillToList({
        id: 'erpshiptoaccount_billto_related',
        groupsEnabled: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new ShipToList({
        id: 'erpshiptoaccount_erpshiptos',
        groupsEnabled: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new SalesPersonList({
        id: 'erpshiptoaccount_salesperson_related',
        groupsEnabled: false,
        hasSettings: false,
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
    },
    loadCustomizations: function loadCustomizations() {
      const am = this.applicationModule;
      am.registerCustomization('detail/tools', 'erpshiptoaccount_detail', {
        at: function at(tool) {
          return tool.id === 'edit';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'erpshiptoaccount_invoices_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'erpshiptoaccount_shipments_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'erpshiptoaccount_receivables_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'erpshiptoaccount_returns_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'erpshiptoaccount_contactassociations_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });
      am.registerCustomization('list/tools', 'erpshiptoaccount_salesperson_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });
    },
    loadToolbars: function loadToolbars() {
    },
  });

  lang.setObject('icboe.Modules.ShipToAccountModule', __class);

  return __class;
});
