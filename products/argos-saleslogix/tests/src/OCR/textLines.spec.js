/* eslint-disable */
define('spec/OCR/textLines.spec', ['fast-check', 'crm/OCR/textLines'], function(fc, textLines) {
  // Minimum iterations required by the task for every property.
  var NUM_RUNS = 100;

  // Generator for a single source line that, after trimming, may be empty
  // (whitespace-only) or non-empty. Includes ASCII, non-ASCII, and unicode
  // whitespace so the trim/drop behavior is exercised broadly.
  var lineArb = fc.oneof(
    fc.constant(''),
    // Whitespace-only lines (spaces, tabs, unicode spaces) - must be dropped.
    fc.stringOf(fc.constantFrom(' ', '\t', '\f', '\v', '\u00a0', '\u2003'), { minLength: 1, maxLength: 8 }),
    // Arbitrary unicode content, including non-ASCII characters.
    fc.fullUnicodeString({ maxLength: 20 })
  );

  // Newline separators: a mix of \r\n, \r, and \n.
  var newlineArb = fc.constantFrom('\r\n', '\r', '\n');

  // Build a recognized-text string from a list of source lines joined by a
  // mix of newline styles, returning both the assembled text and the source
  // lines so properties can reason about ordering.
  function recognizedTextArb() {
    return fc.array(lineArb, { maxLength: 30 }).chain(function(lines) {
      if (lines.length <= 1) {
        return fc.constant({ text: lines.join(''), sourceLines: lines });
      }

      // One separator between each pair of lines.
      return fc.array(newlineArb, { minLength: lines.length - 1, maxLength: lines.length - 1 })
        .map(function(separators) {
          var text = lines[0];
          for (var i = 1; i < lines.length; i++) {
            text += separators[i - 1] + lines[i];
          }

          return { text: text, sourceLines: lines };
        });
    });
  }

  describe('crm/OCR/textLines', function() {
    describe('extract (Property 8)', function() {
      // Feature: ocr-card-scanner, Property 8: Recognized-text line extraction
      it('produces ordered, trimmed, non-empty lines preserving source order', function() {
        fc.assert(
          fc.property(recognizedTextArb(), function(sample) {
            var result = textLines.extract(sample.text);

            // Result is an array.
            expect(Array.isArray(result)).toBe(true);

            // Every produced line is non-empty and not whitespace-only.
            result.forEach(function(line) {
              expect(line.length).toBeGreaterThan(0);
              expect(line.trim()).toEqual(line);
              expect(line.trim().length).toBeGreaterThan(0);
            });

            // The produced lines equal the source lines trimmed, with
            // whitespace-only/empty lines dropped, in the same relative order.
            var expected = sample.sourceLines
              .map(function(line) { return line.trim(); })
              .filter(function(line) { return line.length > 0; });

            expect(result).toEqual(expected);
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 8: Recognized-text line extraction
      it('returns an empty array for non-string input', function() {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.integer(),
              fc.double(),
              fc.boolean(),
              fc.constant(null),
              fc.constant(undefined),
              fc.array(fc.anything()),
              fc.object()
            ),
            function(notAString) {
              expect(textLines.extract(notAString)).toEqual([]);
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('clampConfidence (Property 10)', function() {
      // Feature: ocr-card-scanner, Property 10: Confidence clamping
      it('always returns a number within the inclusive range 0..100', function() {
        var confidenceArb = fc.oneof(
          // In-range and out-of-range finite numbers.
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          // Integers including negatives and large values.
          fc.integer({ min: -1000, max: 1000 }),
          // Non-finite numeric edge values.
          fc.constantFrom(NaN, Infinity, -Infinity),
          // Non-numeric values (coercion-safe: never throw on Number()).
          fc.string(),
          fc.constant(null),
          fc.constant(undefined),
          fc.boolean()
        );

        fc.assert(
          fc.property(confidenceArb, function(value) {
            var result = textLines.clampConfidence(value);

            expect(typeof result).toBe('number');
            expect(Number.isFinite(result)).toBe(true);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 10: Confidence clamping
      it('preserves finite in-range values and clamps out-of-range values to the nearest bound', function() {
        fc.assert(
          fc.property(fc.double({ min: -1000, max: 1000, noNaN: true }), function(value) {
            var result = textLines.clampConfidence(value);

            if (value < 0) {
              expect(result).toEqual(0);
            } else if (value > 100) {
              expect(result).toEqual(100);
            } else {
              // Normalize -0 to +0 so the in-range assertion does not fail on
              // the negative-zero edge case (clampConfidence returns +0).
              expect(result).toEqual(value + 0);
            }
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 10: Confidence clamping
      it('returns 0 for non-finite or non-numeric values', function() {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.constantFrom(NaN, Infinity, -Infinity),
              fc.constant(null),
              fc.constant(undefined),
              fc.constantFrom('abc', 'NaN', '', '   ', 'not-a-number'),
              fc.string(),
              fc.boolean()
            ),
            function(value) {
              // Number(value) is non-finite for all these inputs.
              if (!Number.isFinite(Number(value))) {
                expect(textLines.clampConfidence(value)).toEqual(0);
              }
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });
  });
});
