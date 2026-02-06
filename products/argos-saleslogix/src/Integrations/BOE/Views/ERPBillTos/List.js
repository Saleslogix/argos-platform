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

define('crm/Integrations/BOE/Views/ERPBillTos/List', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/List',
  'crm/Views/_RightDrawerListMixin',
  'crm/Views/_MetricListMixin',
  'crm/Views/_GroupListMixin',
  '../../Models/Names',
  'argos/I18n'
], function(declare, lang, List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin, MODEL_NAMES, getResource) {
  const resource = getResource('erpBillTosList');

  const __class = declare('crm.Integrations.BOE.Views.ErpBillTos.List', [List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin], {
    // Templates
    itemTemplate: new Simplate([
      '<p class="listview-heading">{%: $.Name %}</p>',
      '<p class="listview-heading address">{%: $.Address.FullAddress %}</p>',
    ]),

    // Localization
    titleText: resource.titleText,

    // View Properties
    id: 'erpbillto_list',
    detailView: 'erpbillto_detail',
    insertView: 'erpbillto_edit',
    allowSelection: true,
    enableActions: false,
    expose: false,
    modelName: MODEL_NAMES.ERPBILLTO,
    resourceKind: 'erpBillTos',
    security: 'Entities/ErpBillTo/View',
    insertSecurity: 'Entities/ErpBillTo/Add',

    // Card layout
    itemIconClass: '',

    // Groups
    enableDynamicGroupLayout: true,
    groupsEnabled: true,

    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `upper(Name) like "%${q}%"`;
    },
  });

  lang.setObject('icboe.Views.ErpBillTos.List', __class);

  return __class;
});
