# Implementation Plan: OCR Card Scanner

## Overview

This plan implements the OCR Card Scanner for the argos-saleslogix mobile CRM. It builds bottom-up: the pure, entity-agnostic logic modules first (`textLines`, `imageValidation`, `FeatureAvailability`, `OcrServiceClient`, `MappingModel`), then the two views (`ocr_capture`, `ocr_mapping`), then the Lead detail entry point and view registration that wire everything together.

All source modules follow the AMD `crm/` module-ID convention and live under `products/argos-saleslogix/src/`. Pure modules are exercised with `fast-check` property-based tests (Properties 1–23 from the design); views, navigation, timing, and external-service branches are exercised with example/integration unit tests under the Mocha suite. Tests run via `npm run test -w products/argos-saleslogix` (single run) and lint via `npm run lint -w products/argos-saleslogix`.

## Tasks

- [x] 1. Create OCR pure helper modules (text extraction and image validation)
  - [x] 1.1 Implement `crm/OCR/textLines`
    - Create `products/argos-saleslogix/src/OCR/textLines.js` as an AMD module (`define('crm/OCR/textLines', [], ...)`)
    - Implement `extract(recognizedText)`: split on `\r\n|\r|\n`, trim each line, drop whitespace-only lines, preserve order; return `[]` for non-string input
    - Implement `clampConfidence(value)`: coerce to number, return 0 for non-finite, clamp to `[0,100]`
    - _Requirements: 5.2, 5.4_

  - [x] 1.2 Write property tests for `textLines`
    - **Property 8: Recognized-text line extraction** (`// Feature: ocr-card-scanner, Property 8`)
    - **Property 10: Confidence clamping**
    - **Validates: Requirements 5.2, 5.4**
    - Generators include empty strings, whitespace-only lines, mixed `\r\n`/`\r`/`\n` newlines, non-ASCII characters, and out-of-range/non-numeric confidence values; min 100 iterations

  - [x] 1.3 Implement `crm/OCR/imageValidation`
    - Create `products/argos-saleslogix/src/OCR/imageValidation.js` as an AMD module
    - Define `SUPPORTED_FORMATS` (png, jpeg, tiff, bmp) and `MAX_BYTES` (10 MB)
    - Implement `normalizeFormat` (lowercase, `jpg`→`jpeg`, null if unknown), `isSupportedFormat`, `isWithinSizeLimit`, `isNonEmpty`, and `canSubmit({ declaredFormat, byteLength })`
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 1.4 Write property tests for `imageValidation`
    - **Property 5: Image format normalization**
    - **Property 6: Submit-enable predicate**
    - **Validates: Requirements 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**
    - Generators include format aliases/case variants, zero-byte and exactly-10 MB images, and unsupported tokens; min 100 iterations

- [x] 2. Implement session-scoped feature availability tracking
  - [x] 2.1 Implement `crm/OCR/FeatureAvailability`
    - Create `products/argos-saleslogix/src/OCR/FeatureAvailability.js` as an AMD module
    - Back the state with the lazily-created `App.context.unsupportedOperations` map, keyed by operation name (default `executeOcr`)
    - Implement `isAvailable(name)` and `markUnavailable(name)` consistent with the `CustomerJourney360Widget` pattern
    - _Requirements: 1.1, 1.3, 1.6, 1.7_

  - [x] 2.2 Write property tests for `FeatureAvailability`
    - **Property 1: Availability round-trip on 404**
    - **Property 2: Non-404 responses leave availability unchanged**
    - **Property 3: New session context resets availability**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.6, 1.7**
    - Use a stubbed `App.context`; reset the context between runs to exercise session reset; min 100 iterations

  - [x] 2.3 Write unit test for availability storage consistency
    - Assert `markUnavailable` writes `App.context.unsupportedOperations[name] = true`, matching the journey-widget storage location
    - _Requirements: 1.7_

