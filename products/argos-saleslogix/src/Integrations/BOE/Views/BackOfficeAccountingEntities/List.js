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

define('crm/Integrations/BOE/Views/BackOfficeAccountingEntities/List', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/List',
  '../../Models/Names',
  'argos/I18n',
], (declare, lang, List, MODEL_NAMES, getResource) => {
  const resource = getResource('backOfficeAccountingEntitiesList');

  const __class = declare('crm.Integrations.BOE.Views.BackOfficeAccountingEntities.List', [List], {
    // Templates
    itemTemplate: new Simplate([
      '<p class="listview-heading">{%: $.Name %}</p>',
    ]),

    // Localization
    titleText: resource.titleText,

    // View Properties
    id: 'backofficeaccountingentities_list',
    detailView: '',
    modelName: MODEL_NAMES.BACKOFFICEACCOUNTINGENTITY,
    resourceKind: 'backOfficeAccountingEntities',
    enableActions: false,
    expose: false,
    security: 'Entities/BackOfficeAcctEntity/View',
    insertSecurity: 'Entities/BackOfficeAcctEntity/Add',

    // Card layout
    itemIconClass: '',

    // Metrics
    entityName: 'BackOfficeAccountingEntities',

    createToolLayout: function createToolLayout() {
      return this.tools || (this.tools = {
      });
    },
    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `upper(Name) like "${q}%"`;
    },
  });

  lang.setObject('icboe.Views.BackOfficeAccountingEntities.List', __class);

  return __class;
});
