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

define('crm/Integrations/BOE/Modules/ReceivableLineModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module',
  '../Views/ERPReceivableItems/Detail',
  '../Models/ErpReceivableItem/Offline',
  '../Models/ErpReceivableItem/SData'
], function(declare, lang, _Module, ERPReceivableItemsDetail) {
  const __class = declare('crm.Integrations.BOE.Modules.ReceivableLineModule', [_Module], {
    init: function init() {
    },
    loadViews: function loadViews() {
      const am = this.applicationModule;
      am.registerView(new ERPReceivableItemsDetail());
    },
    loadCustomizations: function loadCustomizations() {
    },
    loadToolbars: function loadToolbars() {
    },
  });

  lang.setObject('icboe.Modules.ReceivableLineModule', __class);

  return __class;
});
