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

/**
 * @module crm/MFA/Views/DeviceList
 */
define('crm/MFA/Views/DeviceList', [
  'dojo/_base/declare',
  'argos/_ListBase',
  'argos/I18n',
  '../Service',
], (declare, _ListBase, getResource, MFAService) => {
  const resource = getResource('mfaDeviceList');
  const deviceTypeResource = getResource('mfaDeviceTypes');
  const errorResource = getResource('mfaErrors');
  const messageResource = getResource('mfaMessages');

  /**
   * @class
   * @alias module:crm/MFA/Views/DeviceList
   * @classdesc Device List View displays available MFA devices for selection.
   * Supports auto-selection for single device and routing to setup if no devices exist.
   */
  const __class = declare('crm.MFA.Views.DeviceList', [_ListBase], {
    // View configuration
    id: 'mfa_device_list',
    titleText: resource.titleText,

    // Localization
    authenticatorAppText: deviceTypeResource.authAppText,
    emailText: deviceTypeResource.emailText,
    defaultBadgeText: resource.defaultBadgeText,
    noDevicesText: resource.noDevicesText,
    loadingText: messageResource.loadingDevicesText,
    errorLoadingText: errorResource.networkErrorText,
    cancelText: resource.cancelText,

    // List configuration
    enableSearch: false,
    enableActions: false,
    allowSelection: false,
    isCardView: true,
    pageSize: 100, // Load all devices at once

    // Internal state
    _coordinator: null,
    _mfaService: null,
    _devices: null,
    _dataRequested: false, // Flag to prevent double fetch

    /**
     * Item template for device list
     */
    itemTemplate: new Simplate([
      '<div class="mfa-device-item">',
      '<div class="mfa-device-icon">',
      '<svg class="icon" focusable="false" aria-hidden="true" role="presentation">',
      '<use xlink:href="#icon-{%= $.getDeviceIconName($) %}"></use>',
      '</svg>',
      '</div>',
      '<div class="mfa-device-info">',
      '<h3 class="mfa-device-description">{%: $.description %}</h3>',
      '<p class="mfa-device-type">{%= $.getDeviceTypeText($) %}</p>',
      '</div>',
      '{% if ($.isDefault) { %}',
      '<div class="mfa-device-badge">',
      '<span class="badge">{%= $.defaultBadgeText %}</span>',
      '</div>',
      '{% } %}',
      '</div>',
    ]),

    /**
     * Initialize the view
     */
    postCreate: function postCreate() {
      this.inherited(postCreate, arguments);

      // Initialize MFA service
      const sdataService = this.app.getService();
      this._mfaService = new MFAService(sdataService);
    },

    /**
     * Show the view with options
     * @param {Object} options - View options
     * @param {Object} options.coordinator - MFA coordinator instance
     */
    show: function show(options) {
      this.inherited(show, arguments);

      // Reset data requested flag for fresh fetch
      this._dataRequested = false;

      // Store coordinator reference
      if (options && options.coordinator) {
        this._coordinator = options.coordinator;
      }

      // Request device data
      this.requestData();
    },

    /**
     * Fetch user's MFA devices
     */
    requestData: function requestData() {
      // Prevent double fetch
      if (this._dataRequested) {
        return;
      }
      this._dataRequested = true;

      // Show loading indicator
      this.set('listContent', this.loadingTemplate.apply({ loadingText: this.loadingText }, this));

      // Call MFA service to get devices
      this._mfaService.getDevices()
        .then((response) => {
          this._handleDevicesResponse(response);
        })
        .catch((error) => {
          this._handleDevicesError(error);
        });
    },

    /**
     * Handle successful devices response
     * @param {Object} response - Response from devices endpoint
     * @private
     */
    _handleDevicesResponse: function _handleDevicesResponse(response) {
      // Extract devices from $resources array
      const devices = response.$resources || [];

      // Store devices
      this._devices = devices;

      // Handle different scenarios
      if (devices.length === 0) {
        // No devices - redirect to setup
        this.handleNoDevices();
      } else if (devices.length === 1) {
        // Single device - auto-select
        this._autoSelectDevice(devices[0]);
      } else {
        // Multiple devices - display list
        this._displayDevices(devices);
      }
    },

    /**
     * Handle devices loading error
     * @param {Object} error - Error response
     * @private
     */
    _handleDevicesError: function _handleDevicesError(error) {
      // If the MFA endpoints don't exist (older CRM), bypass MFA silently.
      if (error && error.status === 404) {
        if (this._coordinator) {
          this._coordinator.bypassMFA();
        }
        return;
      }

      // Parse error using MFA service
      const parsedError = this._mfaService.parseMFAError(error);

      // Display error message
      this.set('listContent', this.noDataTemplate.apply({
        noDataText: this.errorLoadingText,
      }, this));

      // Notify coordinator of error
      if (this._coordinator) {
        this._coordinator.handleError(parsedError);
      }
    },

    /**
     * Handle empty device list - redirect to setup
     */
    handleNoDevices: function handleNoDevices() {
      // Display message briefly
      this.set('listContent', this.noDataTemplate.apply({
        noDataText: this.noDevicesText,
      }, this));

      // Redirect to device setup via coordinator
      if (this._coordinator) {
        // Small delay to show the message
        setTimeout(() => {
          this._coordinator.showDeviceSetup();
        }, 500);
      }
    },

    /**
     * Auto-select device when only one exists
     * @param {Object} device - The single device
     * @private
     */
    _autoSelectDevice: function _autoSelectDevice(device) {
      // Navigate directly to verification
      this.onDeviceSelect(device);
    },

    /**
     * Display devices in the list
     * @param {Array} devices - Array of device objects
     * @private
     */
    _displayDevices: function _displayDevices(devices) {
      // Sort devices with default first
      const sortedDevices = this._sortDevices(devices);

      // Clear existing content
      this.clear();

      // Render each device
      sortedDevices.forEach((device) => {
        const itemHtml = this.createItemTemplate(device);
        this._appendItem(itemHtml, device);
      });
    },

    /**
     * Sort devices with default device first
     * @param {Array} devices - Array of device objects
     * @returns {Array} Sorted devices array
     * @private
     */
    _sortDevices: function _sortDevices(devices) {
      return devices.slice().sort((a, b) => {
        // Default device comes first
        if (a.isDefault && !b.isDefault) {
          return -1;
        }
        if (!a.isDefault && b.isDefault) {
          return 1;
        }
        // Otherwise maintain original order
        return 0;
      });
    },

    /**
     * Create list item template for a device
     * @param {Object} device - MFA device object
     * @returns {String} Rendered HTML for the device item
     */
    createItemTemplate: function createItemTemplate(device) {
      // Add helper methods to device object for template
      const deviceWithHelpers = {
        ...device,
        getDeviceIconName: this.getDeviceIconName.bind(this),
        getDeviceTypeText: this.getDeviceTypeText.bind(this),
        defaultBadgeText: this.defaultBadgeText,
      };

      return this.itemTemplate.apply(deviceWithHelpers, this);
    },

    /**
     * Get device icon name based on method type
     * @param {Object} device - Device object
     * @returns {String} Soho icon name
     */
    getDeviceIconName: function getDeviceIconName(device) {
      if (device.method === 1) {
        return 'phone'; // Authenticator App
      } else if (device.method === 2) {
        return 'mail'; // Email
      }
      return 'locked'; // Default fallback
    },

    /**
     * Get device type text based on method
     * @param {Object} device - Device object
     * @returns {String} Device type text
     */
    getDeviceTypeText: function getDeviceTypeText(device) {
      if (device.method === 1) {
        return this.authenticatorAppText;
      } else if (device.method === 2) {
        return this.emailText;
      }
      return 'Unknown';
    },

    /**
     * Append item to the list
     * @param {String} itemHtml - Rendered item HTML
     * @param {Object} device - Device object
     * @private
     */
    _appendItem: function _appendItem(itemHtml, device) {
      const itemNode = document.createElement('div');
      itemNode.innerHTML = itemHtml;
      itemNode.setAttribute('data-action', 'activateEntry');
      itemNode.setAttribute('data-key', device.deviceId || device.$key);
      itemNode.setAttribute('data-descriptor', device.description);
      itemNode.classList.add('list-item');

      // Add click handler
      itemNode.addEventListener('click', () => {
        this.onDeviceSelect(device);
      });

      // Append to content node
      if (this.contentNode) {
        this.contentNode.appendChild(itemNode);
      }
    },

    /**
     * Handle device selection
     * @param {Object} device - Selected device
     */
    onDeviceSelect: function onDeviceSelect(device) {
      // Navigate to verification view via coordinator
      if (this._coordinator) {
        this._coordinator.showVerification(device);
      }
    },

    /**
     * Clear the list content
     */
    clear: function clear() {
      if (this.contentNode) {
        this.contentNode.innerHTML = '';
      }
    },

    /**
     * Create toolbar layout
     * @returns {Object} Toolbar layout
     */
    createToolLayout: function createToolLayout() {
      return this.tools || (this.tools = {
        bbar: [{
          id: 'cancel',
          svg: 'cancel',
          title: this.cancelText,
          action: 'handleCancel',
          cls: 'button',
        }],
        tbar: false,
      });
    },

    /**
     * Handle cancel action
     */
    handleCancel: function handleCancel() {
      if (this._coordinator) {
        this._coordinator.handleCancel();
      }
    },
  });

  return __class;
});
