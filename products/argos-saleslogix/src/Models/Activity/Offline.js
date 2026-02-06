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

define('crm/Models/Activity/Offline', [
  'dojo/_base/declare',
  './Base',
  'argos/Models/_OfflineModelBase',
  'argos/Models/Manager',
  'argos/Models/Types',
  '../Names',
  'dojo/Deferred'
], function(declare, Base, _OfflineModelBase, Manager, MODEL_TYPES, MODEL_NAMES, Deferred) {
  const __class = declare('crm.Models.Activity.Offline', [Base, _OfflineModelBase], {
    id: 'activity_offline_model',
    onActivityCompleted: function onActivityCompleted(entry) {
      const def = new Deferred();
      const key = (entry.$completedBasedOn) ? entry.$completedBasedOn.$key : entry.$key;
      this.deleteEntry(key);
      this.removeFromAuxiliaryEntities(key);
      def.resolve();
      return def.promise;
    },
    onEntryUpdated: function onEntryUpdated(entry, orginalEntry) {
      const def = new Deferred();

      if (entry && entry.$key && orginalEntry && orginalEntry.$key) {
        if (entry.$key !== orginalEntry.$key) { // this happens when occurence is created
          this.deleteEntry(orginalEntry.$key);
          this.removeFromAuxiliaryEntities(orginalEntry.$key);
        }
      }
      def.resolve();
      return def.promise;
    },

  });

  Manager.register(MODEL_NAMES.ACTIVITY, MODEL_TYPES.OFFLINE, __class);

  return __class;
});
