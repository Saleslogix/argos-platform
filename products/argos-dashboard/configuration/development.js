define('configuration/dashboard/development', ['configuration/development', 'dashboard/ApplicationModule'], function(baseConfiguration, DashboardApplicationModule) {
    baseConfiguration.modules.push(new DashboardApplicationModule());
    return baseConfiguration;
});