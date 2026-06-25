/* eslint-disable */
define('spec/OCR/FeatureAvailability.spec', ['fast-check', 'crm/OCR/FeatureAvailability'], function(fc, FeatureAvailability) {
  // Minimum iterations required by the task for every property.
  var NUM_RUNS = 100;

  // Generator for arbitrary operation-name strings. Includes the default
  // operation name, identifier-like tokens, dotted/namespaced names, empty
  // strings, and arbitrary unicode content so the availability map is
  // exercised across a broad range of realistic and unusual keys.
  //
  // Names that collide with members inherited from Object.prototype
  // (e.g. `__proto__`, `constructor`, `hasOwnProperty`, `toString`) are
  // excluded: those are not valid SData service-operation names, and the
  // plain-object map pattern (shared with CustomerJourney360Widget) keys
  // strictly on operation names that do not shadow inherited properties.
  var operationNameArb = fc.oneof(
    fc.constant('executeOcr'),
    fc.constantFrom('executeOcr', 'doSomething', 'fooBar', 'system.executeOcr', 'a', 'OCR_op', 'export'),
    fc.string({ maxLength: 24 }),
    fc.fullUnicodeString({ maxLength: 24 })
  ).filter(function(name) {
    // `name in {}` is true for inherited Object.prototype keys; reject those.
    return !(name in {});
  });

  // Build a fresh session context, mirroring a newly-built `App.context`.
  function freshSession() {
    window.App = { context: {} };
  }

  describe('crm/OCR/FeatureAvailability', function() {
    var _app = window.App;

    beforeEach(function() {
      freshSession();
    });

    afterEach(function() {
      window.App = _app;
    });

    describe('Availability round-trip on 404 (Property 1)', function() {
      // Feature: ocr-card-scanner, Property 1: Availability round-trip on 404
      it('reports an operation unavailable for the rest of the session after markUnavailable', function() {
        fc.assert(
          fc.property(operationNameArb, function(name) {
            freshSession();

            // Available before any 404 is recorded.
            expect(FeatureAvailability.isAvailable(name)).toBe(true);

            // Record the 404 for this operation.
            FeatureAvailability.markUnavailable(name);

            // False now, and false on every subsequent read for the session.
            expect(FeatureAvailability.isAvailable(name)).toBe(false);
            expect(FeatureAvailability.isAvailable(name)).toBe(false);

            // Reads of other operations (lazy map access) never flip it back.
            FeatureAvailability.isAvailable('some/other/operation');
            FeatureAvailability.isAvailable('');
            expect(FeatureAvailability.isAvailable(name)).toBe(false);
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 1: Availability round-trip on 404
      it('marking an operation unavailable does not affect unrelated operations', function() {
        fc.assert(
          fc.property(operationNameArb, operationNameArb, function(marked, other) {
            // Only meaningful when the names differ.
            fc.pre(marked !== other);

            freshSession();
            FeatureAvailability.markUnavailable(marked);

            expect(FeatureAvailability.isAvailable(marked)).toBe(false);
            expect(FeatureAvailability.isAvailable(other)).toBe(true);
          }),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('Non-404 responses leave availability unchanged (Property 2)', function() {
      // Feature: ocr-card-scanner, Property 2: Non-404 responses leave availability unchanged
      it('reading availability for non-404 responses never mutates the recorded availability map', function() {
        fc.assert(
          fc.property(
            fc.array(operationNameArb, { maxLength: 10 }),
            fc.array(operationNameArb, { maxLength: 10 }),
            function(priorMarked, nonNotFoundNames) {
              freshSession();

              // Establish a prior availability state by recording some 404s.
              priorMarked.forEach(function(name) {
                FeatureAvailability.markUnavailable(name);
              });

              var before = JSON.stringify(App.context.unsupportedOperations);

              // Interpreting/handling any non-404 response only ever reads the
              // availability state (the client calls markUnavailable solely on
              // 404). These reads must not alter the recorded map.
              nonNotFoundNames.forEach(function(name) {
                FeatureAvailability.isAvailable(name);
              });

              var after = JSON.stringify(App.context.unsupportedOperations);

              // The availability map is identical before and after.
              expect(after).toEqual(before);

              // Every previously-recorded operation remains unavailable.
              priorMarked.forEach(function(name) {
                expect(FeatureAvailability.isAvailable(name)).toBe(false);
              });
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('New session context resets availability (Property 3)', function() {
      // Feature: ocr-card-scanner, Property 3: New session context resets availability
      it('reports operations available again once App.context is rebuilt', function() {
        fc.assert(
          fc.property(
            fc.array(operationNameArb, { maxLength: 15 }),
            operationNameArb,
            function(priorMarked, name) {
              freshSession();

              // Record an arbitrary sequence of prior 404s this session.
              priorMarked.forEach(function(op) {
                FeatureAvailability.markUnavailable(op);
              });

              // Session ends and a new application context is built (fresh map).
              window.App = { context: {} };

              // Every operation reports available in the new session.
              expect(FeatureAvailability.isAvailable(name)).toBe(true);

              priorMarked.forEach(function(op) {
                expect(FeatureAvailability.isAvailable(op)).toBe(true);
              });
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });
  });
});
