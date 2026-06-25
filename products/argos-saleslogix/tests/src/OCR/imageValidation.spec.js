/* eslint-disable */
define('spec/OCR/imageValidation.spec', ['fast-check', 'crm/OCR/imageValidation'], function(fc, imageValidation) {
  // Minimum iterations required by the task for every property.
  var NUM_RUNS = 100;

  var MAX_BYTES = 10 * 1024 * 1024; // Image_Size_Limit = 10 MB

  // Canonical Supported_Image_Format tokens.
  var CANONICAL_FORMATS = ['png', 'jpeg', 'tiff', 'bmp'];

  // Apply random casing to a token so format detection is exercised against
  // case variants like JPG/jpg/JPEG/Png/TIFF/bmp.
  function randomCaseArb(token) {
    return fc.array(fc.boolean(), { minLength: token.length, maxLength: token.length })
      .map(function(flags) {
        var out = '';
        for (var i = 0; i < token.length; i++) {
          out += flags[i] ? token.charAt(i).toUpperCase() : token.charAt(i).toLowerCase();
        }
        return out;
      });
  }

  // Generator for an alias/case-variant of a supported format. Includes the
  // `jpg` alias of `jpeg`. Returns both the variant token and the canonical
  // token it should normalize to.
  function supportedVariantArb() {
    var bases = [
      { variantSource: 'png', canonical: 'png' },
      { variantSource: 'jpeg', canonical: 'jpeg' },
      { variantSource: 'jpg', canonical: 'jpeg' }, // JPG alias -> jpeg
      { variantSource: 'tiff', canonical: 'tiff' },
      { variantSource: 'bmp', canonical: 'bmp' },
    ];

    return fc.constantFrom.apply(fc, bases).chain(function(base) {
      return randomCaseArb(base.variantSource).map(function(variant) {
        return { token: variant, canonical: base.canonical };
      });
    });
  }

  // Generator for tokens that are NOT supported formats. Includes random
  // strings plus explicit unsupported tokens, filtering out anything that
  // happens to normalize to a supported token.
  function unsupportedTokenArb() {
    var explicit = fc.constantFrom('gif', 'webp', 'pdf', 'svg', 'heic', 'raw', 'jpegg', 'pn', 'image', '', '   ', 'jp g');

    return fc.oneof(explicit, fc.string({ maxLength: 12 })).filter(function(token) {
      if (typeof token !== 'string') {
        return true;
      }
      var normalized = token.trim().toLowerCase();
      var canonical = normalized === 'jpg' ? 'jpeg' : normalized;
      return CANONICAL_FORMATS.indexOf(canonical) < 0;
    });
  }

  describe('crm/OCR/imageValidation', function() {
    describe('normalizeFormat (Property 5)', function() {
      // Feature: ocr-card-scanner, Property 5: Image format normalization
      it('returns the canonical token for any case variant or alias of a supported format', function() {
        fc.assert(
          fc.property(supportedVariantArb(), function(sample) {
            expect(imageValidation.normalizeFormat(sample.token)).toEqual(sample.canonical);
            expect(imageValidation.isSupportedFormat(sample.token)).toBe(true);
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 5: Image format normalization
      it('returns null for any token outside the supported set', function() {
        fc.assert(
          fc.property(unsupportedTokenArb(), function(token) {
            expect(imageValidation.normalizeFormat(token)).toBeNull();
            expect(imageValidation.isSupportedFormat(token)).toBe(false);
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 5: Image format normalization
      it('returns null for non-string input', function() {
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
              expect(imageValidation.normalizeFormat(notAString)).toBeNull();
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('canSubmit (Property 6)', function() {
      // Generator for a declared format that may be supported (case-variant /
      // alias) or unsupported, so canSubmit is exercised across both.
      var declaredFormatArb = fc.oneof(
        supportedVariantArb().map(function(sample) { return sample.token; }),
        unsupportedTokenArb()
      );

      // Generator for byte lengths spanning the empty/boundary/over-limit space,
      // including the explicit boundaries 0, 1, MAX_BYTES, and MAX_BYTES+1.
      var byteLengthArb = fc.oneof(
        fc.constantFrom(0, 1, MAX_BYTES - 1, MAX_BYTES, MAX_BYTES + 1),
        fc.integer({ min: 0, max: MAX_BYTES }),
        fc.integer({ min: MAX_BYTES + 1, max: MAX_BYTES * 2 })
      );

      // Feature: ocr-card-scanner, Property 6: Submit-enable predicate
      it('is true IFF format is supported AND 0 < byteLength <= MAX_BYTES', function() {
        fc.assert(
          fc.property(declaredFormatArb, byteLengthArb, function(declaredFormat, byteLength) {
            var expected =
              imageValidation.isSupportedFormat(declaredFormat) &&
              byteLength <= MAX_BYTES &&
              byteLength > 0;

            expect(imageValidation.canSubmit({ declaredFormat: declaredFormat, byteLength: byteLength })).toBe(expected);
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 6: Submit-enable predicate
      it('honors the byte-length boundaries for a supported format', function() {
        // byteLength 0 -> false (empty), 1 -> true, MAX_BYTES -> true,
        // MAX_BYTES+1 -> false (over limit).
        expect(imageValidation.canSubmit({ declaredFormat: 'png', byteLength: 0 })).toBe(false);
        expect(imageValidation.canSubmit({ declaredFormat: 'png', byteLength: 1 })).toBe(true);
        expect(imageValidation.canSubmit({ declaredFormat: 'png', byteLength: MAX_BYTES })).toBe(true);
        expect(imageValidation.canSubmit({ declaredFormat: 'png', byteLength: MAX_BYTES + 1 })).toBe(false);
      });

      // Feature: ocr-card-scanner, Property 6: Submit-enable predicate
      it('is always false for an unsupported format regardless of byte length', function() {
        fc.assert(
          fc.property(unsupportedTokenArb(), byteLengthArb, function(declaredFormat, byteLength) {
            expect(imageValidation.canSubmit({ declaredFormat: declaredFormat, byteLength: byteLength })).toBe(false);
          }),
          { numRuns: NUM_RUNS }
        );
      });

      // Feature: ocr-card-scanner, Property 6: Submit-enable predicate
      it('is always false for an empty (zero-byte) image regardless of format', function() {
        fc.assert(
          fc.property(declaredFormatArb, function(declaredFormat) {
            expect(imageValidation.canSubmit({ declaredFormat: declaredFormat, byteLength: 0 })).toBe(false);
          }),
          { numRuns: NUM_RUNS }
        );
      });
    });
  });
});
