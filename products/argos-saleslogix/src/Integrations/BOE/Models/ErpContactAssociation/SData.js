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

define('crm/Integrations/BOE/Models/ErpContactAssociation/SData', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './Base',
  'argos/Models/_SDataModelBase',
  'argos/Models/Manager',
  'argos/Models/Types',
  '../Names'
], function(declare, lang, Base, _SDataModelBase, Manager, MODEL_TYPES, MODEL_NAMES) {
  const __class = declare('crm.Integrations.BOE.Models.ErpContactAssociation.SData', [Base, _SDataModelBase], {
    id: 'erpcontactassociation_sdata_model',
    createQueryModels: function createQueryModels() {
      return [{
        name: 'list',
        queryOrderBy: 'CreateDate desc',
        querySelect: [
          'Contact/NameLF',
          'Account/AccountName',
          'CreateDate',
        ],
      }, {
        name: 'detail',
        querySelect: [
          'Contact/NameLF',
          'Account/AccountName',
          'CreateDate',
        ],
        queryInclude: [
          '$permissions',
        ],
      },
      ];
    },
  });

  Manager.register(MODEL_NAMES.ERPCONTACTASSOCIATION, MODEL_TYPES.SDATA, __class);
  lang.setObject('icboe.Models.ErpContactAssociation.SData', __class);

  return __class;
});
