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

define('crm/Integrations/BOE/Models/UnitOfMeasure/SData', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './Base',
  'argos/Models/_SDataModelBase',
  'argos/Models/Manager',
  'argos/Models/Types',
  '../Names',
  'dojo/Deferred',
  'dojo/when'
], function(declare, lang, Base, _SDataModelBase, Manager, MODEL_TYPES, MODEL_NAMES, Deferred, when) {
  const __class = declare('crm.Integrations.BOE.Models.UnitOfMeasure.SData', [Base, _SDataModelBase], {
    id: 'unitofmeasure_sdata_model',
    createQueryModels: function createQueryModels() {
      return [{
        name: 'list',
        queryOrderBy: 'Name',
        querySelect: [
          'Name',
          'Product/*',
        ],
      }, {
        name: 'detail',
        querySelect: [
          'Name',
          'Product/*',
        ],
        queryInclude: [
          '$permissions',
        ],
      },
      ];
    },
    getUnitOfMeasureFromCode: function getUnitOfMeasureFromCode(uomCode, productId) {
      let queryResults;
      const def = new Deferred();
      const queryOptions = {
        where: `Product.Id eq "${productId}"`,
      };
      if (uomCode && productId) {
        queryResults = this.getEntries(null, queryOptions);
        when(queryResults, (entries) => {
          let uof = null;
          if (entries) {
            entries.forEach((item) => {
              if (item.Name === uomCode) {
                uof = item;
              }
            });
          }
          def.resolve(uof);
        }, (err) => {
          def.reject(err);
        });
      } else {
        def.resolve(null);
      }
      return def.promise;
    },
  });

  Manager.register(MODEL_NAMES.UNITOFMEASURE, MODEL_TYPES.SDATA, __class);
  lang.setObject('icboe.Models.UnitOfMeasure.SData', __class);

  return __class;
});
