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

define('crm/Integrations/BOE/Views/ERPInvoiceItems/List', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/List',
  'crm/Views/_MetricListMixin',
  'crm/Views/_RightDrawerListMixin',
  '../../Models/Names',
  'argos/I18n'
], function(declare, lang, List, _MetricListMixin, _RightDrawerListMixin, MODEL_NAMES, getResource) {
  const resource = getResource('erpInvoiceItemsList');

  const __class = declare('crm.Integrations.BOE.Views.ERPInvoiceItems.List', [List, _RightDrawerListMixin, _MetricListMixin], {
    itemTemplate: new Simplate([
      '<p class="listview-heading"><label class="group-label">{%: $$.productNameText %}</label> {%: $.ProductName %}</p>',
      '<p class="micro-text"><label class="group-label">{%: $$.invoiceIdText %}</label> {%: $.ErpInvoice.InvoiceNumber %}</p>',
      '<p class="micro-text"><label class="group-label">{%: $$.descriptionText %}</label> {%: $.Description %}</p>',
      '<p class="micro-text"><label class="group-label">{%: $$.lineText %}</label> {%: $.ErpLineNumber %}</p>',
      '<p class="micro-text"><label class="group-label">{%: $$.quantityText %}</label> {%: $.Quantity %}</p>',
      '<p class="micro-text"><label class="group-label">{%: $$.priceText %}</label> {%: $.Price %}</p>',
      '{% if ($.ErpLineTotalAmount) { %}',
      '<p class="micro-text"> <label class="group-label">{%: $$.amountText %}</label> <strong>',
      '{% if (App.hasMultiCurrency() && $.ErpInvoice.CurrencyCode) { %}',
      '{%: crm.Format.multiCurrency($.ErpLineTotalAmount, $.ErpInvoice.CurrencyCode) %}',
      '{% } else { %}',
      '{%: crm.Format.currency($.ErpLineTotalAmount) %}',
      '{% } %}',
      '</strong></p>',
      '{% } %}',
    ]),

    // Localization
    titleText: resource.titleText,
    lineText: resource.lineText,
    quantityText: resource.quantityText,
    priceText: resource.priceText,
    amountText: resource.amountText,
    productNameText: resource.productNameText,
    descriptionText: resource.descriptionText,
    invoiceIdText: resource.invoiceIdText,

    // View Properties
    id: 'invoice_item_list',
    detailView: 'invoice_item_detail',
    allowSelection: true,
    enableActions: true,
    modelName: MODEL_NAMES.ERPINVOICEITEM,
    resourceKind: 'erpInvoiceItems',

    // Card layout
    itemIconClass: 'bullet-list',

    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `upper(ProductName) like "${q}%" or upper(ErpLineNumber) like "${q}%" or upper(Description) like "${q}%"`;
    },
  });

  lang.setObject('crm.Views.ERPInvoiceItems.List', __class);

  return __class;
});
