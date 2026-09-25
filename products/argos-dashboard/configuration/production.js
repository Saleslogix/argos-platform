define('configuration/dashboard/production', ['configuration/production', 'dashboard/ApplicationModule'], function(baseConfiguration, DashboardApplicationModule) {
    baseConfiguration.modules.push(new DashboardApplicationModule());
    return baseConfiguration;
});