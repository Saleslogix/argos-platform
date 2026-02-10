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

define('crm/Integrations/BOE/Views/ERPShipments/List', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'crm/Action',
  'argos/List',
  'crm/Format',
  'crm/Views/_RightDrawerListMixin',
  'crm/Views/_MetricListMixin',
  'crm/Views/_GroupListMixin',
  '../../Models/Names',
  '../../Utility',
  'argos/I18n',
], (declare, lang, action, List, format, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin, MODEL_NAMES, utility, getResource) => {
  const resource = getResource('erpShipmentsList');

  const __class = declare('crm.Integrations.BOE.Views.ERPShipments.List', [List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin], {
    formatter: format,
    util: utility,

    // Templates
    itemTemplate: new Simplate([
      '<p class="listview-heading"><label class="group-label">{%: $$.shipmentIDLabelText %}</label> {%: $.ErpExtId %}</p>',
      '<p class="micro-text"> {% if ($.Account) { %}<label class="group-label"> {%: $$.accountLabelText %}</label> {%: $.Account.AccountName %} {% } %}</p>',
      '<p class="micro-text"><label class="group-label">{%: $$.statusLabelText %}</label> {%: $.ErpStatus %}</p>',
      '<p class="micro-text"> {% if ($.DatePromised) { %}<label class="group-label">{%: $$.datePromisedLabelText %}</label> {%: $$.formatter.date($.DatePromised) %} {% } %}</p>',
      '<p class="micro-text"><label class="group-label"> {%: $$.totalBaseAmountText %} </label>',
      '{%: $$.util.formatMultiCurrency($.ShipmentTotalBaseAmount, $.BaseCurrencyCode) %}',
      '</p>',
      '<p class="micro-text"><label class="group-label"> {%: $$.totalAmountText %} </label>',
      '{%: $$.util.formatMultiCurrency($.ShipmentTotalAmount, $.CurrencyCode) %}',
      '</p>',
      '<p class="micro-text"><label class="group-label">{%: $$.documentDateText %}</label> {%: $$.formatter.date($.ErpDocumentDate) %}</p>',
    ]),

    // Localization
    titleText: resource.titleText,
    statusLabelText: resource.statusLabelText,
    shipmentIDLabelText: resource.shipmentIDLabelText,
    accountLabelText: resource.accountLabelText,
    datePromisedLabelText: resource.datePromisedLabelText,
    viewAccountActionText: resource.viewAccountActionText,
    totalBaseAmountText: resource.totalBaseAmountText,
    totalAmountText: resource.totalAmountText,
    documentDateText: resource.documentDateText,

    // View Properties
    id: 'erpshipments_list',
    detailView: 'erpshipments_detail',
    modelName: MODEL_NAMES.ERPSHIPMENT,
    resourceKind: 'erpShipments',
    allowSelection: true,
    enableActions: true,
    enableHashTags: true,
    expose: true,
    security: 'Entities/ErpShipment/View',
    insertSecurity: 'Entities/ErpShipment/Add',

    // Groups
    enableDynamicGroupLayout: true,
    groupsEnabled: true,
    entityName: 'ERPShipment',

    // Card layout
    itemIconClass: 'warehouse',

    createActionLayout: function createActionLayout() {
      return this.actions || (this.actions = [{
        id: 'viewAccount',
        label: this.viewAccountActionText,
        enabled: action.hasProperty.bindDelegate(this, 'Account.$key'),
        fn: action.navigateToEntity.bindDelegate(this, {
          view: 'account_detail',
          keyProperty: 'Account.$key',
          textProperty: 'Account.AccountName',
        }),
      }]
      );
    },

    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `upper(Account.AccountName) like "${q}%" or upper(ErpExtId) like "${q}%"`;
    },
  });

  lang.setObject('icboe.Views.ERPShipments.List', __class);

  return __class;
});
