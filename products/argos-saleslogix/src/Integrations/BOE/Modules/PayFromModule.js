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

define('crm/Integrations/BOE/Modules/PayFromModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  './_Module'
], function(declare, lang, _Module) {
  const __class = declare('crm.Integrations.BOE.Modules.PayFromModule', [_Module], {
    init: function init() {
    },
    loadViews: function loadViews() {
    },
    loadCustomizations: function loadCustomizations() {
    },
    loadToolbars: function loadToolbars() {
    },
  });

  lang.setObject('icboe.Modules.PayFromModule', __class);

  return __class;
});
