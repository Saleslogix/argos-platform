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

define('crm/Models/LeadAddress/Base', [
  'dojo/_base/declare',
  'argos/Models/_ModelBase',
  '../Names',
  'argos/I18n',
], (declare, _ModelBase, MODEL_NAMES, getResource) => {
  const resource = getResource('leadAddressModel');

  const __class = declare('crm.Models.LeadAddress.Base', [_ModelBase], {
    resourceKind: 'leadAddresses',
    entityName: 'LeadAddress',
    listViewId: 'address_related',
    entityDisplayName: resource.entityDisplayName,
    entityDisplayNamePlural: resource.entityDisplayNamePlural,
    iconClass: 'bullet-list',
    modelName: MODEL_NAMES.LEADADDRESS,

  });

  return __class;
});