- [x] 3. Implement the entity-agnostic OCR service client
  - [x] 3.1 Implement request construction and `recognize` in `crm/OCR/OcrServiceClient`
    - Create `products/argos-saleslogix/src/OCR/OcrServiceClient.js` (`define('crm/OCR/OcrServiceClient', ['./FeatureAvailability', './textLines'], ...)`)
    - Build the `SDataServiceOperationRequest` (`system` contract, `executeOcr` operation) with `request.imageData`, `request.imageFormat`, and `request.language` only when a non-empty token is supplied
    - Enforce the 30-second timeout and route 404 to `FeatureAvailability.markUnavailable`
    - Reference only image input/response — no Lead-specific field names
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 10.1_

  - [x] 3.2 Implement `interpretResponse` classification in `crm/OCR/OcrServiceClient`
    - Classify success (`success===true`): extract `recognizedText` via `textLines.extract`, clamp confidence via `textLines.clampConfidence`
    - Classify failure (`success===false`): use `errorMessage` or substitute a generic recognition-error message
    - Classify 404 (`unavailable:true`, mark unavailable) and transport/timeout (`timedOut`/generic message)
    - Return the normalized `OcrResult` shape
    - _Requirements: 5.1, 5.4, 6.1, 6.6, 1.1_

  - [x] 3.3 Write property tests for `OcrServiceClient`
    - **Property 7: Request body construction**
    - **Property 9: Success-response classification**
    - **Property 11: Error-message substitution**
    - **Property 12: 404 classification marks unavailable**
    - **Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.4, 6.1, 6.6, 1.1**
    - Use a stubbed service/availability; generators include present/absent/empty `errorMessage` and language tokens; min 100 iterations

- [x] 4. Implement the mapping model with bounded undo
  - [x] 4.1 Implement `crm/OCR/MappingModel`
    - Create `products/argos-saleslogix/src/OCR/MappingModel.js` as an AMD module
    - Hold per-field `pending` values and a bounded (max 50) LIFO `undoStack`
    - Implement `assign` (last-write-wins, reject over-length keeping existing value), `clear`, `undo`, `canUndo`, and `toPrepopulationMap` (non-whitespace pending values, truncated to field max length)
    - Keep the model free of DOM/network coupling and Lead-specific identifiers
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2, 8.3, 8.5, 8.6, 9.2, 9.3, 9.5, 10.5_

  - [x] 4.2 Write property tests for `MappingModel`
    - **Property 13: Assignment records pending value (last-write-wins)**
    - **Property 14: Assign/clear round-trip**
    - **Property 15: At most one pending value per field**
    - **Property 16: Over-length assignment is rejected**
    - **Property 17: Field independence on shared lines**
    - **Property 18: Undo stack is bounded and LIFO**
    - **Property 19: Undo restores prior state (full unwind)**
    - **Property 20: Pre-population map contains exactly the non-empty pending values**
    - **Property 21: Pre-population truncation**
    - **Property 23: Parametric reuse across entities**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2, 8.3, 8.5, 8.6, 9.2, 9.3, 9.5, 10.4, 10.5, 10.1**
    - Generators include action sequences exceeding 50 (undo bound), values exactly at/over field maximums, shared lines across fields, and non-Lead target field sets; min 100 iterations

- [x] 5. Checkpoint - core logic modules complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the capture view (`ocr_capture`)
  - [x] 6.1 Implement `crm/Views/OCR/Capture`
    - Create `products/argos-saleslogix/src/Views/OCR/Capture.js` extending `argos/View`
    - Accept the scan configuration via `show(options)`; provide the browse/camera control (`accept="image/*"`, `capture`)
    - On selection: determine declared format, compute byte length, render preview, encode Base64 via a pure helper
    - Gate submission with `imageValidation.canSubmit`; show specific messages for unsupported/oversize/empty without altering the selection; manage submit enabled/disabled and cancel behavior
    - On submit: show progress, block resubmission of the same image, call `OcrServiceClient.recognize`, and handle timeout/error/404-unavailable/no-text/success-routing to `ocr_mapping`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 3.10, 4.4, 4.5, 4.6, 4.7, 5.3, 5.5, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.2 Reuse the shared Base64 encoder
    - Encode image bytes with the existing `crm/Utility.base64ArrayBuffer` (the attachment-proven encoder, `ICRMCommonSDK.utility.base64ArrayBuffer`) instead of a bespoke module
    - **Validates: Requirements 3.3**
    - Encoding behavior is already covered by the existing `Utility.spec` Base64 tests; Property 4 (round-trip) is retired in favor of reuse

  - [x] 6.3 Write unit tests for the capture view
    - Browse control present; preview rendered on selection; cancel retains preview and submit state; in-flight progress and resubmission block; timeout/error branches re-enable submission and retain image; no-text message with recapture
    - _Requirements: 3.1, 3.2, 3.10, 4.4, 4.5, 4.6, 5.5, 6.2, 6.4, 6.5_

