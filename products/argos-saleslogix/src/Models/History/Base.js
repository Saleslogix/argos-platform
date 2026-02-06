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

define('crm/Models/History/Base', [
  'dojo/_base/declare',
  'argos/Models/_ModelBase',
  '../Names',
  'argos/I18n'
], function(declare, _ModelBase, MODEL_NAMES, getResource) {
  const resource = getResource('historyModel');

  const __class = declare('crm.Models.History.Base', [_ModelBase], {
    resourceKind: 'history',
    entityName: 'History',
    entityDisplayName: resource.entityDisplayName,
    entityDisplayNamePlural: resource.entityDisplayNamePlural,
    modelName: MODEL_NAMES.HISTORY,
    iconClass: 'bullet-list',

    createPicklists: function createPicklists() {
      return this.picklists || (this.picklists = [{
        name: 'Note Regarding',
        property: 'Description',
      }]);
    },
  });

  return __class;
});
