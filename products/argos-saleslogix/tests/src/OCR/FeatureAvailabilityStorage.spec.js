/* eslint-disable */
define('spec/OCR/FeatureAvailabilityStorage.spec', ['crm/OCR/FeatureAvailability'], function(FeatureAvailability) {
  // Example-based (non-property) unit test verifying that markUnavailable writes
  // to the exact session-scoped storage location used by the journey widget
  // (crm/Views/Journey/CustomerJourney360Widget._markOperationUnsupported):
  //   App.context.unsupportedOperations[name] = true
  //
  // Validates: Requirements 1.7
  describe('crm/OCR/FeatureAvailability storage consistency (Requirement 1.7)', function() {
    var _app = window.App;

    beforeEach(function() {
      // Stub App.context with no pre-existing unsupported-operation map so we
      // can assert the lazy creation and the exact key/value written.
      window.App = {
        context: {},
      };
    });

    afterEach(function() {
      window.App = _app;
    });

    it('writes App.context.unsupportedOperations[name] = true for the default operation', function() {
      FeatureAvailability.markUnavailable();

      // Matches the journey-widget convention: the map lives on
      // App.context.unsupportedOperations, keyed by operation name.
      expect(window.App.context.unsupportedOperations).toBeDefined();
      expect(window.App.context.unsupportedOperations[FeatureAvailability.operationName]).toBe(true);
      expect(window.App.context.unsupportedOperations.executeOcr).toBe(true);
    });

    it('writes App.context.unsupportedOperations[name] = true for an explicit operation name', function() {
      FeatureAvailability.markUnavailable('someOtherOperation');

      expect(window.App.context.unsupportedOperations.someOtherOperation).toBe(true);
    });

    it('lazily creates the unsupportedOperations map at the journey-widget location', function() {
      // Before any call, the map does not exist on the freshly-built context.
      expect(window.App.context.unsupportedOperations).toBeUndefined();

      FeatureAvailability.markUnavailable();

      // The map is created on App.context (not elsewhere), matching the
      // storage location used by CustomerJourney360Widget.
      expect(typeof window.App.context.unsupportedOperations).toBe('object');
      expect(window.App.context.unsupportedOperations).not.toBeNull();
    });

    it('preserves existing entries in the shared session map when marking another operation', function() {
      // Simulate the journey widget having already recorded its operation in
      // the same shared map.
      window.App.context.unsupportedOperations = { journeyOperation: true };

      FeatureAvailability.markUnavailable('executeOcr');

      // Both the pre-existing journey entry and the new OCR entry coexist in
      // the single shared App.context.unsupportedOperations map.
      expect(window.App.context.unsupportedOperations.journeyOperation).toBe(true);
      expect(window.App.context.unsupportedOperations.executeOcr).toBe(true);
    });
  });
});
