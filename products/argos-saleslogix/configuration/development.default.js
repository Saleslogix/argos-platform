/* eslint-disable */
define('configuration/development.default', [
  'crm/ApplicationModule',
  'crm/Integrations/ActivityAssociations/ApplicationModule',
  'crm/Integrations/BOE/ApplicationModule',
  'crm/Integrations/Contour/ApplicationModule',
], function cb(ApplicationModule, ActivityAssociationsModule, BOEApplicationModule, ContourApplicationModule) {
  return {
    modules: [
      new ApplicationModule(),
      new ActivityAssociationsModule(),
      new BOEApplicationModule({
        enableDashboards: true,
      }),
      new ContourApplicationModule(),
    ],
    connections: {
      'crm': {
        isDefault: true,
        offline: true,
        url: 'http://localhost:8000/sdata/slx/dynamic/-/',
        timeout: 30000,
        compact: true,
        json: true,
        useCredentialedRequest: false, // Change to true for windows auth
      },
    },
    enableMultiCurrency: false,
    enableGroups: true,
    enableHashTags: true,
    maxUploadFileSize: 40000000,
    enableConcurrencyCheck: false,
    enableOfflineSupport: false,
    enableServiceWorker: false,
    enableMingle: false,
    warehouseDiscovery: 'auto',
    mingleSettings: {
        "ti": "ICRMMIG2_TST",
        "cn": "CRM Mobile",
        "ci": "ICRMMIG2_TST~XOVG6ovrohVO4nu-LX7RcevsF6XDjhPw587iDkEKDHE",
        "iu": "https://mingleinteg01-ionapi.mingledev.infor.com",
        "pu": "https://mingleinteg01-sso.mingledev.infor.com/ICRMMIG2_TST/as/",
        "oa": "authorization.oauth2", "ot": "token.oauth2", "or": "revoke_token.oauth2", "ev": "M1448056811"
    },
    mingleRedirectUrl: 'http://test.infor.com:8000/products/argos-saleslogix/index-dev.html',
    enableRememberMe: true,
    speedSearch: {
      includeStemming: true,
      includePhonic: false,
      includeThesaurus: false,
      useFrequentFilter: false,
      
      // searchType values:
      // 0 - Match on all words (AND)
      // 1 - Match on any words (OR)
      // 2 - Match the exact phrase
      // 3 - Boolean (AND, OR, NOT)
      // 4- Naturual language
      searchType: 0,
    }
  };
});
