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

define('crm/Models/LeadAddress/SData', [
  'dojo/_base/declare',
  './Base',
  'argos/Models/_SDataModelBase',
  'argos/Models/Manager',
  'argos/Models/Types',
  '../Names',
], (declare, Base, _SDataModelBase, Manager, MODEL_TYPE, MODEL_NAMES) => {
  const __class = declare('crm.Models.LeadAddress.SData', [Base, _SDataModelBase], {
    id: 'leadaddress_sdata_model',
    createQueryModels: function createQueryModels() {
      return [{
        name: 'list',
        querySelect: [],
      }, {
        name: 'detail',
        querySelect: [],
      }];
    },
  });

  Manager.register(MODEL_NAMES.LEADADDRESS, MODEL_TYPE.SDATA, __class);

  return __class;
});
