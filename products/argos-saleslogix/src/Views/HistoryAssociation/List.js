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

define('crm/Views/HistoryAssociation/List', [
  'dojo/_base/declare',
  '../../Format',
  'argos/Convert',
  '../../Action',
  'argos/List',
  '../_RightDrawerListMixin',
  '../_MetricListMixin',
  'argos/I18n',
  '../../Models/Activity/ActivityTypeIcon',
  '../../Models/Names',
], (declare, format, convert, action, List, _RightDrawerListMixin, _MetricListMixin, getResource, activityTypeIcons, MODEL_NAMES) => {
  const resource = getResource('historyList');
  const activityTypeResource = getResource('activityTypeText');
  const hashTagResource = getResource('historyListHashTags');
  const dtFormatResource = getResource('historyListDateTimeFormat');

  const __class = declare('crm.Views.HistoryAssociation.List', [List, _RightDrawerListMixin, _MetricListMixin], {
    format,
    // Templates
    itemTemplate: new Simplate([
      '<p class="listview-heading">',
      '{% if ($.History.Type === "atNote") { %}',
      '{%: $$.formatDate($.History.ModifyDate) %}',
      '{% } else { %}',
      '{%: $$.formatDate($.History.CompletedDate) %}',
      '{% } %}',
      '</p>',
      '<p class="micro-text">{%= $$.nameTemplate.apply($) %}</p>',
      '{% if($.History.Description) { %}',
      '<p class="micro-text">{%= $$.regardingText + $$.formatPicklist("Description")($.History.Description) %}</p>',
      '{% } %}',
      '<div class="note-text-item">',
      '<div class="note-text-wrap">',
      '{%: $.Notes %}',
      '</div>',
      '</div>',
    ]),
    nameTemplate: new Simplate([
      '{% if ($.History.ContactName) { %}',
      '{%: $.History.ContactName %} | {%: $.History.AccountName %}',
      '{% } else if ($.History.AccountName) { %}',
      '{%: $.History.AccountName %}',
      '{% } else { %}',
      '{%: $.History.LeadName %}',
      '{% } %}',
    ]),

    // Localization
    hourMinuteFormatText: dtFormatResource.hourMinuteFormatText,
    hourMinuteFormatText24: dtFormatResource.hourMinuteFormatText24,
    dateFormatText: dtFormatResource.dateFormatText,
    titleText: resource.titleText,
    viewAccountActionText: resource.viewAccountActionText,
    viewOpportunityActionText: resource.viewOpportunityActionText,
    viewContactActionText: resource.viewContactActionText,
    addAttachmentActionText: resource.addAttachmentActionText,
    regardingText: resource.regardingText,
    touchedText: resource.touchedText,
    activityTypeText: {
      atToDo: activityTypeResource.atToDoText,
      atPhoneCall: activityTypeResource.atPhoneCallText,
      atAppointment: activityTypeResource.atAppointmentText,
      atLiterature: activityTypeResource.atLiteratureText,
      atPersonal: activityTypeResource.atPersonalText,
      atQuestion: activityTypeResource.atQuestionText,
      atEMail: activityTypeResource.atEMailText,
      atNote: activityTypeResource.atNoteText,
    },
    hashTagQueriesText: {
      'my-history': hashTagResource.myHistoryHash,
      note: hashTagResource.noteHash,
      phonecall: hashTagResource.phoneCallHash,
      meeting: hashTagResource.meetingHash,
      personal: hashTagResource.personalHash,
      email: hashTagResource.emailHash,
    },

    // View Properties
    detailView: 'history_detail',
    itemIconClass: 'folder',
    id: 'history_association_list',
    security: null, // 'Entities/History/View',
    existsRE: /^[\w]{12}$/,
    insertView: 'history_edit',
    queryOrderBy: null,
    querySelect: [],
    queryWhere: null,
    resourceKind: 'historyAssociations',
    entityName: 'HistoryAssociation',
    hashTagQueries: {
      'my-history': function myHistory() {
        return `History.UserId eq "${App.context.user.$key}"`;
      },
      note: 'History.Type eq "atNote"',
      phonecall: 'History.Type eq "atPhoneCall"',
      meeting: 'History.Type eq "atAppointment"',
      personal: 'History.Type eq "atPersonal"',
      email: 'History.Type eq "atEMail"',
    },
    activityTypeIcon: activityTypeIcons,
    allowSelection: true,
    enableActions: true,
    modelName: MODEL_NAMES.HISTORY_ASSOCIATION,

    createActionLayout: function createActionLayout() {
      return this.actions || (this.actions = [{
        id: 'viewAccount',
        label: this.viewAccountActionText,
        enabled: action.hasProperty.bindDelegate(this, 'History.AccountId'),
        fn: action.navigateToEntity.bindDelegate(this, {
          view: 'account_detail',
          keyProperty: 'History.AccountId',
          textProperty: 'History.AccountName',
        }),
      }, {
        id: 'viewOpportunity',
        label: this.viewOpportunityActionText,
        enabled: action.hasProperty.bindDelegate(this, 'History.OpportunityId'),
        fn: action.navigateToEntity.bindDelegate(this, {
          view: 'opportunity_detail',
          keyProperty: 'History.OpportunityId',
          textProperty: 'History.OpportunityName',
        }),
      }, {
        id: 'viewContact',
        label: this.viewContactActionText,
        action: 'navigateToContactOrLead',
        enabled: this.hasContactOrLead,
      }, {
        id: 'addAttachment',
        cls: 'attach',
        label: this.addAttachmentActionText,
        fn: action.addAttachment.bindDelegate(this),
      }]);
    },
    hasContactOrLead: function hasContactOrLead(theAction, selection) {
      return (selection.data.EntityType === 'Contact' || selection.data.EntityType === 'Lead');
    },
    navigateToContactOrLead: function navigateToContactOrLead(theAction, selection) {
      const entity = this.resolveContactOrLeadEntity(selection.data);
      let viewId;
      let options;

      switch (entity) {
        case 'Contact':
          viewId = 'contact_detail';
          options = {
            key: selection.data.EntityId,
            descriptor: selection.data.$descriptor,
          };
          break;
        case 'Lead':
          viewId = 'lead_detail';
          options = {
            key: selection.data.EntityId,
            descriptor: selection.data.$descriptor,
          };
          break;
        default:
      }

      const view = App.getView(viewId);

      if (view && options) {
        view.show(options);
      }
    },
    resolveContactOrLeadEntity: function resolveContactOrLeadEntity(entry) {
      const exists = this.existsRE;

      if (entry && entry.History) {
        if (exists.test(entry.History.LeadId)) {
          return 'Lead';
        }
        if (exists.test(entry.History.ContactId)) {
          return 'Contact';
        }
      }
    },
    formatDate: function formatDate(date) {
      const startDate = moment(convert.toDateFromString(date));
      const nextDate = startDate.clone().add({
        hours: 24,
      });
      let fmt = this.dateFormatText;

      if (startDate.valueOf() < nextDate.valueOf() && startDate.valueOf() > moment().startOf('day').valueOf()) {
        fmt = (App.is24HourClock()) ? this.hourMinuteFormatText24 : this.hourMinuteFormatText;
      }

      return format.date(startDate.toDate(), fmt);
    },
    formatPicklist: function formatPicklist(property) {
      return format.picklist(this.app.picklistService, this._model, property);
    },
    formatSearchQuery: function formatSearchQuery(searchQuery) {
      return `upper(History.Description) like "%${this.escapeSearchQuery(searchQuery.toUpperCase())}%"`;
    },
    createIndicatorLayout: function createIndicatorLayout() {
      return this.itemIndicators || (this.itemIndicators = [{
        id: 'touched',
        cls: 'flag',
        title: this.touchedText,
        onApply: function onApply(entry, parent) {
          this.isEnabled = parent.hasBeenTouched(entry);
        },
      }]);
    },
    hasBeenTouched: function hasBeenTouched(entry) {
      if (entry.History.ModifyDate) {
        const modifiedDate = moment(convert.toDateFromString(entry.History.ModifyDate));
        const currentDate = moment().endOf('day');
        const weekAgo = moment().subtract(1, 'weeks');

        return modifiedDate.isAfter(weekAgo) &&
          modifiedDate.isBefore(currentDate);
      }
      return false;
    },
    getItemIconClass: function getItemIconClass(entry) {
      const type = entry && entry.History.Type;
      return this._getItemIconClass(type);
    },
    getTitle: function getTitle(entry) {
      const type = entry && entry.History.Type;
      return this.activityTypeText[type] || this.titleText;
    },
    _getItemIconClass: function _getItemIconClass(type) {
      let cls = this.activityTypeIcon[type];
      if (!cls) {
        cls = this.itemIconClass;
      }
      return cls;
    },
    init: function init() {
      this.inherited(init, arguments);
    },
    activateEntry: function activateEntry(params) {
      const entry = this.entries[params.key];
      if (entry) {
        const activityParams = params;
        activityParams.descriptor = this.getTitle(entry);
        activityParams.key = entry.History.$key;
        this.inherited(arguments, [activityParams]);
      } else {
        this.inherited(activateEntry, arguments);
      }
    },
  });

  return __class;
});
