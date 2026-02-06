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

define('crm/Integrations/BOE/Models/ErpBillToAccount/Base', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/Models/_ModelBase',
  '../Names',
  'argos/I18n'
], function(declare, lang, _ModelBase, MODEL_NAMES, getResource) {
  const resource = getResource('erpBillToAccountModel');
  const accountResource = getResource('accountModel');

  const __class = declare('crm.Integrations.BOE.Models.ErpBillToAccount.Base', [_ModelBase], {
    contractName: 'dynamic',
    resourceKind: 'erpBillToAccounts',
    entityName: 'ERPBillToAccount',
    entityDisplayName: resource.entityDisplayName,
    entityDisplayNamePlural: resource.entityDisplayNamePlural,
    modelName: MODEL_NAMES.ERPBILLTOACCOUNT,
    iconClass: 'spreadsheet',
    detailViewId: 'erpbilltoaccounts_detail',
    listViewId: 'erpbilltoaccounts_list',
    editViewId: '',
    createRelationships: function createRelationships() {
      const rel = this.relationships || (this.relationships = [{
        name: 'Account',
        displayName: accountResource.entityDisplayName,
        type: 'ManyToOne',
        relatedEntity: 'Account',
        relatedProperty: 'ErpBillToAccounts',
        relatedPropertyType: 'object',
      }]);
      return rel;
    },
  });
  lang.setObject('icboe.Models.ErpBillToAccount.Base', __class);

  return __class;
});
