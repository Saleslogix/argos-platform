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

define('crm/Integrations/BOE/Views/ERPBillToAccounts/List', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/List',
  'crm/Views/_RightDrawerListMixin',
  'crm/Views/_MetricListMixin',
  'crm/Views/_GroupListMixin',
  '../../Models/Names',
  'argos/I18n'
], function(declare, lang, List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin, MODEL_NAMES, getResource) {
  const resource = getResource('erpBillToAccountsList');

  const __class = declare('crm.Integrations.BOE.Views.ERPBillToAccounts.List', [List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin], {
    // Templates
    // TODO: Need template from PM
    itemTemplate: new Simplate([
      '<p class="listview-heading">{%: $.ErpBillTo.Name %}</p>',
      '<p class="micro-text address">{%: $.ErpBillTo.Address.FullAddress %}</p>',
    ]),

    // Localization
    titleText: resource.titleText,

    // View Properties
    id: 'erpbilltoaccounts_list',
    detailView: 'erpbilltoaccounts_detail',
    insertView: 'erpbilltoaccounts_edit',
    resourceKind: 'erpBillToAccounts',
    allowSelection: true,
    enableActions: false,
    expose: false,
    modelName: MODEL_NAMES.ERPBILLTOACCOUNT,
    security: 'Entities/ErpBillTo/View',
    insertSecurity: 'Entities/ErpBillTo/Add',

    // Card layout
    itemIconClass: 'spreadsheet',

    // Groups
    enableDynamicGroupLayout: true,
    groupsEnabled: true,

    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `upper(ErpBillTo.Name) like "%${q}%"`;
    },
  });

  lang.setObject('icboe.Views.ERPBillToAccounts.List', __class);

  return __class;
});
