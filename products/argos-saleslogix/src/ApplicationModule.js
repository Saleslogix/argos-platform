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

/**
* @module crm/ApplicationModule
*/

define('crm/ApplicationModule', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'argos/ApplicationModule',
  'argos/Calendar',
  'argos/RelatedViewManager',
  'argos/RelatedViewWidget',
  'argos/List',
  'argos/Views/Signature',
  'argos/SearchWidget',
  'argos/Views/FileSelect',
  './Views/AddAccountContact',
  './Views/AreaCategoryIssueLookup',
  './Views/AreaCategoryIssue/AreaLookup',
  './Views/AreaCategoryIssue/CategoryLookup',
  './Views/AreaCategoryIssue/IssueLookup',
  './Views/ExchangeRateLookup',
  './Views/MainToolbar',
  './Views/UpdateToolbar',
  './Views/LeftDrawer',
  './Views/RightDrawer',
  './Views/Offline/Detail',
  './Views/Offline/List',
  './Views/Login',
  './Views/LogOff',
  './Views/Settings',
  './Views/Configure',
  './Views/Help',
  './Views/NameEdit',
  './Views/PickList',
  './Views/SelectList',
  './Views/SpeedSearchList',
  './Views/TextEdit',
  './Views/Account/List',
  './Views/Account/Detail',
  './Views/Account/Edit',
  './Views/Address/List',
  './Views/Address/Edit',
  './Views/ActivityAttendee/List',
  './Views/ActivityAttendee/Detail',
  './Views/ActivityAttendee/Edit',
  './Views/ActivityAttendee/TypesList',
  './Views/Activity/List',
  './Views/Activity/MyDay',
  './Views/Activity/MyList',
  './Views/Activity/Detail',
  './Views/Activity/Edit',
  './Views/Activity/Complete',
  './Views/Activity/TypesList',
  './Views/Activity/Recurring',
  './Views/Calendar/CalendarView',
  './Views/Calendar/DayView',
  './Views/Calendar/MonthView',
  './Views/Calendar/WeekView',
  './Views/Charts/GenericBar',
  './Views/Charts/GenericLine',
  './Views/Charts/GenericPie',
  './Views/Competitor/List',
  './Views/Contact/List',
  './Views/Contact/Detail',
  './Views/Contact/Edit',
  './Views/Contract/List',
  './Views/ErrorLog/List',
  './Views/ErrorLog/Detail',
  './Views/Event/List',
  './Views/Event/Detail',
  './Views/Event/Edit',
  './Views/Groups/Selector',
  './Views/Lead/List',
  './Views/Lead/Detail',
  './Views/Lead/Edit',
  './Views/LeadSource/List',
  './Views/Opportunity/List',
  './Views/Opportunity/Detail',
  './Views/Opportunity/Edit',
  './Views/Opportunity/QuickEdit',
  './Views/OpportunityContact/List',
  './Views/OpportunityContact/Detail',
  './Views/OpportunityContact/Edit',
  './Views/OpportunityProduct/List',
  './Views/OpportunityProduct/Detail',
  './Views/OpportunityProduct/Edit',
  './Views/Owner/List',
  './Views/Product/List',
  './Views/ProductProgram/List',
  './Views/Ticket/List',
  './Views/Ticket/Detail',
  './Views/Ticket/Edit',
  './Views/Ticket/UrgencyLookup',
  './Views/TicketActivity/List',
  './Views/TicketActivity/Detail',
  './Views/TicketActivity/Edit',
  './Views/TicketActivity/RateLookup',
  './Views/TicketActivityItem/List',
  './Views/TicketActivityItem/Detail',
  './Views/History/List',
  './Views/History/ListOffline',
  './Views/History/Detail',
  './Views/History/Edit',
  './Views/History/EditOffline',
  './Views/HistoryAttendee/List',
  './Views/HistoryAttendee/Detail',
  './Views/History/RelatedView',
  './Views/User/CalendarAccessList',
  './Views/User/List',
  './Views/Attachment/ViewAttachment',
  './Views/Attachment/List',
  './Views/Attachment/AddAttachment',
  './Views/Attachment/MyAttachmentList',
  './Views/RecentlyViewed/List',
  './Views/Briefcase/List',
  './Views/OfflineOptions/Edit',
  './Views/LanguageOptions/Edit',
  'argos/I18n',
  './Models/Names',
  'argos/Models/Types',
  './Views/OfflineOptions/UsageWidget',
  './Views/LanguageOptions/UsageWidget',
  './Fields/AddressField',
  './Fields/MultiCurrencyField',
  './Fields/NameField',
  './Fields/PicklistField',
  './Fields/RecurrencesField',
  './Views/RelatedContextWidget',
  './Views/RelatedEditWidget',
  './Action',
  './Format',
  './Template',
  './Validator',
  './Environment',
  './Utility',
  './Models/Account/Offline',
  './Models/Account/SData',
  './Models/ActivityAttendee/Offline',
  './Models/ActivityAttendee/SData',
  './Models/Activity/Offline',
  './Models/Activity/SData',
  './Models/AreaCategoryIssue/SData',
  './Models/Contact/Offline',
  './Models/Contact/SData',
  './Models/Integration/SData',
  './Models/Lead/Offline',
  './Models/Lead/SData',
  './Models/LeadAddress/Offline',
  './Models/LeadAddress/SData',
  './Models/Opportunity/Offline',
  './Models/Opportunity/SData',
  './Models/OpportunityContact/Offline',
  './Models/OpportunityContact/SData',
  './Models/UserActivity/Offline',
  './Models/UserActivity/SData',
  './Models/Address/Offline',
  './Models/Address/SData',
  './Models/History/Offline',
  './Models/History/SData',
  './Models/HistoryAttendee/Offline',
  './Models/HistoryAttendee/SData',
  './Models/Ticket/Offline',
  './Models/Ticket/SData',
  './Models/TicketActivity/Offline',
  './Models/TicketActivity/SData',
  './Models/Authentication/Offline'
], function(declare, lang, ApplicationModule, Calendar, RelatedViewManager, RelatedViewWidget, List, Signature, SearchWidget, FileSelect, AddAccountContact, AreaCategoryIssueLookup, AreaLookup, CategoryLookup, IssueLookup, ExchangeRateLookup, MainToolbar, UpdateToolbar, LeftDrawer, RightDrawer, OfflineDetail, OfflineList, Login, LogOff, Settings, Configure, Help, NameEdit, PickList, SelectList, SpeedSearchList, TextEdit, AccountList, AccountDetail, AccountEdit, AddressList, AddressEdit, ActivityAttendeeList, ActivityAttendeeDetail, ActivityAttendeeEdit, ActivityAttendeeTypesList, ActivityList, MyDayList, MyActivityList, ActivityDetail, ActivityEdit, ActivityComplete, ActivityTypesList, ActivityRecurring, CalendarView, DayView, MonthView, WeekView, GenericBar, GenericLine, GenericPie, CompetitorList, ContactList, ContactDetail, ContactEdit, ContractList, ErrorLogList, ErrorLogDetail, EventList, EventDetail, EventEdit, GroupsSelector, LeadList, LeadDetail, LeadEdit, LeadSourceList, OpportunityList, OpportunityDetail, OpportunityEdit, OpportunityQuickEdit, OpportunityContactList, OpportunityContactDetail, OpportunityContactEdit, OpportunityProductList, OpportunityProductDetail, OpportunityProductEdit, OwnerList, ProductList, ProductProgramList, TicketList, TicketDetail, TicketEdit, TicketUrgencyLookup, TicketActivityList, TicketActivityDetail, TicketActivityEdit, TicketActivityRateLookup, TicketActivityItemList, TicketActivityItemDetail, HistoryList, HistoryListOffline, HistoryDetail, HistoryEdit, HistoryEditOffline, HistoryAttendeeList, HistoryAttendeeDetail, HistoryRelatedView, CalendarAccessList, UserList, ViewAttachment, AttachmentList, AddAttachment, MyAttachmentList, RecentlyViewedList, BriefcaseList, OfflineOptionsEdit, LanguageOptionsEdit, getResource, MODEL_NAMES, MODEL_TYPES, OfflineOptionsUsageWidget, LanguageOptionsUsageWidget, AddressField, MultiCurrencyField, NameField, PicklistField, RecurrencesField, RelatedContextWidget, RelatedEditWidget, Action, Format, Template, Validator, Environment, Utility, AccountModelOffline, AccountModelSData, ActivityAttendeeModelOffline, ActivityAttendeeModelSData, ActivityModelOffline, ActivityModelSData, AreaCategoryIssueModelSData, ContactModelOffline, ContactModelSData, IntegrationModelSData, LeadModelOffline, LeadModelSData, LeadAddressModelOffline, LeadAddressModelSData, OpportunityModelOffline, OpportunityModelSData, OpportunityContactModelOffline, OpportunityContactModelSData, UserActivityModelOffline, UserActivityModelSData, AddressModelOffline, AddressModelSData, HistoryModelOffline, HistoryModelSData, HistoryAttendeeModelOffline, HistoryAttendeeModelSData, TicketModelOffline, TicketModelSData, TicketActivityModelOffline, TicketActivityModelSData, AuthenticationModelOffline) {
  const resource = getResource('applicationModule');

  /**
   * @class
   * @alias module:crm/ApplicationModule
   * @extends module:argos/ApplicationModule
   */
  const __class = declare('crm.ApplicationModule', [ApplicationModule], /** @lends module:crm/ApplicationModule.prototype */{
    searchText: resource.searchText,
    loadCache: function loadCache() {
      /* index.aspx will cache everything under content/, help/, and localization/ automatically.
      * Add additional caches here if you need
      const app = this.application;
      app.registerCacheUrls([
        './folder1/file1.demo',
      ]);
      */
    },
    loadViews: function loadViews() {
      this.inherited(loadViews, arguments);

      this.registerView(new Calendar({
        expose: false,
      }));

      this.registerView(new Signature({
        expose: false,
      }));

      this.registerView(new Login());

      this.registerView(new LogOff());

      this.registerView(new LeftDrawer(), $('.application-menu', this.application.getContainerNode()).first().get(0), 'last');

      const modalBody = $('.modal-body', this.application.viewSettingsModal.element);
      this.registerView(new RightDrawer(), modalBody.first().get(0));

      this.registerView(new OfflineDetail({
        canRedirectTo: true,
      }));
      this.registerView(new OfflineList({
        expose: false,
        canRedirectTo: true,
      }));
      this.registerView(new RecentlyViewedList({
        expose: true,
        canRedirectTo: true,
      }));
      this.registerView(new RecentlyViewedList({
        id: 'recently_viewed_list_offline',
        expose: false,
        canRedirectTo: true,
      }));
      this.registerView(new BriefcaseList({
        expose: true,
        canRedirectTo: true,
      }));
      this.registerView(new Help({
        canRedirectTo: true,
      }));
      this.registerView(new Settings({
        canRedirectTo: true,
      }));
      this.registerView(new Configure());
      this.registerView(new PickList());
      this.registerView(new SelectList());
      this.registerView(new SpeedSearchList());
      this.registerView(new AddAccountContact());
      this.registerView(new AreaCategoryIssueLookup());
      this.registerView(new AreaLookup());
      this.registerView(new CategoryLookup());
      this.registerView(new IssueLookup());
      this.registerView(new ExchangeRateLookup());
      this.registerView(new FileSelect());

      this.registerView(new NameEdit());
      this.registerView(new TextEdit());
      this.registerView(new AddressList({
        id: 'address_related',
        expose: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));
      this.registerView(new AddressEdit());

      this.registerView(new AccountList({
        canRedirectTo: true,
      }));
      this.registerView(new AccountDetail({
        canRedirectTo: true,
      }));
      this.registerView(new AccountEdit());
      this.registerView(new AccountList({
        id: 'account_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: function defaultSearchTerm() {
          return '';
        },
      }));

      this.registerView(new CalendarView());
      this.registerView(new DayView());
      this.registerView(new MonthView());
      this.registerView(new WeekView());

      // Charts
      this.registerView(new GenericBar({
        expose: false,
      }));
      this.registerView(new GenericLine({
        expose: false,
      }));
      this.registerView(new GenericPie({
        expose: false,
      }));

      this.registerView(new CompetitorList({
        id: 'competitor_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new ContactList({
        canRedirectTo: true,
      }));
      this.registerView(new ContactDetail({
        canRedirectTo: true,
      }));
      this.registerView(new ContactEdit());
      this.registerView(new ContactList({
        id: 'contact_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new ContractList({
        id: 'contract_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new ErrorLogList({
        canRedirectTo: true,
      }));
      this.registerView(new ErrorLogDetail({
        canRedirectTo: true,
      }));

      this.registerView(new EventEdit());
      this.registerView(new EventList({
        expose: false,
      }));
      this.registerView(new EventDetail());
      this.registerView(new EventList({
        id: 'event_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new GroupsSelector());

      this.registerView(new OpportunityEdit());
      this.registerView(new OpportunityQuickEdit());
      this.registerView(new OpportunityList({
        canRedirectTo: true,
      }));
      this.registerView(new OpportunityDetail({
        canRedirectTo: true,
      }));
      this.registerView(new OpportunityList({
        id: 'opportunity_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new OpportunityContactEdit());
      this.registerView(new OpportunityContactList());
      this.registerView(new OpportunityContactDetail());
      this.registerView(new OpportunityContactList({
        id: 'opportunitycontact_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new OpportunityProductList({
        id: 'opportunityproduct_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new OpportunityProductDetail({
        id: 'opportunityproduct_detail',
        expose: false,
      }));

      this.registerView(new OpportunityProductEdit({
        id: 'opportunityproduct_edit',
        expose: false,
      }));

      this.registerView(new LeadEdit());
      this.registerView(new LeadList({
        canRedirectTo: true,
      }));
      this.registerView(new LeadDetail({
        canRedirectTo: true,
      }));
      this.registerView(new LeadList({
        id: 'lead_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new TicketList({
        canRedirectTo: true,
      }));
      this.registerView(new TicketDetail({
        canRedirectTo: true,
      }));
      this.registerView(new TicketEdit());
      this.registerView(new TicketList({
        id: 'ticket_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new TicketActivityList());
      this.registerView(new TicketActivityDetail());
      this.registerView(new TicketActivityEdit());
      this.registerView(new TicketActivityRateLookup());
      this.registerView(new TicketActivityList({
        id: 'ticketactivity_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new TicketActivityItemList());
      this.registerView(new TicketActivityItemDetail());
      this.registerView(new TicketActivityItemList({
        id: 'ticketactivityitem_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new ActivityAttendeeList({
        id: 'activity_attendee_related',
        expose: false,
      }));
      this.registerView(new ActivityAttendeeDetail());
      this.registerView(new ActivityAttendeeEdit());
      this.registerView(new ActivityAttendeeTypesList());

      this.registerView(new ActivityDetail({
        canRedirectTo: true,
      }));
      this.registerView(new ActivityEdit());
      this.registerView(new ActivityComplete());
      this.registerView(new ActivityTypesList());
      this.registerView(new ActivityList({
        id: 'activity_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new MyDayList());
      this.registerView(new MyActivityList());
      this.registerView(new ActivityRecurring());

      this.registerView(new HistoryDetail());
      this.registerView(new HistoryList());
      this.registerView(new HistoryListOffline());
      this.registerView(new HistoryEdit());
      this.registerView(new HistoryEditOffline());
      this.registerView(new HistoryList({
        id: 'history_related',
        expose: false,
        groupsEnabled: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));
      this.registerView(new HistoryAttendeeList({
        id: 'history_attendee_related',
        expose: false,
      }));
      this.registerView(new HistoryAttendeeDetail());

      this.registerView(new CalendarAccessList({
        expose: false,
      }));

      this.registerView(new UserList({
        expose: false,
      }));

      this.registerView(new OwnerList({
        expose: false,
      }));

      this.registerView(new ProductList({
        id: 'product_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new ProductProgramList({
        id: 'productprogram_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));

      this.registerView(new LeadSourceList({
        expose: false,
      }));

      this.registerView(new TicketUrgencyLookup({
        expose: false,
      }));

      this.registerView(new ViewAttachment());
      this.registerView(new AddAttachment());
      this.registerView(new MyAttachmentList());
      this.registerView(new AttachmentList({
        id: 'account_attachment_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));
      this.registerView(new AttachmentList({
        id: 'contact_attachment_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));
      this.registerView(new AttachmentList({
        id: 'lead_attachment_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));
      this.registerView(new AttachmentList({
        id: 'ticket_attachment_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));
      this.registerView(new AttachmentList({
        id: 'opportunity_attachment_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));
      this.registerView(new AttachmentList({
        id: 'activity_attachment_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));
      this.registerView(new AttachmentList({
        id: 'history_attachment_related',
        expose: false,
        defaultSearchTerm: () => {
          return '';
        },
      }));
      this.registerView(new OfflineOptionsEdit({
        expose: false,
      }));
      this.registerView(new LanguageOptionsEdit({
        expose: false,
      }));
    },
    loadToolbars: function loadToolbars() {
      this.inherited(loadToolbars, arguments);

      this.registerToolbar(new MainToolbar({
        name: 'tbar',
      }));

      this.registerToolbar(new UpdateToolbar({
        name: 'updatebar',
      }));
    },
    loadCustomizations: function loadCustomizations() {
      this.loadBaseCustomizations();
    },
    loadBaseCustomizations: function loadBaseCustomizations() {
      lang.extend(List, {
        expose: true,
        getSecurity: function getSecurity() {
          return (this.expose && this.security); // only check security on exposed views
        },
      });

      lang.extend(SearchWidget, {
        searchText: this.searchText,
      });
    },
    /**
     * @deprecated typo, use loadAppStatePromises instead.
     */
    loadAppStatPromises: function loadAppStatPromises() {
      // Redirect to the typo fix.
      this.loadAppStatePromises();
    },
    loadAppStatePromises: function loadAppStatePromises() {
      this.registerAppStatePromise({
        seq: 1,
        description: resource.userContextAndOptionsText,
        items: [{
          name: 'user_detail',
          description: resource.userInformationText,
          fn: () => App.requestUserDetails(),
        }, {
          name: 'user_options',
          description: resource.userOptionsText,
          fn: () => App.requestUserOptions(),
        }, {
          name: 'system_options',
          description: resource.systemOptionsText,
          fn: () => App.requestSystemOptions(),
        }, {
          name: 'integrations',
          description: resource.integrationsText,
          fn: () => {
            const model = this.application.ModelManager.getModel(MODEL_NAMES.INTEGRATION, MODEL_TYPES.SDATA);
            return model.getEntries(null, { contractName: 'dynamic' }).then((results) => {
              this.application.context.integrations = results;
              if (results) {
                results.forEach((integration) => {
                  App.requestIntegrationSettings(integration.$descriptor);
                });
              }
              return results;
            });
          },
        }, {
          name: 'distinct_areacategoryissues',
          fn: () => App.requestAreaCategoryIssueServices(),
        }],
      });
    },
  });

  return __class;
});
