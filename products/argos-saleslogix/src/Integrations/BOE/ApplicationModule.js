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

define('crm/Integrations/BOE/ApplicationModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/I18n',
  'argos/Application',
  'argos/ApplicationModule',
  './Modules/AccountAssociationModule',
  './Modules/AccountModule',
  './Modules/BillToAccountModule',
  './Modules/BillToModule',
  './Modules/ContactModule',
  './Modules/ContactAssociationModule',
  './Modules/HelpModule',
  './Modules/InvoiceLineModule',
  './Modules/InvoiceModule',
  './Modules/OpportunityModule',
  './Modules/PayFromModule',
  './Modules/ProductModule',
  './Modules/QuoteModule',
  './Modules/QuotePersonModule',
  './Modules/QuoteLineModule',
  './Modules/ReceivableLineModule',
  './Modules/ReceivableModule',
  './Modules/ReturnLineModule',
  './Modules/ReturnModule',
  './Modules/SalesOrderItemModule',
  './Modules/SalesOrderModule',
  './Modules/ShipmentLineModule',
  './Modules/ShipmentModule',
  './Modules/ShipToAccountModule',
  './Modules/ShipToModule',
  '../../Views/RecentlyViewed/List',
  './Models/SyncResult/Offline',
  './Models/SyncResult/SData',
  './Models/BackOffice/Offline',
  './Models/BackOffice/SData',
  './Models/BackOfficeAccountingEntity/Offline',
  './Models/BackOfficeAccountingEntity/SData',
  './Models/Location/Offline',
  './Models/Location/SData',
  './Models/OperatingCompany/Offline',
  './Models/OperatingCompany/SData',
  './Models/UnitOfMeasure/Offline',
  './Models/UnitOfMeasure/SData',
  'argos/TabWidget'
], function(declare, lang, getResource, Application, ApplicationModule, AccountAssociationModule, AccountModule, BillToAccountModule, BillToModule, ContactModule, ContactAssociationModule, HelpModule, InvoiceLineModule, InvoiceModule, OpportunityModule, PayFromModule, ProductModule, QuoteModule, QuotePersonModule, QuoteLineModule, ReceivableLineModule, ReceivableModule, ReturnLineModule, ReturnModule, SalesOrderItemModule, SalesOrderModule, ShipmentLineModule, ShipmentModule, ShipToAccountModule, ShipToModule, RecentlyViewedList) {
  // const resource = getResource('icboeApplicationModule');

  const __class = declare('crm.Integrations.BOE.ApplicationModule', [ApplicationModule], {
    modules: null,
    init: function init() {
      this.inherited(init, arguments);

      // App.picklistService = PicklistService;
      App.enableDashboards = this.enableDashboards;
      this.modules = [
        new AccountAssociationModule(this),
        new AccountModule(this),
        new BillToAccountModule(this),
        new BillToModule(this),
        new ContactModule(this),
        new ContactAssociationModule(this),
        new HelpModule(this),
        new InvoiceLineModule(this),
        new InvoiceModule(this),
        new OpportunityModule(this),
        new PayFromModule(this),
        new ProductModule(this),
        new QuoteModule(this),
        new QuotePersonModule(this),
        new QuoteLineModule(this),
        new ReceivableLineModule(this),
        new ReceivableModule(this),
        new ReturnLineModule(this),
        new ReturnModule(this),
        new SalesOrderItemModule(this),
        new SalesOrderModule(this),
        new ShipmentLineModule(this),
        new ShipmentModule(this),
        new ShipToAccountModule(this),
        new ShipToModule(this),
      ];

      this.modules.forEach((mod) => {
        mod.init();
      });
    },
    initDynamic: function initDynamic() {
      if (!this.isIntegrationEnabled()) {
        return;
      }

      this.modules.forEach((mod) => {
        mod.initDynamic();
      });

      this.inherited(initDynamic, arguments);
    },
    isIntegrationEnabled: function isIntegrationEnabled() {
      const results = this.application.context.integrations.filter(integration => integration.Name === 'Back Office Extension')[0];
      return results && results.Enabled;
    },
    loadViewsDynamic: function loadViewsDynamic() {
      if (!this.isIntegrationEnabled()) {
        return;
      }

      this.modules.forEach((module) => {
        module.loadViews();
      });
    },
    loadCustomizationsDynamic: function loadCustomizations() {
      if (!this.isIntegrationEnabled()) {
        return;
      }

      this.modules.forEach((module) => {
        module.loadCustomizations();
      });
      this.registerDefaultViews();

      lang.extend(argos._ListBase, { // TODO: Avoid global
        navigateToInsertView: function navigateToInsertView(additionalOptions) {
          const view = this.app.getView(this.insertView || this.editView);
          let options = {
            detailView: this.detailView,
            returnTo: this.id,
            insert: true,
          };

          // Pass along the selected entry (related list could get it from a quick action)
          if (this.options.selectedEntry) {
            options.selectedEntry = this.options.selectedEntry;
          }

          if (additionalOptions) {
            options = lang.mixin(options, additionalOptions);
          }

          if (view) {
            view.show(options);
          }
        },
      });

      lang.extend(argos._EditBase, { // TODO: Avoid global
        onInsertCompleted: function onInsertCompleted(entry) {
          if (this.options && this.options.detailView) {
            const view = App.getView(this.options.detailView);
            if (view) {
              view.show({
                key: entry.$key,
                title: entry.$descriptor,
                description: entry.$descriptor,
              }, {
                returnTo: -1,
              });
            }
          } else if (this.options && this.options.returnTo) {
            const returnTo = this.options.returnTo;
            const view = App.getView(returnTo);
            if (view) {
              view.show();
            } else {
              window.location.hash = returnTo;
            }
          } else {
            ReUI.back();
          }
        },
      });

      lang.extend(crm.Views.MetricWidget, {
        itemTemplate: new Simplate([
          '<span class="metric-title">{%: $$.title %}</span>',
          '<h1 class="metric-value" {%: $$.getValueStyle() %} >{%: $$.formatter($.value) %}</h1>',
        ]),
        setValueColor: function setValueColor(color) {
          this.valueColor = color;
        },
        getValueStyle: function getValueStyle() {
          if (this.valueColor) {
            return `style=color:${this.valueColor}`;
          }
          return '';
        },
      });

      lang.extend(argos.TabWidget, { // TODO: Avoid global
        tabListItemTemplate: new Simplate([
          '<li data-key="{%: $.name %}" class="tab" role="presentation" data-action="selectedTab">',
          '<a href="#{%: $$.id %}_{%: $.name %}">{%: ($.title || $.options.title) %}</a>',
          '</li>',
        ]),
      });

      // Recently viewed support
      const originalMappings = RecentlyViewedList.prototype.entityMappings;
      const originalText = RecentlyViewedList.prototype.entityText;

      RecentlyViewedList.prototype.entityText = Object.assign({}, originalText, {
        ERPShipment: getResource('erpShipmentModel').entityDisplayNamePlural,
        SalesOrder: getResource('salesOrderModel').entityDisplayNamePlural,
        ERPReceivable: getResource('erpReceivableModel').entityDisplayNamePlural,
        Quote: getResource('quoteModel').entityDisplayNamePlural,
        ERPInvoice: getResource('erpInvoiceModel').entityDisplayNamePlural,
      });

      RecentlyViewedList.prototype.entityMappings = Object.assign({}, originalMappings, {
        ERPShipment: {
          iconClass: 'warehouse',
        },
        SalesOrder: {
          iconClass: 'cart',
        },
        ERPReceivable: {
          iconClass: 'checkbox',
        },
        Quote: {
          iconClass: 'document',
        },
        ERPInvoice: {
          iconClass: 'document2',
        },
      });
    },
    loadToolbarsDynamic: function loadToolbars() {
      if (!this.isIntegrationEnabled()) {
        return;
      }

      this.modules.forEach((module) => {
        module.loadToolbars();
      });
    },
    loadAppStatePromises: function loadAppStatePromises() {
      this.inherited(loadAppStatePromises, arguments);
      // this.registerAppStatePromise({
      //   seq: 2,
      //   description: resource.picklistsText,
      //   items: [{
      //     name: 'picklist-requests',
      //     description: resource.retrievingPicklistsText,
      //     fn: () => {
      //       PicklistService.requestPicklists();
      //     },
      //   }],
      // });
    },
    registerDefaultViews: function registerDefaultViews() {
      const self = this;
      const originalGetDefaultViews = Application.prototype.getDefaultViews;
      lang.extend(Application, {
        getDefaultViews: function getDefaultViews() {
          const views = originalGetDefaultViews.apply(this, arguments) || [];
          self.modules.forEach((module) => {
            module.registerDefaultViews(views);
          });
          return views;
        },
      });
    },
  });

  lang.setObject('icboe.ApplicationModule', __class);

  return __class;
});
