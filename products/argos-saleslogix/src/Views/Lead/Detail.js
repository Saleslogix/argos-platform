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

define('crm/Views/Lead/Detail', [
  'dojo/_base/declare',
  'dojo/string',
  '../../Action',
  '../../Format',
  '../../Models/Names',
  '../../OCR/FeatureAvailability',
  'argos/Detail',
  'argos/I18n',
], (declare, string, action, format, MODEL_NAMES, FeatureAvailability, Detail, getResource) => {
  const resource = getResource('leadDetail');

  const __class = declare('crm.Views.Lead.Detail', [Detail], {
    // Localization
    accountText: resource.accountText,
    addressText: resource.addressText,
    businessDescriptionText: resource.businessDescriptionText,
    createDateText: resource.createDateText,
    createUserText: resource.createUserText,
    eMailText: resource.eMailText,
    leadSourceText: resource.leadSourceText,
    industryText: resource.industryText,
    interestsText: resource.interestsText,
    leadTitleText: resource.leadTitleText,
    nameText: resource.nameText,
    notesText: resource.notesText,
    ownerText: resource.ownerText,
    relatedActivitiesText: resource.relatedActivitiesText,
    relatedHistoriesText: resource.relatedHistoriesText,
    relatedItemsText: resource.relatedItemsText,
    relatedNotesText: resource.relatedNotesText,
    relatedAttachmentText: resource.relatedAttachmentText,
    relatedAttachmentTitleText: resource.relatedAttachmentTitleText,
    sicCodeText: resource.sicCodeText,
    titleText: resource.titleText,
    tollFreeText: resource.tollFreeText,
    mobileText: resource.mobileText,
    webText: resource.webText,
    workText: resource.workText,
    actionsText: resource.actionsText,
    callWorkNumberText: resource.callWorkNumberText,
    scheduleActivityText: resource.scheduleActivityText,
    addNoteText: resource.addNoteText,
    sendEmailText: resource.sendEmailText,
    viewAddressText: resource.viewAddressText,
    calledText: resource.calledText,
    emailedText: resource.emailedText,
    entityText: resource.entityText,
    relatedWorkflowInstancesText: resource.relatedWorkflowInstancesText,
    relatedWorkflowInstancesTitleText: resource.relatedWorkflowInstancesTitleText,

    // OCR card scanner localization
    ocrScanText: resource.ocrScanText,
    ocrUnavailableText: resource.ocrUnavailableText,
    ocrOpenFailedText: resource.ocrOpenFailedText,

    // View Properties
    id: 'lead_detail',
    editView: 'lead_edit',
    historyEditView: 'history_edit',
    noteEditView: 'history_edit',
    enableOffline: true,
    resourceKind: 'leads',
    modelName: MODEL_NAMES.LEAD,

    navigateToHistoryInsert: function navigateToHistoryInsert(type, entry) {
      this.refreshRequired = true;
      action.navigateToHistoryInsert(entry);
    },
    recordCallToHistory: function recordCallToHistory(phoneNumber) {
      const entry = {
        $name: 'History',
        Type: 'atPhoneCall',
        AccountName: this.entry.Company,
        LeadId: this.entry.$key,
        LeadName: this.entry.LeadNameLastFirst,
        Description: string.substitute(this.calledText, [this.entry.LeadNameFirstLast]),
        UserId: App.context && App.context.user.$key,
        UserName: App.context && App.context.user.UserName,
        Duration: 15,
        CompletedDate: (new Date()),
      };

      this.navigateToHistoryInsert('atPhoneCall', entry);
      App.initiateCall(phoneNumber);
    },
    recordEmailToHistory: function recordEmailToHistory(email) {
      const entry = {
        $name: 'History',
        Type: 'atEMail',
        AccountName: this.entry.Company,
        LeadId: this.entry.$key,
        LeadName: this.entry.LeadNameLastFirst,
        Description: string.substitute(this.emailedText, [this.entry.LeadNameLastFirst]),
        UserId: App.context && App.context.user.$key,
        UserName: App.context && App.context.user.UserName,
        Duration: 15,
        CompletedDate: (new Date()),
      };

      this.navigateToHistoryInsert('atEMail', entry);
      App.initiateEmail(email);
    },
    callWorkPhone: function callWorkPhone() {
      this.recordCallToHistory(this.entry.WorkPhone);
    },
    checkWorkPhone: function checkWorkPhone(entry, value) {
      return !value;
    },
    sendEmail: function sendEmail() {
      this.recordEmailToHistory(this.entry.Email);
    },
    checkEmail: function checkEmail(entry, value) {
      return !value;
    },
    viewAddress: function viewAddress() {
      App.showMapForAddress(format.address(this.entry.Address, true, ' '));
    },
    checkAddress: function checkAddress(entry, value) {
      return !format.address(value, true, '');
    },
    scheduleActivity: function scheduleActivity() {
      App.navigateToActivityInsertView();
    },
    addNote: function addNote() {
      const view = App.getView(this.noteEditView);
      if (view) {
        view.show({
          template: {},
          insert: true,
        });
      }
    },
    // Id of the OCR capture view launched by the quick action.
    captureView: 'ocr_capture',
    // Edit-layout field types whose value can be populated from a single
    // recognized text line. Address/lookup/note/owner types are excluded.
    ocrMappableFieldTypes: {
      name: true,
      text: true,
      phone: true,
      picklist: true,
    },
    // Max length applied to a mappable field that declares none (e.g. email).
    ocrDefaultMaxTextLength: 255,
    /**
     * Activate the OCR card scanner from the Lead detail quick action.
     *
     * Flow (Requirement 2):
     *  - If the feature is unavailable for the session, show a message and stay
     *    on the Lead detail without navigating (Req 2.4).
     *  - Otherwise open the capture view in the context of the current Lead
     *    (Req 2.2, 2.6). No camera access is requested here; the capture view's
     *    image-source chooser defers any camera permission prompt to the OS at
     *    the moment the user chooses to take a photo, so the device camera never
     *    engages on activation (notably on desktop).
     *  - If the capture view fails to open, show a message with a retry action
     *    while keeping the user on the Lead detail with the current Lead data
     *    unchanged (Req 2.5).
     */
    startOcrScan: function startOcrScan() {
      // Req 2.4: unavailable for this session -> message, no navigation.
      if (!FeatureAvailability.isAvailable()) {
        App.modal.createSimpleAlert({
          title: 'alert',
          content: this.ocrUnavailableText,
        });
        return;
      }

      this._openCaptureView()
        .catch((reason) => {
          this._handleOcrLaunchFailure(reason);
        });
    },
    /**
     * Build the entity-specific scan configuration and open the capture view.
     * The target field set is derived from the Lead edit layout so the capture
     * and mapping views stay entity-agnostic (Req 2.2).
     * @returns {Promise} Resolves once the view is shown; rejects with 'open'
     *   when the capture view cannot be opened (Req 2.5).
     * @private
     */
    _openCaptureView: function _openCaptureView() {
      const view = App.getView(this.captureView);

      if (!view) {
        return Promise.reject('open');
      }

      try {
        view.show({
          scanConfig: {
            targetFields: this._getOcrTargetFields(),
            destinationEditView: this.editView,
          },
          entry: this.entry,
        });
      } catch (err) {
        return Promise.reject('open');
      }

      return Promise.resolve();
    },
    /**
     * The OCR target fields for a Lead, derived from the Lead edit view's
     * layout so the mappable fields always track the real edit form (including
     * the lead name and email). Only field types whose value can be populated
     * from a single recognized text line are included; composite/relational
     * types (address, lookup) and large free-form notes are excluded. Falls
     * back to a static set if the edit layout cannot be read.
     * @returns {Array} The Lead TargetField set
     *   ({ name, label, property, maxTextLength }).
     * @private
     */
    _getOcrTargetFields: function _getOcrTargetFields() {
      const editView = App.getView(this.editView);
      const layout = (editView && typeof editView.createLayout === 'function')
        ? editView.createLayout()
        : null;

      if (!Array.isArray(layout)) {
        return this._getFallbackOcrTargetFields();
      }

      const fields = [];
      this._collectOcrTargetFields(layout, fields);

      return fields.length > 0 ? fields : this._getFallbackOcrTargetFields();
    },
    /**
     * Recursively collect mappable fields from an edit layout (handling nested
     * section children).
     * @param {Array} layout
     * @param {Array} out Accumulated TargetField set.
     * @private
     */
    _collectOcrTargetFields: function _collectOcrTargetFields(layout, out) {
      layout.forEach((row) => {
        if (!row) {
          return;
        }

        if (Array.isArray(row.children)) {
          this._collectOcrTargetFields(row.children, out);
          return;
        }

        // Expand a composite address field into indented sub-fields derived
        // from its address edit view (Address1/2, City, State, PostalCode,
        // Country), grouped so the mapping view can present them as a section.
        if (row.type === 'address') {
          this._collectAddressTargetFields(row, out);
          return;
        }

        if (row.property && row.type && this.ocrMappableFieldTypes[row.type]) {
          const field = {
            name: row.name || row.property,
            label: row.label || row.name || row.property,
            property: row.property,
            maxTextLength: (typeof row.maxTextLength === 'number' && row.maxTextLength > 0)
              ? row.maxTextLength
              : this.ocrDefaultMaxTextLength,
          };

          // A composite name field stores its value as separate name parts
          // (FirstName/LastName), not the read-only formatted property, so flag
          // it for special handling when the entry is built.
          if (row.type === 'name') {
            field.nameField = true;
          }

          out.push(field);
        }
      });
    },
    /**
     * Expand a composite address edit field into individual, mappable address
     * sub-fields. Labels and max lengths are pulled from the referenced address
     * edit view's layout when available; each sub-field uses a dotted property
     * path (e.g. `Address.City`) and shares a `group` so the mapping view can
     * render them under an indented address section.
     * @param {Object} addressRow The `type: 'address'` edit-layout field.
     * @param {Array} out Accumulated TargetField set.
     * @private
     */
    _collectAddressTargetFields: function _collectAddressTargetFields(addressRow, out) {
      const wanted = ['Address1', 'Address2', 'City', 'State', 'PostalCode', 'Country'];
      const groupLabel = addressRow.label || this.addressText || 'Address';
      const subView = addressRow.view ? App.getView(addressRow.view) : null;
      const subLayout = (subView && typeof subView.createLayout === 'function')
        ? subView.createLayout()
        : [];

      const byProperty = {};
      this._indexLayoutByProperty(Array.isArray(subLayout) ? subLayout : [], byProperty);

      wanted.forEach((prop) => {
        const def = byProperty[prop];

        out.push({
          name: `${addressRow.property}.${prop}`,
          label: (def && def.label) || prop,
          property: `${addressRow.property}.${prop}`,
          maxTextLength: (def && typeof def.maxTextLength === 'number' && def.maxTextLength > 0)
            ? def.maxTextLength
            : this.ocrDefaultMaxTextLength,
          group: groupLabel,
          // Defaults applied to the address child object when it is built, so a
          // mapped address lands as a new primary address.
          childDefaults: { IsPrimary: true },
        });
      });
    },
    /**
     * Build a property -> field-definition index from an edit layout (handling
     * nested children), keeping the first definition seen for each property.
     * @param {Array} layout
     * @param {Object} map
     * @private
     */
    _indexLayoutByProperty: function _indexLayoutByProperty(layout, map) {
      layout.forEach((row) => {
        if (!row) {
          return;
        }

        if (Array.isArray(row.children)) {
          this._indexLayoutByProperty(row.children, map);
          return;
        }

        if (row.property && !map[row.property]) {
          map[row.property] = row;
        }
      });
    },
    /**
     * Static fallback used when the edit layout is unavailable.
     * @returns {Array}
     * @private
     */
    _getFallbackOcrTargetFields: function _getFallbackOcrTargetFields() {
      return [
        { name: 'Company', label: this.accountText, property: 'Company', maxTextLength: 128 },
        { name: 'Title', label: this.leadTitleText, property: 'Title', maxTextLength: 64 },
        { name: 'WorkPhone', label: this.workText, property: 'WorkPhone', maxTextLength: 32 },
        { name: 'Mobile', label: this.mobileText, property: 'Mobile', maxTextLength: 32 },
        { name: 'TollFree', label: this.tollFreeText, property: 'TollFree', maxTextLength: 32 },
        { name: 'WebAddress', label: this.webText, property: 'WebAddress', maxTextLength: 128 },
        { name: 'Interests', label: this.interestsText, property: 'Interests', maxTextLength: 128 },
        { name: 'Industry', label: this.industryText, property: 'Industry', maxTextLength: 64 },
        { name: 'SICCode', label: this.sicCodeText, property: 'SICCode', maxTextLength: 64 },
      ];
    },
    /**
     * Show a failure message with a retry action, keeping the user on the Lead
     * detail with the current Lead data unchanged (Req 2.5). Confirming the
     * dialog retries the activation flow.
     * @private
     */
    _handleOcrLaunchFailure: function _handleOcrLaunchFailure() {
      App.modal.createSimpleDialog({
        title: 'alert',
        content: this.ocrOpenFailedText,
        getContent: () => {
          return;
        },
        leftButton: 'cancel',
        rightButton: 'confirm',
      }).then(() => {
        // Retry the activation flow (Req 2.5).
        this.startOcrScan();
      });
    },
    formatPicklist: function formatPicklist(property) {
      return format.picklist(this.app.picklistService, this._model, property);
    },
    createLayout: function createLayout() {
      if (this.layout) {
        return this.layout;
      }

      const quickActions = [{
        name: 'CallWorkPhoneAction',
        property: 'WorkPhone',
        label: this.callWorkNumberText,
        action: 'callWorkPhone',
        iconClass: 'phone',
        disabled: this.checkWorkPhone,
        renderer: format.phone.bindDelegate(this, false),
      }, {
        name: 'CheckEmailAction',
        property: 'Email',
        label: this.sendEmailText,
        action: 'sendEmail',
        iconClass: 'mail',
        disabled: this.checkEmail,
      }, {
        name: 'ScheduleActivityAction',
        label: this.scheduleActivityText,
        action: 'scheduleActivity',
        iconClass: 'calendar',
        tpl: new Simplate([
          '{%: $.Company %} / {%: $.LeadNameLastFirst %}',
        ]),
      }, {
        name: 'AddNoteAction',
        property: 'LeadNameLastFirst',
        iconClass: 'quick-edit',
        label: this.addNoteText,
        action: 'addNote',
      }, {
        name: 'ViewAddressAction',
        property: 'Address',
        label: this.viewAddressText,
        action: 'viewAddress',
        iconClass: 'map-pin',
        disabled: this.checkAddress,
        renderer: format.address.bindDelegate(this, true, ' '),
      }];

      // Include the OCR quick action only while the OCR service is available
      // for the session; omit it once the feature is reported unavailable
      // (Requirements 1.4, 1.5, 2.1, 2.3).
      if (FeatureAvailability.isAvailable()) {
        quickActions.push({
          name: 'OCR_Quick_Action',
          label: this.ocrScanText,
          action: 'startOcrScan',
          iconClass: 'camera',
          tpl: new Simplate([
            '{%: $.Company %} / {%: $.LeadNameLastFirst %}',
          ]),
        });
      }

      this.layout = [{
        list: true,
        title: this.actionsText,
        cls: 'action-list',
        name: 'QuickActionsSection',
        children: quickActions,
      }, {
        title: this.detailsText,
        name: 'DetailsSection',
        children: [{
          label: this.nameText,
          name: 'LeadNameLastFirst',
          property: 'LeadNameLastFirst',
        }, {
          label: this.accountText,
          name: 'Company',
          property: 'Company',
        }, {
          label: this.leadTitleText,
          name: 'Title',
          property: 'Title',
          renderer: this.formatPicklist('Title'),
        }, {
          label: this.workText,
          name: 'WorkPhone',
          property: 'WorkPhone',
          renderer: format.phone,
        }, {
          label: this.mobileText,
          name: 'Mobile',
          property: 'Mobile',
          renderer: format.phone,
        }, {
          label: this.tollFreeText,
          name: 'TollFree',
          property: 'TollFree',
          renderer: format.phone,
        }, {
          label: this.leadSourceText,
          name: 'LeadSource.Description',
          property: 'LeadSource.Description',
        }, {
          label: this.webText,
          name: 'WebAddress',
          property: 'WebAddress',
          renderer: format.link,
        }, {
          label: this.interestsText,
          name: 'Interests',
          property: 'Interests',
        }, {
          label: this.industryText,
          name: 'Industry',
          property: 'Industry',
          renderer: this.formatPicklist('Industry'),
        }, {
          label: this.sicCodeText,
          name: 'SICCode',
          property: 'SICCode',
        }, {
          label: this.businessDescriptionText,
          name: 'BusinessDescription',
          property: 'BusinessDescription',
        }, {
          label: this.notesText,
          name: 'Notes',
          property: 'Notes',
        }, {
          label: this.ownerText,
          name: 'Owner.OwnerDescription',
          property: 'Owner.OwnerDescription',
        }],
      }, {
        list: true,
        title: this.relatedItemsText,
        name: 'RelatedItemsSection',
        children: [{
          name: 'ActivityRelated',
          label: this.relatedActivitiesText,
          view: 'activity_related',
          where: this.formatRelatedQuery.bindDelegate(this, 'LeadId eq "${0}"'),
        }, {
          name: 'HistoryRelated',
          label: this.relatedHistoriesText,
          where: this.formatRelatedQuery.bindDelegate(this, '(EntityId eq "${0}" and EntityType eq "Lead") and History.Type ne "atDatabaseChange"'),
          view: 'history_association_related',
          options: {
            orderBy: 'History.CreateDate desc',
          },
        }, {
          name: 'AttachmentRelated',
          label: this.relatedAttachmentText,
          where: this.formatRelatedQuery.bindDelegate(this, 'leadId eq "${0}"'), // must be lower case because of feed
          view: 'lead_attachment_related',
          title: this.relatedAttachmentTitleText,
          options: {
            orderBy: 'CreateDate desc',
          },
        }, {
          name: 'WorkflowInstances',
          label: this.relatedWorkflowInstancesText,
          where: function() { // eslint-disable-line
            return this.formatRelatedQuery(this.entry, 'EntityId eq "${0}" and EntityType eq "Lead"');
          },
          view: 'lead_workflow_instances_related',
          title: this.relatedWorkflowInstancesTitleText,
          options: {
            orderBy: 'CreateDate desc',
          },
        }],
      }];

      return this.layout;
    },
  });

  return __class;
});
