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

define('crm/Views/SpeedSearchOptions', [
  'dojo/_base/declare',
  'argos/Edit',
  'argos/I18n',
], (declare, Edit, getResource) => {
  const resource = getResource('speedSearchOptions');

  const __class = declare('crm.Views.SpeedSearchOptions', [Edit], {
    // Localization
    titleText: resource.titleText,
    searchMethodText: resource.searchMethodText,
    rootText: resource.rootText,
    thesaurusText: resource.thesaurusText,
    soundsLikeText: resource.soundsLikeText,

    // View Properties
    id: 'speedsearch_options_edit',
    expose: false,
    enablePullToRefresh: false,

    onRefreshUpdate: function onRefreshUpdate() {
      // Always request data, even without a key
      this.requestData();
    },
    formatSearchType: function formatSearchType(value) {
      // Handle when value is an object (from selection)
      if (value && typeof value === 'object') {
        if (value.$descriptor) {
          return value.$descriptor;
        }
        if (value.$key !== undefined) {
          value = value.$key;
        }
      }

      // Handle when value is a number (from stored data)
      const searchTypes = {
        0: resource.searchTypeAndText,
        1: resource.searchTypeOrText,
        2: resource.searchTypeExactPhraseText,
        3: resource.searchTypeBooleanText,
        4: resource.searchTypeNaturalText,
      };
      return searchTypes[value] || value;
    },
    createLayout: function createLayout() {
      return this.layout || (this.layout = [{
        label: this.searchMethodText,
        name: 'searchType',
        property: 'searchType',
        type: 'select',
        view: 'select_list',
        data: {
          $resources: [{
            $key: 0,
            $descriptor: resource.searchTypeAndText,
          }, {
            $key: 1,
            $descriptor: resource.searchTypeOrText,
          }, {
            $key: 2,
            $descriptor: resource.searchTypeExactPhraseText,
          }, {
            $key: 3,
            $descriptor: resource.searchTypeBooleanText,
          }, {
            $key: 4,
            $descriptor: resource.searchTypeNaturalText,
          }],
        },
        textProperty: '$descriptor',
        keyProperty: '$key',
        textRenderer: this.formatSearchType.bind(this),
        formatValue: this.formatSearchType.bind(this),
        title: this.searchMethodText,
      }, {
        label: this.rootText,
        name: 'includeStemming',
        property: 'includeStemming',
        type: 'boolean',
      }, {
        label: this.thesaurusText,
        name: 'includeThesaurus',
        property: 'includeThesaurus',
        type: 'boolean',
      }, {
        label: this.soundsLikeText,
        name: 'includePhonic',
        property: 'includePhonic',
        type: 'boolean',
      }]);
    },
    getValues: function getValues() {
      const values = this.inherited(getValues, arguments);
      return values;
    },
    requestData: function requestData() {
      const prefs = (App.preferences && App.preferences.speedSearch) || {};
      const defaults = App.speedSearch || {};

      // Parse searchType as integer since it might be stored as string
      let searchType = prefs.searchType !== undefined ? prefs.searchType : defaults.searchType;
      if (typeof searchType === 'string') {
        searchType = parseInt(searchType, 10);
      }
      if (searchType === undefined || isNaN(searchType)) {
        searchType = 0;
      }

      // Helper to get preference value with fallback to default
      const getPreference = (prefValue, defaultValue, fallback) => {
        if (prefValue !== undefined) {
          return prefValue;
        }
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        return fallback;
      };

      const entry = {
        $key: 'speedsearch_options',
        searchType,
        includeStemming: getPreference(prefs.includeStemming, defaults.includeStemming, true),
        includeThesaurus: getPreference(prefs.includeThesaurus, defaults.includeThesaurus, false),
        includePhonic: getPreference(prefs.includePhonic, defaults.includePhonic, false),
      };

      this._onGetComplete(entry);
    },
    save: function save() {
      // Get all values, not just modified ones
      const values = this.getValues(true);

      // Extract searchType - handle if it's an object or a number
      let searchType = values.searchType;
      if (searchType && typeof searchType === 'object') {
        searchType = searchType.$key;
      }
      searchType = parseInt(searchType, 10);
      if (isNaN(searchType)) {
        searchType = 0; // Default to 0 if parsing fails
      }

      // Ensure searchType is stored as a number
      App.preferences.speedSearch = {
        searchType,
        includeStemming: values.includeStemming === true,
        includeThesaurus: values.includeThesaurus === true,
        includePhonic: values.includePhonic === true,
      };

      // Update the runtime App.speedSearch object
      App.speedSearch.searchType = searchType;
      App.speedSearch.includeStemming = values.includeStemming === true;
      App.speedSearch.includeThesaurus = values.includeThesaurus === true;
      App.speedSearch.includePhonic = values.includePhonic === true;

      App.persistPreferences();
      App.back();
    },
  });

  return __class;
});
