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

define('crm/Views/Login', [
  'dojo/_base/declare',
  'argos/Edit',
  'argos/I18n',
], (declare, Edit, getResource) => {
  const resource = getResource('login');

  const __class = declare('crm.Views.Login', [Edit], {
    // Templates
    widgetTemplate: new Simplate([`
        <div id="{%= $.id %}" data-title="{%: $.titleText %}" class="view">
          <div class="wrapper">
            <section class="signin" role="main">
              <svg viewBox="0 0 34 34" class="icon icon-logo" focusable="false" aria-hidden="true" role="presentation" aria-label="Infor Logo">
                <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-logo"></use>
              </svg>
              <h1>Infor CRM SLX</h1>
              <form data-dojo-attach-point="loginFormNode" data-dojo-attach-event="onsubmit: _onSubmit" autocomplete="on" novalidate>
                <div class="panel-content" data-dojo-attach-event="onkeyup: _onKeyUp" data-dojo-attach-point="contentNode">
                </div>
                <div class="login-button-container">
                  <button type="submit" data-dojo-attach-point="loginButton" class="btn-primary hide-focus">{%: $.logOnText %}</button>
                </div>
              </form>
            </section>
          </div>
        </div>
      `,
    ]),

    id: 'login',
    busy: false,
    submitProbeTimeout: 10000,
    multiColumnView: false,
    // Localization
    copyrightText: resource.copyrightText,
    logOnText: resource.logOnText,
    passText: resource.passText,
    rememberText: resource.rememberText,
    titleText: resource.titleText,
    userText: resource.userText,
    serverUrlText: resource.serverUrlText,
    invalidServerUrlText: resource.invalidServerUrlText,
    serverUnreachableText: resource.serverUnreachableText,
    serverHostNotFoundText: resource.serverHostNotFoundText,
    serverRefusedText: resource.serverRefusedText,
    serverCertificateText: resource.serverCertificateText,
    serverNotSDataText: resource.serverNotSDataText,
    serverTimeoutText: resource.serverTimeoutText,
    serverNoNetworkText: resource.serverNoNetworkText,
    serverCorsText: resource.serverCorsText,
    signInTimeoutText: resource.signInTimeoutText,
    invalidUserText: resource.invalidUserText,
    missingUserText: resource.missingUserText,
    requestAbortedText: resource.requestAbortedText,
    passwordExpiredText: resource.passwordExpiredText,
    logoText: resource.logoText,
    errorText: {
      general: resource.logOnError,
      status: {},
    },
    _onSubmit: function _onSubmit(evt) {
      // This is a SPA that authenticates by sending Basic auth on every request;
      // there is no server login endpoint to POST to. We wrap the fields in a
      // real <form> and intercept its submit purely so the browser's password
      // manager recognizes a genuine login and offers to save/update the
      // password. We then drive our own XHR-based authentication and prevent the
      // native navigation. Submitting via the form also handles the Enter key.
      if (evt && evt.preventDefault) {
        evt.preventDefault();
      }
      this.authenticate();
      return false;
    },
    _applyPasswordManagerHints: function _applyPasswordManagerHints() {
      // Tag the inputs with the standard autocomplete tokens so the browser's
      // password manager can associate them and autofill the password. This is
      // what securely repopulates the password on return, replacing the old
      // (insecure) practice of persisting it in localStorage.
      const userField = this.fields['username-display'];
      const passField = this.fields['password-display'];
      if (userField && userField.inputNode) {
        userField.inputNode.setAttribute('autocomplete', 'username');
      }
      if (passField && passField.inputNode) {
        passField.inputNode.setAttribute('autocomplete', 'current-password');
      }
    },
    _onKeyUp: function _onKeyUp() {
      const username = this.fields['username-display'].getValue();
      if (username && username.length > 0) {
        $(this.domNode).addClass('login-active');
      } else {
        $(this.domNode).removeClass('login-active');
      }
    },
    initSoho: function initSoho() {
      const header = $('.header', App.getContainerNode());
      header.hide();
    },
    show: function show() {
      this.inherited(show, arguments);

      this._applyPasswordManagerHints();

      if (!this.connectionState) {
        this._disable();
      }

      if (App.enableRememberMe !== true) {
        this.fields.remember.disable();
        this.fields.remember.hide();
      }
    },
    _disable: function _disable() {
      this.fields['username-display'].disable();
      this.fields['password-display'].disable();
      this.fields.remember.disable();
      this.loginButton.disabled = true;
    },
    _enable: function _enable() {
      this.fields['username-display'].enable();
      this.fields['password-display'].enable();
      this.fields.remember.enable();
      this.loginButton.disabled = false;
    },
    _updateConnectionState: function _updateConnectionState(online) {
      this.inherited(_updateConnectionState, arguments);
      if (online) {
        this._enable();
      } else {
        this._disable();
      }
    },
    onShow: function onShow() {
      // "Remember me" now persists only the username. Prefill it and let the
      // browser's password manager autofill the password field.
      const credentials = App.getCredentials();
      const username = credentials && credentials.username;

      if (username) {
        this.fields['username-display'].setValue(username);
        this.fields.remember.setValue(true);
        $(this.domNode).addClass('login-active');
      }
    },
    refresh: function refresh() {
      // Edit.refresh clears every field, so prefill the server URL afterwards.
      this.inherited(refresh, arguments);
      if (this.fields.serverUrl) {
        this.fields.serverUrl.setValue(this.getServerUrl());
      }
    },
    // Server URL field: only shown when the config sets enableServerUrl (the Capacitor build),
    // because a bundled app can't reach SData same-origin.
    // ponytail: temporary; replace with a proper connection settings screen if this sticks.
    getServerUrl: function getServerUrl() {
      try {
        const saved = window.localStorage && window.localStorage.getItem('serverUrl');
        if (saved) {
          return saved;
        }
      } catch (e) {} // eslint-disable-line
      const service = App.getService();
      const port = service.getPort();
      return `${service.getProtocol() || 'http'}://${service.getServerName()}${port ? `:${port}` : ''}/${service.getVirtualDirectory()}`;
    },
    parseServerUrl: function parseServerUrl(value) {
      let url;
      try {
        url = new URL(value);
      } catch (e) {
        return null;
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }
      return {
        protocol: url.protocol.slice(0, -1),
        serverName: url.hostname,
        port: url.port || false,
        virtualDirectory: url.pathname.replace(/^\/+|\/+$/g, '') || 'sdata',
      };
    },
    applyServerUrl: function applyServerUrl(value) {
      const parsed = this.parseServerUrl(value);
      new Set([App.getService(), App.getConnection()]).forEach((service) => {
        service.setProtocol(parsed.protocol)
          .setServerName(parsed.serverName)
          .setPort(parsed.port)
          .setVirtualDirectory(parsed.virtualDirectory);
      });
      try {
        window.localStorage.setItem('serverUrl', value);
      } catch (e) {} // eslint-disable-line
    },
    _showServerUrlError: function _showServerUrlError(message) {
      const field = this.fields.serverUrl;
      this._probeErrorShown = false;
      $(field.containerNode).toggleClass('row-error', !!message);
      field.inputNode.setAttribute('aria-invalid', message ? 'true' : 'false');
      $('.error-message', field.containerNode).remove();
      if (message) {
        $('<p class="error-message" role="alert"></p>').text(message).appendTo(field.containerNode);
      }
    },
    // result comes from App.probeServer, which only the Capacitor config defines.
    serverProbeErrorText: function serverProbeErrorText(result) {
      const reasons = {
        hostNotFound: this.serverHostNotFoundText,
        refused: this.serverRefusedText,
        certificate: this.serverCertificateText,
        notSData: this.serverNotSDataText,
        timeout: this.serverTimeoutText,
        noNetwork: this.serverNoNetworkText,
      };
      const reason = result && reasons[result.reason];
      return reason ? `${this.serverUnreachableText} ${reason}` : this.serverUnreachableText;
    },
    // A falsy result clears the field error, but only one this method set (not e.g. invalidServerUrlText).
    showServerProbeError: function showServerProbeError(result) {
      if (!this.fields || !this.fields.serverUrl) {
        return;
      }
      if (result) {
        this._showServerUrlError(this.serverProbeErrorText(result));
        this._probeErrorShown = true;
      } else if (this._probeErrorShown) {
        this._showServerUrlError(false);
      }
    },
    _isLastGoodServerUrl: function _isLastGoodServerUrl(url) {
      const trim = u => (u || '').replace(/\/+$/, '');
      try {
        const lastGood = window.localStorage.getItem('lastGoodServerUrl');
        return !!lastGood && trim(lastGood) === trim(url);
      } catch (e) {
        return false;
      }
    },
    createToolLayout: function createToolLayout() {
      return this.tools || (this.tools = {
        bbar: false,
        tbar: false,
      });
    },
    getContext: function getContext() {
      return {
        id: this.id,
      };
    },
    createLayout: function createLayout() {
      return this.layout || (this.layout = [...(App.enableServerUrl ? [{
        name: 'serverUrl',
        label: this.serverUrlText,
        type: 'text',
        inputType: 'url',
        required: true,
      }] : []), {
        name: 'username-display',
        label: this.userText,
        type: 'text',
        required: true,
      }, {
        name: 'password-display',
        label: this.passText,
        type: 'text',
        inputType: 'password',
        required: true,
      }, {
        name: 'remember',
        label: this.rememberText,
        type: 'boolean',
      }]);
    },
    authenticate: function authenticate() {
      if (this.busy) {
        return;
      }

      const values = this.getValues(true);
      const credentials = {
        username: values['username-display'],
        password: values['password-display'],
        remember: values.remember,
      };
      const proceed = (probedOnline) => {
        if (credentials.username) {
          this.validateCredentials(credentials, probedOnline);
        }
      };

      if (this.fields.serverUrl) {
        const serverUrl = (values.serverUrl || '').trim();
        if (!this.parseServerUrl(serverUrl)) {
          this._showServerUrlError(this.invalidServerUrlText);
          return;
        }
        this._showServerUrlError(false);
        this.applyServerUrl(serverUrl);

        // Capacitor only (App.probeServer comes from its config): check a URL that never worked before
        // signing in, so a bad URL gets a field error instead of a generic sign-in failure.
        if (typeof App.probeServer === 'function' && !this._isLastGoodServerUrl(serverUrl)) {
          // Same busy cue as validateCredentials. Re-enabled before proceed(), which disables again
          // synchronously when it signs in (no repaint in between) and leaves the form usable when it doesn't.
          this.disable();
          // Longer budget than the background ping: the first request after an IIS app pool idles can take seconds.
          return App.probeServer(serverUrl, this.submitProbeTimeout).then((result) => {
            this.enable();
            if (result.kind !== 'online') {
              this.showServerProbeError(result);
              return;
            }
            proceed(true);
          }, () => {
            this.enable();
            proceed(); // a probe bug must not block sign-in
          });
        }
      }

      proceed();
    },
    createErrorHandlers: function createErrorHandlers() {
      this.errorText.status[this.HTTP_STATUS.FORBIDDEN] = this.invalidUserText;

      this.errorHandlers = [{
        name: 'NoResponse',
        test: function testNoResponse(error) {
          return !error.xhr;
        },
        handle: function handleNoResponse(error, next) {
          alert(this.missingUserText);// eslint-disable-line
          next();
        },
      }, {
        name: 'PasswordExpired',
        test: function testExpiredPassword(error) {
          const xhr = error && error.xhr;
          if (!xhr) {
            return false;
          }

          try {
            const json = JSON.parse(xhr.responseText)[0];
            const stackTrace = json.stackTrace || '';
            return stackTrace.indexOf('Sage.SalesLogix.User.Rules.IsValidPassword') > -1;
          } catch (_) {
            return false;
          }
        },
        handle: function handleExpiredPassword() {
          alert(this.passwordExpiredText);// eslint-disable-line
        },
      }, {
        name: 'MfaRequired',
        test: function testMfaRequired(error) {
          const xhr = error && error.xhr;
          if (!xhr || !xhr.responseText) {
            return false;
          }

          try {
            const json = JSON.parse(xhr.responseText);
            const diagnoses = json.$diagnoses || json.diagnoses;
            if (!Array.isArray(diagnoses)) {
              return false;
            }
            return diagnoses.some((d) => {
              return d.sdataCode === 'MfaRequired';
            });
          } catch (_) {
            return false;
          }
        },
        handle: function handleMfaRequired() {
          // Store credentials for post-MFA authentication
          // The global MFA interceptor will handle starting the flow
          const values = this.getValues(true);
          const credentials = {
            username: values['username-display'],
            password: values['password-display'],
            remember: values.remember,
          };

          App.mfaCoordinator.loginCredentials = credentials;
          // Don't call next() - let the interceptor handle the MFA flow
        },
      }, {
        name: 'GeneralError',
        test: function testError(error) {
          return typeof error.xhr !== 'undefined' && error.xhr !== null;
        },
        handle: function handleError(error, next) {
          alert(this.getErrorMessage(error));// eslint-disable-line
          next();
        },
      }];

      return this.errorHandlers;
    },
    validateCredentials: function validateCredentials(credentials, probedOnline) {
      this.busy = true;
      this.disable();

      // Store credentials in coordinator for potential MFA flow
      // This ensures they're available if MFA is required
      if (App.mfaCoordinator) {
        App.mfaCoordinator.loginCredentials = credentials;
      }

      App.authenticateUser(credentials, {
        success: function success() {
          this.busy = false;
          if (this.fields.serverUrl) {
            // A URL that signed in once is treated as offline/down (not misconfigured) when it later can't be reached.
            try {
              window.localStorage.setItem('lastGoodServerUrl', this.getServerUrl());
            } catch (e) {} // eslint-disable-line
          }
          // Need to remove Login view from pagejs stack
          page.len--;
          if (this.fields.remember.getValue() !== true) {
            this.fields['username-display'].setValue('');
            this.fields['password-display'].setValue('');
          }
          this.enable();

          const attr = this.domNode.attributes.getNamedItem('selected');
          if (attr) {
            attr.value = 'false';
          }
          App.onHandleAuthenticationSuccess();
        },
        failure: function failure(result) {
          this.busy = false;
          this.enable();
          const status = result && result.response && result.response.status;
          // Capacitor only: a field error instead of the generic alert for a timeout, or for a blocked request
          // (status 0 / no response) to a server the probe just found online, which is almost always CORS.
          if (this.fields.serverUrl && typeof App.probeServer === 'function') {
            if (result && result.timeout) {
              this._showServerUrlError(this.signInTimeoutText);
              return;
            }
            if (probedOnline && !status) {
              this._showServerUrlError(this.serverCorsText);
              return;
            }
          }
          const error = new Error();
          error.status = result && result.response && result.response.status;
          error.xhr = result && result.response;
          this.handleError(error);
        },
        aborted: function aborted() {
          this.busy = false;
          this.enable();
          alert(this.requestAbortedText);// eslint-disable-line
        },
        scope: this,
      });
    },
  });

  return __class;
});
