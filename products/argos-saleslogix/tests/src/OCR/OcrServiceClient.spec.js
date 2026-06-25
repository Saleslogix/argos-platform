/* eslint-disable */
define('spec/OCR/OcrServiceClient.spec', ['fast-check', 'crm/OCR/OcrServiceClient'], function(fc, OcrServiceClient) {
  // Minimum iterations required by the task for every property.
  var NUM_RUNS = 100;

  // A no-op availability stub injected via the constructor so the success and
  // failure classifications never touch the real App.context map.
  function noopAvailability() {
    return { markUnavailable: function() {} };
  }

  // Build a client with stubbed dependencies (service + availability) injected
  // through the constructor options.
  function makeClient(availability) {
    return new OcrServiceClient({
      service: { name: 'stub-service' },
      availability: availability || noopAvailability(),
    });
  }

  // Derive the generic recognition-error message the client substitutes, rather
  // than hard-coding it, so the assertions stay coupled to behavior not text.
  var GENERIC_ERROR_MESSAGE = makeClient().interpretResponse({ success: false }).message;

  // ---- Stub for Sage.SData.Client.SDataServiceOperationRequest -------------
  // Property 7 exercises the real `recognize` request construction. We swap the
  // global request constructor for a stub that records the contract/operation
  // names and the entry body, then drives the success callback so the promise
  // resolves without waiting on the 30-second timeout.
  function installStubRequest(captured, behavior) {
    function StubRequest(service) {
      captured.service = service;
    }

    StubRequest.prototype.setContractName = function(name) {
      captured.contractName = name;
      return this;
    };

    StubRequest.prototype.setOperationName = function(name) {
      captured.operationName = name;
      return this;
    };

    StubRequest.prototype.abort = function() {
      captured.aborted = true;
    };

    StubRequest.prototype.execute = function(entry, callbacks) {
      captured.entry = entry;

      if (behavior && behavior.type === 'failure') {
        callbacks.failure.call(callbacks.scope, behavior.response);
        return;
      }

      callbacks.success.call(callbacks.scope, behavior && behavior.response);
    };

    window.Sage.SData.Client.SDataServiceOperationRequest = StubRequest;
  }

  describe('crm/OCR/OcrServiceClient', function() {
    var _SDataServiceOperationRequest;

    beforeEach(function() {
      if (!window.Sage) {
        window.Sage = {};
      }
      if (!window.Sage.SData) {
        window.Sage.SData = {};
      }
      if (!window.Sage.SData.Client) {
        window.Sage.SData.Client = {};
      }

      _SDataServiceOperationRequest = window.Sage.SData.Client.SDataServiceOperationRequest;
    });

    afterEach(function() {
      window.Sage.SData.Client.SDataServiceOperationRequest = _SDataServiceOperationRequest;
    });

    describe('Request body construction (Property 7)', function() {
      // Feature: ocr-card-scanner, Property 7: Request body construction
      it('sets imageData and imageFormat and includes language iff a non-empty token is supplied', function() {
        return fc.assert(
          fc.asyncProperty(
            fc.base64String({ maxLength: 64 }),
            fc.constantFrom('png', 'jpeg', 'tiff', 'bmp', 'jpg', 'PNG', 'JPEG'),
            // present/absent/empty language tokens.
            fc.oneof(
              fc.constant(undefined),
              fc.constant(''),
              fc.string({ minLength: 1, maxLength: 8 })
            ),
            async function(imageData, imageFormat, language) {
              var captured = {};
              installStubRequest(captured, {
                type: 'success',
                response: { success: true, recognizedText: 'line', confidenceScore: 50 },
              });

              var client = makeClient();
              await client.recognize({
                imageData: imageData,
                imageFormat: imageFormat,
                language: language,
              });

              // Request is addressed to the system contract + executeOcr op.
              expect(captured.contractName).toBe('system');
              expect(captured.operationName).toBe('executeOcr');

              // imageData (Base64) and imageFormat (declared format) are set.
              expect(captured.entry.request.imageData).toBe(imageData);
              expect(captured.entry.request.imageFormat).toBe(imageFormat);

              // language is present in the body iff a non-empty token was given.
              var shouldInclude = typeof language === 'string' && language.length > 0;
              expect(
                Object.prototype.hasOwnProperty.call(captured.entry.request, 'language')
              ).toBe(shouldInclude);

              if (shouldInclude) {
                expect(captured.entry.request.language).toBe(language);
              }
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('Success-response classification (Property 9)', function() {
      // Feature: ocr-card-scanner, Property 9: Success-response classification
      it('reports ok=true with an extracted line collection and confidence within [0,100]', function() {
        // recognizedText: arbitrary unicode (including whitespace-only and
        // multi-line content); confidenceScore: in-range, out-of-range, and
        // non-numeric values.
        var confidenceArb = fc.oneof(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.integer({ min: -1000, max: 1000 }),
          fc.constantFrom(NaN, Infinity, -Infinity),
          fc.string(),
          fc.constant(null),
          fc.constant(undefined)
        );

        fc.assert(
          fc.property(fc.fullUnicodeString({ maxLength: 120 }), confidenceArb, function(recognizedText, confidenceScore) {
            var result = makeClient().interpretResponse({
              success: true,
              recognizedText: recognizedText,
              confidenceScore: confidenceScore,
            });

            expect(result.ok).toBe(true);
            expect(result.unavailable).toBe(false);
            expect(result.timedOut).toBe(false);

            // Extracted line collection: every line non-empty and trimmed.
            expect(Array.isArray(result.lines)).toBe(true);
            result.lines.forEach(function(line) {
              expect(typeof line).toBe('string');
              expect(line.trim()).toEqual(line);
              expect(line.length).toBeGreaterThan(0);
            });

            // Confidence is a number within the inclusive range 0..100.
            expect(typeof result.confidence).toBe('number');
            expect(Number.isFinite(result.confidence)).toBe(true);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
          }),
          { numRuns: NUM_RUNS }
        );
      });

      it('reads the confidence score from the service "confidence" field', function() {
        var result = makeClient().interpretResponse({
          success: true,
          recognizedText: 'John Doe',
          confidence: 85,
        });

        expect(result.ok).toBe(true);
        expect(result.confidence).toBe(85);
      });

      it('still honors the legacy "confidenceScore" field when "confidence" is absent', function() {
        var result = makeClient().interpretResponse({
          success: true,
          recognizedText: 'John Doe',
          confidenceScore: 70,
        });

        expect(result.confidence).toBe(70);
      });
    });

    describe('Error-message substitution (Property 11)', function() {
      // Feature: ocr-card-scanner, Property 11: Error-message substitution
      it('uses errorMessage when present and non-empty, otherwise the generic message', function() {
        // present/absent/empty errorMessage values.
        var errorMessageArb = fc.oneof(
          fc.constant(undefined),
          fc.constant(null),
          fc.constant(''),
          // whitespace-only (empty after trim) -> substituted.
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\f'), { minLength: 1, maxLength: 6 }),
          // meaningful, non-empty messages -> used verbatim.
          fc.string({ minLength: 1, maxLength: 60 }).filter(function(s) { return s.trim().length > 0; })
        );

        fc.assert(
          fc.property(errorMessageArb, function(errorMessage) {
            var result = makeClient().interpretResponse({
              success: false,
              errorMessage: errorMessage,
            });

            expect(result.ok).toBe(false);
            expect(result.unavailable).toBe(false);

            // The interpreted message is always non-empty.
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);

            var hasUsable = typeof errorMessage === 'string' && errorMessage.trim().length > 0;
            if (hasUsable) {
              expect(result.message).toBe(errorMessage);
            } else {
              expect(result.message).toBe(GENERIC_ERROR_MESSAGE);
            }
          }),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('404 classification marks unavailable (Property 12)', function() {
      // Feature: ocr-card-scanner, Property 12: 404 classification marks unavailable
      it('reports unavailable and records the operation through availability for any 404 outcome', function() {
        // Vary other fields to show the 404 classification dominates regardless
        // of any incidental success/error content on the raw outcome.
        var extraArb = fc.record(
          {
            success: fc.boolean(),
            errorMessage: fc.string({ maxLength: 20 }),
            recognizedText: fc.string({ maxLength: 20 }),
            confidenceScore: fc.integer({ min: -50, max: 150 }),
          },
          { requiredKeys: [] }
        );

        fc.assert(
          fc.property(extraArb, function(extra) {
            var markedCount = 0;
            var availability = {
              markUnavailable: function() {
                markedCount += 1;
              },
            };

            var raw = Object.assign({}, extra, { unavailable: true });
            var result = makeClient(availability).interpretResponse(raw);

            // Result reports unavailable.
            expect(result.unavailable).toBe(true);
            expect(result.ok).toBe(false);

            // The operation was recorded unavailable exactly once.
            expect(markedCount).toBe(1);

            // A non-empty unavailable message is provided.
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
          }),
          { numRuns: NUM_RUNS }
        );
      });
    });
  });
});
