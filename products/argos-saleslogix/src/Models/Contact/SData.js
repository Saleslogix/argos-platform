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

define('crm/Models/Contact/SData', [
  'dojo/_base/declare',
  './Base',
  'argos/Models/_SDataModelBase',
  'argos/Models/Manager',
  'argos/Models/Types',
  '../Names',
], (declare, Base, _SDataModelBase, Manager, MODEL_TYPES, MODEL_NAMES) => {
  const __class = declare('crm.Models.Contact.SData', [Base, _SDataModelBase], {
    id: 'contact_sdata_model',
    createQueryModels: function createQueryModels() {
      return [{
        name: 'list',
        queryOrderBy: 'LastNameUpper,FirstName',
        querySelect: [
          'AccountName',
          'Account/Id',
          'Account/AccountName',
          'NameLF',
          'ContactImage',
          'WorkPhone',
          'Mobile',
          'Email',
          'Title',
          'LastHistoryDate',
          'ModifyDate',
          'Address/TimeZone',
        ],
      }, {
        name: 'detail',
        querySelect: [
          'Account/AccountName',
          'AccountManager/UserInfo/FirstName',
          'AccountManager/UserInfo/LastName',
          'AccountName',
          'ContactImage',
          'Address/*',
          'CuisinePreference',
          'CreateDate',
          'CreateUser',
          'Email',
          'Fax',
          'FirstName',
          'HomePhone',
          'LastName',
          'LocationCode',
          'MiddleName',
          'Mobile',
          'Name',
          'NameLF',
          'Owner/OwnerDescription',
          'Prefix',
          'Suffix',
          'Title',
          'WebAddress',
          'WorkPhone',
        ],
        queryInclude: [
          '$permissions',
        ],
      }, {
        name: 'edit',
        querySelect: [
          'Account/AccountName',
          'AccountManager/UserInfo/FirstName',
          'AccountManager/UserInfo/LastName',
          'AccountName',
          'Address/*',
          'CuisinePreference',
          'CreateDate',
          'CreateUser',
          'Email',
          'Fax',
          'FirstName',
          'HomePhone',
          'LastName',
          'LocationCode',
          'MiddleName',
          'Mobile',
          'Name',
          'NameLF',
          'Owner/OwnerDescription',
          'Prefix',
          'Suffix',
          'Title',
          'WebAddress',
          'WorkPhone',
        ],
        queryInclude: [
          '$permissions',
        ],
      }];
    },
    getEntry: function getEntry(/* options */) {
      const results$ = this.inherited(getEntry, arguments);
      return results$.then((entry) => {
        return new Promise((resolve) => {
          Promise.all([App.picklistService.requestPicklist('Name Prefix', {
            language: entry.LocationCode && entry.LocationCode.trim() || App.getCurrentLocale(),
            filterByLanguage: true,
          }), App.picklistService.requestPicklist('Name Suffix', {
            language: entry.LocationCode && entry.LocationCode.trim() || App.getCurrentLocale(),
            filterByLanguage: true,
          }), App.picklistService.requestPicklist('Title', {
            language: entry.LocationCode && entry.LocationCode.trim() || App.getCurrentLocale(),
            filterByLanguage: true,
          })]).then(() => {
            resolve(entry);
          });
        });
      });
    },
  });

  Manager.register(MODEL_NAMES.CONTACT, MODEL_TYPES.SDATA, __class);

  return __class;
});
