define("dashboard/Views/Dashboard", [
  "dojo/_base/declare",
  "argos/View",
], function (declare, View) {
  return declare([View], {
    id: "dashboard_view",
    titleText: "Dashboard",
    expose: true,
    widgetTemplate: new Simplate([
      '<div id="{%= $.id %}" data-title="{%= $.titleText %}" class="list list-hide-search {%= $.cls %}" style="font-size: 16px;">',
      '<div class="overthrow scroller" data-dojo-attach-point="scrollerNode">',
      '<div class="content" data-dojo-attach-point="contentNode"></div>',
      "</div>",
      "</div>",
    ]),
    onTransitionTo: async function onTransitionTo() {
      const root = this.contentNode;

      // First, initialize i18n
      const { initializeI18n } = await import(
        `../../dashboard/slx-dashboard.i18n.js`
      );
      await initializeI18n();

      // Import default widgets and the widget loader.
      // This MUST be imported asynchronously. If a regular import is used, the widgets will load
      // before i18n is initialized, and the widgets will not be translated.
      const { registerCustomWidgets, onRegistryReady } = await import(
        "../../dashboard/slx-dashboard.WidgetLoader.js"
      );

      onRegistryReady(async (Registry, ComponentTypes) => {
        // Render the main application after custom widgets are registered
        const { render } = await import(
          "../../dashboard/slx-dashboard.index.js"
        );

        const uri = window.App.services.crm.getUri();
        const port = uri.port ? `:${uri.port}` : '';
        const protocol = uri.scheme || 'http';
        window.appConfig.backend_url = `${protocol}://${uri.host}${port}/${uri.server}`;

        const app = window.App;
        const headers = app.services.crm.createHeadersForRequest() || {};

        // createHeadersForRequest only emits Basic Auth headers (and only when a
        // userName is set on a non-credentialed request). When the host app is
        // running the Mingle OAuth2 flow there is no userName, so no Authorization
        // header gets added and the dashboard's requests go out unauthenticated.
        // Mirror what argos-saleslogix does in its executeRequest patch and attach
        // the Bearer token explicitly.
        if (app.isMingleEnabled && app.isMingleEnabled()) {
          const accessToken =
            app.mingleAuthResults && app.mingleAuthResults.access_token;
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
            headers['X-Authorization'] = `Bearer ${accessToken}`;
          }
        }

        render(root, headers);
      });

      // Register any default widgets and emit the ready event
      await registerCustomWidgets();
    },
  });
});
