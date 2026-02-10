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

define('crm/Integrations/BOE/Views/QuotePersons/List', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/List',
  'crm/Format',
  'crm/Views/_RightDrawerListMixin',
  'crm/Views/_MetricListMixin',
  'crm/Views/_GroupListMixin',
  '../../Models/Names',
  'argos/I18n',
], (declare, lang, List, format, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin, MODEL_NAMES, getResource) => {
  const resource = getResource('quotePersonList');

  const __class = declare('crm.Integrations.BOE.Views.QuotePersons.List', [List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin], {
    formatter: format,
    // Templates
    itemTemplate: new Simplate([
      '<p class="micro-text"><label class="group-label">{%: $$.personNameText %}</label> {%: $.Person.Name %}</p>',
      '<p class="micro-text"><label class="group-label">{%: $$.quoteNumberText %}</label> {%: $.Quote.QuoteNumber %}</p>',
    ]),

    // Localization
    titleText: resource.titleText,
    personNameText: resource.personNameText,
    quoteNumberText: resource.quoteNumberText,

    // View Properties
    id: 'quotePerson_list',
    modelName: MODEL_NAMES.QUOTEPERSON,
    resourceKind: 'quotePersons',
    allowSelection: true,
    enableActions: false,
    expose: false,
    security: 'Entities/ErpPerson/View',
    insertSecurity: 'Entities/ErpPerson/Add',

    // Card layout
    itemIconClass: '',

    // Groups
    enableDynamicGroupLayout: false,
    groupsEnabled: false,

    // Metrics
    entityName: 'Quote Person',

    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `upper(Quote.QuoteNumber) like "${q}%" or upper(Person.Name) like "${q}%"`;
    },
  });

  lang.setObject('icboe.Views.QuotePersons.List', __class);

  return __class;
});
