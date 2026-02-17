/* Copyright 2026 Infor
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

define('crm/Models/HistoryAssociation/SData', [
  'dojo/_base/declare',
  './Base',
  'argos/Models/_SDataModelBase',
  'argos/Models/Manager',
  'argos/Models/Types',
  '../Names',
], (declare, Base, _SDataModelBase, Manager, MODEL_TYPES, MODEL_NAMES) => {
  const __class = declare('crm.Models.HistoryAssociation.SData', [Base, _SDataModelBase], {
    id: 'history_association_sdata_model',
    createQueryModels: function createQueryModels() {
      return [{
        name: 'list',
        queryOrderBy: 'History.CompletedDate desc',
        queryWhere: 'History.Type ne "atDatabaseChange"',
        querySelect: [
          'EntityType',
          'EntityId',
          'History/AccountName',
          'History/ContactName',
          'History/LeadName',
          'History/CompletedDate',
          'History/Description',
          'History/StartDate',
          'History/TimeLess',
          'History/Type',
          'History/LeadId',
          'History/OpportunityId',
          'History/OpportunityName',
          'History/AccountId',
          'History/ContactId',
          'History/TicketId',
          'History/ModifyDate',
          'History/Notes',
        ],
        queryInclude: [
          'History',
          '$descriptors',
        ],
      }];
    },
  });

  Manager.register(MODEL_NAMES.HISTORY_ASSOCIATION, MODEL_TYPES.SDATA, __class);

  return __class;
});
