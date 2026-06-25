/* eslint-disable */
define('spec/OCR/Mapping.spec', ['fast-check', 'crm/Views/OCR/Mapping'], function(fc, Mapping) {
  // Minimum iterations required by the task for every property.
  var NUM_RUNS = 100;

  // ---- Configuration arbitraries ------------------------------------------
  // A valid (present) target field set: a non-empty array of field descriptors.
  // validateConfiguration only checks that targetFields is a non-empty array,
  // so the descriptor contents are kept simple and entity-agnostic.
  function validTargetFieldsArb() {
    return fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 8 }),
        label: fc.string({ maxLength: 8 }),
        property: fc.string({ minLength: 1, maxLength: 8 }),
        maxTextLength: fc.integer({ min: 1, max: 128 }),
      }),
      { minLength: 1, maxLength: 5 }
    );
  }

  // A "missing" target field set: undefined, null, an empty array, or a value of
  // the wrong type (string/number/boolean/plain object). Every one of these must
  // be treated as a missing required parameter.
  function missingTargetFieldsArb() {
    return fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      fc.constant([]),                       // empty array
      fc.string(),                           // wrong type: string (incl. '')
      fc.integer(),                          // wrong type: number
      fc.boolean(),                          // wrong type: boolean
      fc.record({ foo: fc.string() })        // wrong type: non-array object
    );
  }

  // A valid (present) destination edit view: a non-empty string.
  function validDestArb() {
    return fc.string({ minLength: 1, maxLength: 16 });
  }

  // A "missing" destination edit view: undefined, null, an empty string, or a
  // value of the wrong type (number/boolean/array/object).
  function missingDestArb() {
    return fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      fc.constant(''),                       // empty string
      fc.integer(),                          // wrong type: number
      fc.boolean(),                          // wrong type: boolean
      fc.array(fc.string()),                 // wrong type: array
      fc.record({ foo: fc.string() })        // wrong type: object
    );
  }

  // A rejectable configuration paired with the required parameter names that
  // should be reported as missing (in the implementation's report order:
  // targetFields before destinationEditView). Covers configs missing the target
  // fields only, the destination edit view only, both, and the entirely-absent
  // configuration (undefined/null/empty object).
  function rejectableConfigArb() {
    return fc.oneof(
      // Missing target fields only.
      fc.record({
        targetFields: missingTargetFieldsArb(),
        destinationEditView: validDestArb(),
      }).map(function(config) {
        return { config: config, expected: ['targetFields'] };
      }),
      // Missing destination edit view only.
      fc.record({
        targetFields: validTargetFieldsArb(),
        destinationEditView: missingDestArb(),
      }).map(function(config) {
        return { config: config, expected: ['destinationEditView'] };
      }),
      // Missing both.
      fc.record({
        targetFields: missingTargetFieldsArb(),
        destinationEditView: missingDestArb(),
      }).map(function(config) {
        return { config: config, expected: ['targetFields', 'destinationEditView'] };
      }),
      // Entirely-absent configuration: both required parameters are missing.
      fc.constantFrom(undefined, null, {}).map(function(config) {
        return { config: config, expected: ['targetFields', 'destinationEditView'] };
      })
    );
  }

  describe('crm/Views/OCR/Mapping', function() {
    var _app = window.App;
    var view;

    beforeEach(function() {
      window.App = {
        getView: function() { return null; },
        supportsTouch: function() {}
      };
      view = new Mapping();
      // Isolate the view's own show logic from the framework navigation that
      // the base View.show performs (routing), so the rejection branch can be
      // exercised directly without a live router.
      view.inherited = function inheritedStub() {};
    });

    afterEach(function() {
      if (view) {
        view.destroy();
        view = null;
      }
      window.App = _app;
    });

    describe('required configuration rejection (Property 22)', function() {
      // Feature: ocr-card-scanner, Property 22: Required configuration rejection
      it('rejects any configuration missing targetFields, destinationEditView, or both, naming the missing parameter(s)', function() {
        fc.assert(
          fc.property(rejectableConfigArb(), function(sample) {
            var result = view.validateConfiguration(sample.config);

            // Initialization is rejected.
            expect(result.ok).toBe(false);

            // The report names exactly the missing required parameter(s).
            expect(result.missing).toEqual(sample.expected);

            // The returned error message names each missing required parameter.
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
            sample.expected.forEach(function(name) {
              expect(result.message.indexOf(name) >= 0).toBe(true);
            });
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 22: Required configuration rejection
      it('retains no mapping state when shown with a rejectable configuration', function() {
        fc.assert(
          fc.property(rejectableConfigArb(), function(sample) {
            // A scanConfig key is only present for object configs; undefined/null
            // configs model a caller that omitted the configuration entirely.
            var options = (sample.config === undefined || sample.config === null)
              ? { scanConfig: sample.config }
              : { scanConfig: sample.config, lines: ['Acme Inc', '555-0100'], confidence: 90 };

            view.show(options);

            // No mapping state is retained: the model is never built and the
            // configuration is not adopted.
            expect(view._model).toBeNull();
            expect(view._scanConfig).toBeNull();
            expect(view._lines).toBeNull();

            // The configuration error is surfaced and names the missing param(s).
            expect(typeof view._configError).toBe('string');
            expect(view._configError.length).toBeGreaterThan(0);
            sample.expected.forEach(function(name) {
              expect(view._configError.indexOf(name) >= 0).toBe(true);
            });
          }),
          { numRuns: NUM_RUNS }
        );
      });
    });
  });
});
