/* eslint-disable */
define('spec/Views/Lead/Detail.spec', [
  'crm/Views/Lead/Detail',
  'crm/OCR/FeatureAvailability'
], function(
  Detail,
  FeatureAvailability
) {
  // Original own-property descriptors for the navigator members we override, so
  // each test can install a deterministic permissions/mediaDevices stub and the
  // afterEach can restore the real environment.
  var ORIGINAL_PERMISSIONS_DESC = Object.getOwnPropertyDescriptor(navigator, 'permissions');
  var ORIGINAL_MEDIA_DESC = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

  function stubNavigator(key, value) {
    Object.defineProperty(navigator, key, { value: value, configurable: true, writable: true });
  }

  function restoreNavigator() {
    if (ORIGINAL_PERMISSIONS_DESC) {
      Object.defineProperty(navigator, 'permissions', ORIGINAL_PERMISSIONS_DESC);
    } else {
      try { delete navigator.permissions; } catch (e) { /* ignore */ }
    }

    if (ORIGINAL_MEDIA_DESC) {
      Object.defineProperty(navigator, 'mediaDevices', ORIGINAL_MEDIA_DESC);
    } else {
      try { delete navigator.mediaDevices; } catch (e) { /* ignore */ }
    }
  }

  // Find the QuickActionsSection children produced by createLayout.
  function quickActionsOf(layout) {
    var section = layout.filter(function(s) { return s.name === 'QuickActionsSection'; })[0];
    return (section && section.children) || [];
  }

  function findAction(layout, name) {
    return quickActionsOf(layout).filter(function(a) { return a.name === name; })[0];
  }

  describe('crm/Views/Lead/Detail (OCR entry point)', function() {
    var _app = window.App;
    var view;

    beforeEach(function() {
      window.App = {
        context: {},
        getView: function() { return null; },
        getViews: function() { return []; },
        getCurrentLocale: function() { return 'en'; },
        supportsTouch: function() {},
        modal: {
          createSimpleAlert: function() {},
          createSimpleDialog: function() { return Promise.resolve(); }
        }
      };

      view = new Detail();
      // createLayout reaches through this.app for picklist renderers; an empty
      // app keeps those renderers inert without a live picklist service.
      view.app = {};
      view.entry = {
        $key: 'L1',
        Company: 'Acme Inc',
        LeadNameLastFirst: 'Doe, Jane'
      };
    });

    afterEach(function() {
      if (view) {
        view.destroy();
        view = null;
      }
      restoreNavigator();
      window.App = _app;
    });

    describe('quick action availability (Req 1.4, 1.5, 2.1, 2.3)', function() {
      it('includes the OCR quick action while the feature is available', function() {
        spyOn(FeatureAvailability, 'isAvailable').and.returnValue(true);

        var layout = view.createLayout();
        var action = findAction(layout, 'OCR_Quick_Action');

        expect(action).toBeDefined();
        expect(action.action).toBe('startOcrScan');
        expect(action.label).toBe(view.ocrScanText);
      });

      it('omits the OCR quick action while the feature is unavailable', function() {
        spyOn(FeatureAvailability, 'isAvailable').and.returnValue(false);

        var layout = view.createLayout();

        expect(findAction(layout, 'OCR_Quick_Action')).toBeUndefined();
        // The remaining quick actions are still present.
        expect(findAction(layout, 'CallWorkPhoneAction')).toBeDefined();
      });
    });

    describe('activation when available (Req 2.2)', function() {
      it('opens the capture view with the Lead scan configuration', function(done) {
        spyOn(FeatureAvailability, 'isAvailable').and.returnValue(true);

        var captureView = { show: jasmine.createSpy('show') };
        spyOn(window.App, 'getView').and.returnValue(captureView);

        view.startOcrScan();

        // Allow the activation promise chain to settle.
        setTimeout(function() {
          expect(window.App.getView).toHaveBeenCalledWith('ocr_capture');
          expect(captureView.show).toHaveBeenCalled();

          var options = captureView.show.calls.mostRecent().args[0];
          expect(options.scanConfig.destinationEditView).toBe('lead_edit');
          expect(options.scanConfig.targetFields.length).toBe(9);
          // Target fields are entity-supplied with property + max length.
          expect(options.scanConfig.targetFields[0].property).toBe('Company');
          expect(options.scanConfig.targetFields[0].maxTextLength).toBe(128);
          // The current Lead is forwarded for back-navigation context.
          expect(options.entry).toBe(view.entry);
          done();
        }, 0);
      });

      it('derives the target fields from the Lead edit view layout', function(done) {
        spyOn(FeatureAvailability, 'isAvailable').and.returnValue(true);

        // A trimmed edit layout exposing a name, text, phone, picklist plus
        // excluded types (address/lookup) the derivation must skip.
        var editLayout = [
          { name: 'LeadNameLastFirst', property: 'LeadNameLastFirst', label: 'name', type: 'name' },
          { name: 'Company', property: 'Company', label: 'company', type: 'text', maxTextLength: 128 },
          { name: 'Email', property: 'Email', label: 'email', type: 'text' },
          { name: 'WorkPhone', property: 'WorkPhone', label: 'work phone', type: 'phone', maxTextLength: 32 },
          { name: 'Title', property: 'Title', label: 'title', type: 'picklist', maxTextLength: 64 },
          { name: 'Address', property: 'Address', label: 'address', type: 'address', view: 'address_edit' },
          { name: 'LeadSource', property: 'LeadSource', label: 'source', type: 'lookup' }
        ];
        var addressLayout = [
          { name: 'Address1', property: 'Address1', label: 'Address 1', type: 'text', maxTextLength: 64 },
          { name: 'Address2', property: 'Address2', label: 'Address 2', type: 'text', maxTextLength: 64 },
          { name: 'City', property: 'City', label: 'City', type: 'picklist', maxTextLength: 32 },
          { name: 'State', property: 'State', label: 'State', type: 'picklist', maxTextLength: 32 },
          { name: 'PostalCode', property: 'PostalCode', label: 'Postal Code', type: 'text', maxTextLength: 24 },
          { name: 'Country', property: 'Country', label: 'Country', type: 'picklist', maxTextLength: 64 }
        ];
        var captureView = { show: jasmine.createSpy('show') };

        spyOn(window.App, 'getView').and.callFake(function(id) {
          if (id === 'lead_edit') {
            return { createLayout: function() { return editLayout; } };
          }
          if (id === 'address_edit') {
            return { createLayout: function() { return addressLayout; } };
          }
          return captureView;
        });

        view.startOcrScan();

        setTimeout(function() {
          var options = captureView.show.calls.mostRecent().args[0];
          var fields = options.scanConfig.targetFields;
          var props = fields.map(function(f) { return f.property; });

          // Name and email (missing from the old hardcoded list) are included.
          expect(props).toContain('LeadNameLastFirst');
          expect(props).toContain('Email');
          expect(props).toContain('Company');
          expect(props).toContain('WorkPhone');
          expect(props).toContain('Title');
          // The composite address is expanded into grouped sub-fields.
          expect(props).toContain('Address.Address1');
          expect(props).toContain('Address.City');
          expect(props).toContain('Address.PostalCode');
          expect(props).toContain('Address.Country');
          // Lookup is excluded.
          expect(props).not.toContain('LeadSource');

          // Address sub-fields carry a shared group label and per-field maxes.
          var city = fields.filter(function(f) { return f.property === 'Address.City'; })[0];
          expect(city.group).toBe('address');
          expect(city.maxTextLength).toBe(32);

          // The composite name field is flagged for name-part handling.
          var name = fields.filter(function(f) { return f.property === 'LeadNameLastFirst'; })[0];
          expect(name.nameField).toBe(true);

          // A field without a declared maxTextLength gets the default.
          var email = fields.filter(function(f) { return f.property === 'Email'; })[0];
          expect(email.maxTextLength).toBe(view.ocrDefaultMaxTextLength);
          done();
        }, 0);
      });
    });

    describe('activation when unavailable (Req 2.4)', function() {
      it('shows the unavailable message and does not open the capture view', function() {
        spyOn(FeatureAvailability, 'isAvailable').and.returnValue(false);
        spyOn(window.App.modal, 'createSimpleAlert');
        spyOn(window.App, 'getView');

        view.startOcrScan();

        expect(window.App.modal.createSimpleAlert).toHaveBeenCalled();
        var alertArgs = window.App.modal.createSimpleAlert.calls.mostRecent().args[0];
        expect(alertArgs.content).toBe(view.ocrUnavailableText);
        // No navigation attempt when unavailable.
        expect(window.App.getView).not.toHaveBeenCalled();
      });
    });

    describe('launch failure handling (Req 2.5)', function() {
      it('routes a capture-view open failure to a retry dialog without navigating', function(done) {
        spyOn(FeatureAvailability, 'isAvailable').and.returnValue(true);
        // App.getView returns null: the capture view cannot be opened.
        spyOn(window.App, 'getView').and.returnValue(null);
        spyOn(view, '_handleOcrLaunchFailure').and.callThrough();
        // A non-resolving dialog isolates this test to the failure message; the
        // retry path is covered separately.
        spyOn(window.App.modal, 'createSimpleDialog').and.returnValue(new Promise(function() {}));

        view.startOcrScan();

        setTimeout(function() {
          expect(view._handleOcrLaunchFailure).toHaveBeenCalled();
          var dialogArgs = window.App.modal.createSimpleDialog.calls.mostRecent().args[0];
          expect(dialogArgs.content).toBe(view.ocrOpenFailedText);
          done();
        }, 0);
      });

      it('keeps the Lead data unchanged and offers a retry on failure', function(done) {
        var originalEntry = {
          $key: 'L1',
          Company: 'Acme Inc',
          LeadNameLastFirst: 'Doe, Jane'
        };
        view.entry = originalEntry;

        spyOn(window.App.modal, 'createSimpleDialog').and.returnValue(Promise.resolve());
        // The retry confirmation re-enters the activation flow.
        spyOn(view, 'startOcrScan');

        view._handleOcrLaunchFailure('open');

        // The Lead data is left exactly as it was.
        expect(view.entry).toBe(originalEntry);
        expect(view.entry.Company).toBe('Acme Inc');
        expect(window.App.modal.createSimpleDialog).toHaveBeenCalled();

        setTimeout(function() {
          // Confirming the dialog retries activation (Req 2.5).
          expect(view.startOcrScan).toHaveBeenCalled();
          done();
        }, 0);
      });
    });
  });
});
