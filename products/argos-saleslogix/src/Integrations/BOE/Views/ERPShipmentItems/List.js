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

define('crm/Integrations/BOE/Views/ERPShipmentItems/List', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/List',
  'crm/Format',
  'crm/Views/_RightDrawerListMixin',
  'crm/Views/_MetricListMixin',
  '../../Models/Names',
  'argos/I18n'
], function(declare, lang, List, format, _RightDrawerListMixin, _MetricListMixin, MODEL_NAMES, getResource) {
  const resource = getResource('erpShipmentItemsList');

  const __class = declare('crm.Integrations.BOE.Views.ERPShipmentItems.List', [List, _RightDrawerListMixin, _MetricListMixin], {
    formatter: format,

    // Templates
    itemTemplate: new Simplate([
      '<p class="listview-heading"><label class="group-label">{%: $$.productNameText %}</label> {%: $.ProductName %}</p>',
      '{% if ($.SalesOrder) { %}',
      '<p class="micro-text"><label class="group-label">{%: $$.salesOrderText %}</label> {%: $.SalesOrder.SalesOrderNumber %}</p>',
      '{% } %}',
      '<p class="micro-text"><label class="group-label">{%: $$.lineNumberText %}</label> {%: $.ErpLineNumber %}</p>',
      '{% if ($.ErpShipment) { %}',
      '<p class="micro-text"><label class="group-label">{%: $$.shipmentIDText %}</label> {%: $.ErpShipment.ErpExtId %}</p>',
      ' {% } %}',
      '<p class="micro-text"><label class="group-label">{%: $$.shippedQuantityText %}</label> {%: $.ErpShippedQuantity %} {%: $.ErpShippedUOM %}</p>',
    ]),

    // Localization
    titleText: resource.titleText,
    productNameText: resource.productNameText,
    lineNumberText: resource.lineNumberText,
    shipmentIDText: resource.shipmentIDText,
    shippedQuantityText: resource.shippedQuantityText,
    salesOrderText: resource.salesOrderText,

    // View Properties
    id: 'erpshipment_items_list',
    detailView: 'erpshipment_items_detail',
    modelName: MODEL_NAMES.ERPSHIPMENTITEM,
    resourceKind: 'erpShipmentItems',
    allowSelection: true,
    enableActions: true,

    // Card layout
    itemIconClass: 'warehouse',

    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `upper(ErpLineNumber) like "${q}%" or upper(SalesOrder.SalesOrderNumber) like "${q}%" or upper(ProductName) like "${q}%"`;
    },
  });

  lang.setObject('icboe.Views.ERPShipmentItems.List', __class);

  return __class;
});
