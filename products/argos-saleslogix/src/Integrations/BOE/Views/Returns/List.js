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

define('crm/Integrations/BOE/Views/Returns/List', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/List',
  'crm/Views/_RightDrawerListMixin',
  'crm/Views/_MetricListMixin',
  'crm/Views/_GroupListMixin',
  'argos/I18n'
], function(declare, lang, List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin, getResource) {
  const resource = getResource('returnsList');

  const __class = declare('crm.Integrations.BOE.Views.Returns.List', [List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin], {
    // Templates
    // TODO: Need template from PM
    itemTemplate: new Simplate([
      '<p class="listview-heading">{%: $.$descriptor %}</p>',
    ]),

    // Localization
    titleText: resource.titleText,
    documentDateText: resource.documentDateText,

    // View Properties
    id: 'returns_list',
    security: 'Entities/Return/View',
    insertSecurity: 'Entities/Return/Add',
    resourceKind: 'returns',
    allowSelection: true,
    enableActions: true,

    // Card layout
    itemIconClass: 'load', // TODO: ensure soho has this icon

    // Groups
    enableDynamicGroupLayout: true,
    groupsEnabled: true,

    // Metrics
    entityName: 'Return',

    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `upper(ReturnNumber) like "%${q}%"`;
    },
  });

  lang.setObject('icboe.Views.Returns.List', __class);

  return __class;
});
