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

define('crm/Views/Contact/List', [
  'dojo/_base/declare',
  'crm/Action',
  '../../Format',
  'argos/List',
  '../_GroupListMixin',
  '../_MetricListMixin',
  '../_RightDrawerListMixin',
  'argos/I18n',
  '../../Models/Names',
  '../../GroupUtility',
], (declare, action, format, List, _GroupListMixin, _MetricListMixin, _RightDrawerListMixin, getResource, MODEL_NAMES, GroupUtility) => {
  const resource = getResource('contactList');

  const __class = declare('crm.Views.Contact.List', [List, _RightDrawerListMixin, _MetricListMixin, _GroupListMixin], {
    format,
    // Template
    // Card Layout
    itemIconClass: 'user',
    _contactImageFieldKey: null,
    _nameLFFieldKey: null,
    itemTemplate: new Simplate([
      '<div class="contact-card">',
      '{% if ($.ContactImage) { %}',
      '<img src="{%: $.ContactImage %}" alt="{%: $.NameLF %}" class="contact-card__photo" />',
      '{% } else { %}',
      '<div class="contact-card__photo-placeholder">',
      '<span>{%: $$.getContactInitials($) %}</span>',
      '</div>',
      '{% } %}',
      '<div class="contact-card__content">',
      '<p class="micro-text">{% if($.Title) { %} {%: $.Title %} | {% } %} {%: $.AccountName %}</p>',
      '<p class="micro-text">{%: $.WebAddress %}</p>',
      '{% if ($.WorkPhone) { %}',
      '<p class="micro-text">',
      '{%: $$.phoneAbbreviationText %} <span class="hyperlink" data-action="callWork" data-key="{%: $.$key %}">{%: $$.format.phone($.WorkPhone) %}</span>', // TODO: Avoid global
      '</p>',
      '{% } %}',
      '{% if ($.Mobile) { %}',
      '<p class="micro-text">',
      '{%: $$.mobileAbbreviationText %} <span class="hyperlink" data-action="callMobile" data-key="{%: $.$key %}">{%: $$.format.phone($.Mobile) %}</span>', // TODO: Avoid global
      '</p>',
      '{% } %}',
      '{% if ($.Email) { %}',
      '<p class="micro-text">',
      '<span class="hyperlink" data-action="sendEmail" data-key="{%: $.$key %}">{%: $.Email %}</span>',
      '</p>',
      '{% } %}',
      '</div>',
      '</div>',
    ]),

    // Localization
    titleText: resource.titleText,
    activitiesText: resource.activitiesText,
    notesText: resource.notesText,
    scheduleText: resource.scheduleText,
    editActionText: resource.editActionText,
    callMainActionText: resource.callMainActionText,
    callWorkActionText: resource.callWorkActionText,
    callMobileActionText: resource.callMobileActionText,
    sendEmailActionText: resource.sendEmailActionText,
    viewAccountActionText: resource.viewAccountActionText,
    addNoteActionText: resource.addNoteActionText,
    addActivityActionText: resource.addActivityActionText,
    addAttachmentActionText: resource.addAttachmentActionText,
    phoneAbbreviationText: resource.phoneAbbreviationText,
    mobileAbbreviationText: resource.mobileAbbreviationText,

    // View Properties
    detailView: 'contact_detail',
    iconClass: 'user',
    id: 'contact_list',
    security: 'Entities/Contact/View',
    insertView: 'contact_edit',
    queryOrderBy: null,
    querySelect: [],
    resourceKind: 'contacts',
    entityName: 'Contact',
    modelName: MODEL_NAMES.CONTACT,
    groupsEnabled: true,
    enableActions: true,
    /**
     * Extracts initials from a contact entry's NameLF field.
     * @param {Object} entry The contact data entry.
     * @param {String} [entry.NameLF] Name in "Last, First" format.
     * @return {String} Uppercase initials (e.g. "JS"), or empty string if NameLF is missing.
     */
    getContactInitials: function getContactInitials(entry) {
      return format.nameLFToInitials(entry && entry.NameLF);
    },
    /**
     * Searches the raw (unfiltered) group layout for a field by propertyPath.
     * Returns the layout item or null.
     */
    _findRawGroupLayoutItem: function _findRawGroupLayoutItem(propertyPath) {
      const group = this._currentGroup;
      if (!group || !group.layout) {
        return null;
      }
      return group.layout.find(item => item.propertyPath === propertyPath) || null;
    },
    /**
     * Returns the contact image value from a group entry, using the cached field key.
     */
    getGroupContactImage: function getGroupContactImage(entry) {
      return this._contactImageFieldKey ? entry[this._contactImageFieldKey] : null;
    },
    /**
     * Returns initials from a group entry's NameLF field, using the cached field key.
     */
    getGroupContactInitials: function getGroupContactInitials(entry) {
      const nameLF = this._nameLFFieldKey ? entry[this._nameLFFieldKey] : null;
      return format.nameLFToInitials(nameLF);
    },
    /**
     * Overrides the group mixin's getItemTemplate.
     * - Resolves ContactImage/NameLF field keys from the raw group layout
     * - Injects those fields into selectColumns so they are fetched
     * - Wraps the base group template with the contact card image if ContactImage is available
     */
    getItemTemplate: function getItemTemplate() {
      // Resolve field keys from the raw group layout (includes visible:false items)
      const contactImageItem = this._findRawGroupLayoutItem('ContactImage');
      const nameLFItem = this._findRawGroupLayoutItem('NameLF');

      this._contactImageFieldKey = contactImageItem ? GroupUtility.getFieldNameByLayout(contactImageItem) : null;
      this._nameLFFieldKey = nameLFItem ? GroupUtility.getFieldNameByLayout(nameLFItem) : null;

      // Inject into selectColumns so the group query fetches these fields.
      // getItemTemplate is called by _onApplyGroup after selectColumns is set
      // but before querySelect is assigned and requestData fires.
      if (this._contactImageFieldKey && this.selectColumns && this.selectColumns.indexOf(this._contactImageFieldKey) === -1) {
        this.selectColumns.push(this._contactImageFieldKey);
      }
      if (this._nameLFFieldKey && this.selectColumns && this.selectColumns.indexOf(this._nameLFFieldKey) === -1) {
        this.selectColumns.push(this._nameLFFieldKey);
      }

      // Get the base group template from the mixin
      const baseTemplate = this.inherited(getItemTemplate, arguments);

      if (!this._contactImageFieldKey) {
        // ContactImage not in this group's layout — use the standard group template
        return baseTemplate;
      }

      // Store the base template so the wrapped Simplate can reference it via $$.groupContentTemplate
      this.groupContentTemplate = baseTemplate;

      return new Simplate([
        '<div class="contact-card">',
        '{% if ($$.getGroupContactImage($)) { %}',
        '<img src="{%: $$.getGroupContactImage($) %}" alt="" class="contact-card__photo" />',
        '{% } else { %}',
        '<div class="contact-card__photo-placeholder">',
        '<span>{%: $$.getGroupContactInitials($) %}</span>',
        '</div>',
        '{% } %}',
        '<div class="contact-card__content">',
        '{%! $$.groupContentTemplate %}',
        '</div>',
        '</div>',
      ]);
    },
    callWork: function callWork(params) {
      this.invokeActionItemBy((theAction) => {
        return theAction.id === 'callWork';
      }, params.key);
    },
    callMobile: function callMobile(params) {
      this.invokeActionItemBy((theAction) => {
        return theAction.id === 'callMobile';
      }, params.key);
    },
    sendEmail: function sendEmail(params) {
      this.invokeActionItemBy((theAction) => {
        return theAction.id === 'sendEmail';
      }, params.key);
    },
    createActionLayout: function createActionLayout() {
      return this.actions || (this.actions = [{
        id: 'edit',
        cls: 'edit',
        label: this.editActionText,
        security: 'Entities/Contact/Edit',
        action: 'navigateToEditView',
      }, {
        id: 'callWork',
        cls: 'phone',
        label: this.callWorkActionText,
        enabled: action.hasProperty.bindDelegate(this, 'WorkPhone'),
        fn: action.callPhone.bindDelegate(this, 'WorkPhone'),
      }, {
        id: 'callMobile',
        cls: 'phone',
        label: this.callMobileActionText,
        enabled: action.hasProperty.bindDelegate(this, 'Mobile'),
        fn: action.callPhone.bindDelegate(this, 'Mobile'),
      }, {
        id: 'viewAccount',
        label: this.viewAccountActionText,
        enabled: action.hasProperty.bindDelegate(this, 'Account.$key'),
        fn: action.navigateToEntity.bindDelegate(this, {
          view: 'account_detail',
          keyProperty: 'Account.$key',
          textProperty: 'AccountName',
        }),
      }, {
        id: 'sendEmail',
        cls: 'mail',
        label: this.sendEmailActionText,
        enabled: action.hasProperty.bindDelegate(this, 'Email'),
        fn: action.sendEmail.bindDelegate(this, 'Email'),
      }, {
        id: 'addNote',
        cls: 'edit',
        label: this.addNoteActionText,
        fn: action.addNote.bindDelegate(this),
      }, {
        id: 'addActivity',
        cls: 'calendar',
        label: this.addActivityActionText,
        fn: action.addActivity.bindDelegate(this),
      }, {
        id: 'addAttachment',
        cls: 'attach',
        label: this.addAttachmentActionText,
        fn: action.addAttachment.bindDelegate(this),
      }]);
    },
    formatSearchQuery: function formatSearchQuery(searchQuery) {
      const q = this.escapeSearchQuery(searchQuery.toUpperCase());
      return `(LastNameUpper like "${q}%" or upper(FirstName) like "${q}%" or upper(NameLF) like "%${q}%") or (AccountName like "%${q}%")`;
    },
  });

  return __class;
});
