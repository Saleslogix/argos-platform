define("dashboard/ApplicationModule", [
  "dojo/_base/declare",
  "dojo/_base/lang",
  "argos/ApplicationModule",
  "crm/Application",
  "dashboard/Views/Dashboard",
], function (
  declare,
  lang,
  ApplicationModule,
  CRMApplication,
  DashboardView
) {

  const __class = declare("dashboard.ApplicationModule", [ApplicationModule], {
    loadViews: function loadViews() {
      this.inherited(loadViews, arguments);
      this.registerView(new DashboardView());
    },
    loadViewsDynamic: function loadViewsDynamic() {
      this.inherited(loadViewsDynamic, arguments);
    },
    loadCustomizations: function loadCustomizations() {
      this.inherited(loadCustomizations, arguments);
      this.exampleDashboard();
    },
    /**
     * Dashboard view
     */
    exampleDashboard: function exampleDashboard() {
      localStorage.setItem("slx-theme-color", "amethyst");
      localStorage.setItem("slx-theme-mode", "light");

      var originalDefViews = CRMApplication.prototype.getDefaultViews;
      lang.extend(CRMApplication, {
        getDefaultViews: function () {
          //Get view array from original function, or default to empty array
          var views = originalDefViews.apply(this, arguments) || [];
          //Add custom view(s)
          console.log("Adding custom view: dashboard_view");
          views.push("dashboard_view");
          return views;
        },
      });
    },
    loadCustomizationsDynamic: function loadCustomizationsDynamic() {
      this.inherited(loadCustomizationsDynamic, arguments);
    },
  });

  return __class;
});
