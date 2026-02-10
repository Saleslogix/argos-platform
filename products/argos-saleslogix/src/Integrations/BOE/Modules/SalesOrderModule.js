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

define('crm/Integrations/BOE/Modules/SalesOrderModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  'crm/Views/Attachment/List',
  '../Views/BackOffices/List',
  '../Views/BackOfficeAccountingEntities/List',
  '../Views/ERPBillTos/List',
  '../Views/Carriers/List',
  '../Views/ERPInvoiceItems/List',
  '../Views/Locations/List',
  '../Views/Products/List',
  '../Views/SalesOrders/List',
  '../Views/SalesOrders/Detail',
  '../Views/SalesOrders/Edit',
  '../Views/SalesOrderItems/List',
  '../Views/ERPSalesOrderPersons/List',
  '../Views/ERPShipTos/List',
  '../Views/ERPShipmentItems/List',
  '../Views/SyncResults/List',
  '../Models/SalesOrder/Offline',
  '../Models/SalesOrder/SData',
  '../Models/ErpSalesOrderPerson/Offline',
  '../Models/ErpSalesOrderPerson/SData',
], (declare, lang, _Module, AttachmentList, BackOfficeList, BackOfficeAccountingEntityList, BillToList, CarrierList, InvoiceItemsList, LocationList, ProductList, SalesOrderList, SalesOrderDetail, SalesOrderEdit, SalesOrderItemList, SalesPersonList, ShipToList, ShipmentItemsList, SyncResultsList) => {
  const __class = declare('crm.Integrations.BOE.Modules.SalesOrderModule', [_Module], {
    defaultViews: ['salesorder_list'],
    init: function init() {
      App.picklistService.registerPicklistToView('SyncStatus', 'salesorder_detail');
      App.picklistService.registerPicklistToView('ErpSalesOrderStatus', 'salesorder_detail');
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;
      am.registerView(new SalesOrderList({
        expose: true,
      }));

      am.registerView(new SalesOrderDetail());
      am.registerView(new SalesOrderEdit());
      am.registerView(new SalesOrderItemList({
        id: 'salesorder_items_related',
        hasSettings: false,
        expose: false,
        addLineItems: function addLineItems() {
          if (!this.options.selectedEntry.ErpLogicalId) {
            App.modal.createSimpleDialog({
              title: 'alert',
              content: this.accountingEntityRequiredText,
              getContent: () => { return; },
            }).then(() => {
              const orderEdit = App.getView('salesorder_edit');
              if (orderEdit) {
                const options = {
                  entry: this.options.selectedEntry,
                  fromContext: this.options.fromContext,
                };
                orderEdit.show(options);
              }
            });
            return;
          }
          const view = App.getView('salesorder_item_edit');
          if (view) {
            const options = {
              insert: true,
              context: {
                SalesOrder: this.options.selectedEntry,
              },
            };
            this.refreshRequired = true;
            view.show(options);
          }
        },
        createToolLayout: function createToolLayout() {
          return this.tools || (this.tools = {
            tbar: [{
              id: 'new',
              svg: 'add',
              action: 'addLineItems',
              security: this.app.getViewSecurity(this.insertView, 'insert'),
            }],
          });
        },
      }));

      am.registerView(new CarrierList({
        id: 'salesorder_carriers',
      }));

      am.registerView(new AttachmentList({
        id: 'salesorder_attachments_related',
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      am.registerView(new InvoiceItemsList({
        id: 'salesorder_invoice_items_related',
        hasSettings: false,
        expose: false,
      }));

      am.registerView(new ShipmentItemsList({
        id: 'salesorder_shipment_items_related',
        hasSettings: false,
        expose: false,
      }));

      am.registerView(new ProductList({
        id: 'salesorder_product_related',
        expose: false,
      }));

      am.registerView(new BackOfficeList({
        id: 'salesorder_backoffice_related',
        hasSettings: false,
        groupsEnabled: false,
      }));

      am.registerView(new BackOfficeAccountingEntityList({
        id: 'salesorder_backofficeaccountingentity_related',
        hasSettings: false,
        groupsEnabled: false,
      }));

      am.registerView(new LocationList({
        id: 'order_location_list',
        hasSettings: false,
      }));

      am.registerView(new LocationList({
        id: 'order_warehouse_list',
        hasSettings: false,
      }));

      am.registerView(new SyncResultsList({
        id: 'order_syncresult_related',
        hasSettings: false,
      }));

      am.registerView(new BillToList({
        id: 'salesorder_billTo_related',
        hasSettings: false,
        expose: false,
        groupsEnabled: false,
      }));

      am.registerView(new ShipToList({
        id: 'salesorder_shipTo_related',
        hasSettings: false,
        expose: false,
        groupsEnabled: false,
      }));

      am.registerView(new SalesPersonList({
        id: 'salesorder_salesperson_related',
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
      am.registerCustomization('list/tools', 'salesorder_invoice_items_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });

      am.registerCustomization('list/tools', 'salesorder_shipment_items_related', {
        at: function at(tool) {
          return tool.id === 'new';
        },
        type: 'remove',
      });
    },
    loadToolbars: function loadToolbars() {
    },
  });
  lang.setObject('icboe.Modules.SalesOrderModule', __class);

  return __class;
});