- [x] 7. Implement the mapping view (`ocr_mapping`)
  - [x] 7.1 Implement `crm/Views/OCR/Mapping`
    - Create `products/argos-saleslogix/src/Views/OCR/Mapping.js` extending `argos/View`
    - Validate configuration on entry: reject when `targetFields` or `destinationEditView` is missing, retain no state, return an error naming the missing parameter
    - Present target fields and the line list in original order; show confidence as a 0–100 percentage or the no-text message + recapture controls when there are no lines
    - Delegate assign/clear/undo to `MappingModel`; disable undo when the stack is empty; show "nothing to undo", max-length, and undo-failure indications
    - On confirm: build the pre-population entry (truncating over-length values with a flag) and open `destinationEditView` via insert navigation; on open failure retain pending values and show an error
    - _Requirements: 5.3, 5.4, 5.5, 7.1, 7.2, 7.4, 8.4, 8.7, 8.8, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.2, 10.3_

  - [x] 7.2 Write property test for configuration rejection
    - **Property 22: Required configuration rejection**
    - **Validates: Requirements 10.3**
    - Generators include configurations missing target fields, missing destination edit view, or both; min 100 iterations

  - [x] 7.3 Write unit tests for the mapping view
    - Target fields rendered; lines shown in order; confirm opens the edit view with editable pre-populated values; edit-open failure retains pending values + error; undo disabled/"nothing to undo"/undo-failure indications
    - _Requirements: 7.1, 5.3, 8.4, 8.7, 8.8, 9.1, 9.4, 9.6_

- [x] 8. Wire the Lead detail entry point and localization
  - [x] 8.1 Add the OCR quick action to `crm/Views/Lead/Detail`
    - Add `OCR_Quick_Action` to `QuickActionsSection`, with visibility bound to `FeatureAvailability.isAvailable()`
    - On activation: ensure device permission (request when undecided), then show `ocr_capture` with the Lead scan configuration (target fields derived from the Lead edit layout, `destinationEditView: 'lead_edit'`)
    - Handle unavailable activation (message, no navigation) and open/permission failure (message + retry, Lead unchanged)
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 8.2 Add localization strings
    - Add `leadDetail.ocrScanText` (routes the deferred `OCR_Quick_Action_Label` wording) and new `ocrCapture`/`ocrMapping` string sets (validation, error, timeout, unavailable, no-text, max-length, undo, truncation, configuration-error messages)
    - _Requirements: 2.1, 3.4, 3.5, 3.6, 4.7, 5.5, 6.1, 6.6, 7.7, 8.7, 8.8, 9.5, 9.6, 10.3_

  - [x] 8.3 Write unit tests for the Lead detail entry point
    - Action present when available, omitted when unavailable; activation opens capture with scan config; unavailable activation shows message without navigating; permission-undecided requests permission first; open/permission failure shows message + retry with Lead unchanged
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 9. Register views and verify end-to-end wiring
  - [x] 9.1 Register `ocr_capture` and `ocr_mapping` in `crm/ApplicationModule`
    - Register both views (not exposed in navigation) so they can be shown from the Lead detail action and capture-to-mapping transition
    - _Requirements: 2.2, 5.3, 9.1_

  - [x] 9.2 Write integration tests (Playwright)
    - Happy path: select supported image → recognize → map a line → confirm → Lead edit pre-populated
    - 404 path: quick action hidden for the session
    - _Requirements: 2.2, 5.3, 9.1, 9.2, 1.4_

- [ ] 10. Final checkpoint - full feature wired
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All test sub-tasks are required; each property test references its design property by number and the task references specific requirements clauses for traceability.
- Property tests use `fast-check` under the argos-saleslogix Mocha suite at a minimum of 100 iterations, with the traceability comment `// Feature: ocr-card-scanner, Property {number}: {property_text}`.
- The pure modules (`textLines`, `imageValidation`, `FeatureAvailability`, `OcrServiceClient`, `MappingModel`) carry the property-based coverage; views and wiring carry example/integration coverage.
- Run tests with `npm run test -w products/argos-saleslogix` (single run, not watch) and lint with `npm run lint -w products/argos-saleslogix`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "2.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "2.2", "2.3", "3.1", "4.2"] },
    { "id": 2, "tasks": ["3.2", "8.2"] },
    { "id": 3, "tasks": ["3.3", "6.1", "7.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "7.2", "7.3", "8.1", "9.1"] },
    { "id": 5, "tasks": ["8.3", "9.2"] }
  ]
}
```
