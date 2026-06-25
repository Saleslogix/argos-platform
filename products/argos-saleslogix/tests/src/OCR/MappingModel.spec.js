/* eslint-disable */
define('spec/OCR/MappingModel.spec', ['fast-check', 'crm/OCR/MappingModel'], function(fc, MappingModel) {
  // Minimum iterations required by the task for every property.
  var NUM_RUNS = 100;

  // ---- Target-field arbitraries -------------------------------------------
  // Build a set of target fields with distinct `name` and `property` values and
  // varied `maxTextLength`. Names/properties are derived from a unique index so
  // collisions are impossible regardless of how many fields are generated. The
  // set is intentionally entity-agnostic (no Lead-specific identifiers) so the
  // same generator exercises parametric reuse (Property 23).
  function targetFieldsArb() {
    return fc.array(fc.integer({ min: 1, max: 64 }), { minLength: 1, maxLength: 6 })
      .map(function(maxLengths) {
        return maxLengths.map(function(maxTextLength, index) {
          return {
            name: 'field_' + index,
            property: 'Prop' + index,
            maxTextLength: maxTextLength,
          };
        });
      });
  }

  // A non-Lead target field set used to demonstrate the model is driven purely
  // by caller-supplied config (Property 23).
  function nonLeadTargetFieldsArb() {
    return fc.constant([
      { name: 'sku', property: 'ProductSku', maxTextLength: 16 },
      { name: 'qty', property: 'Quantity', maxTextLength: 4 },
      { name: 'warehouse', property: 'WarehouseCode', maxTextLength: 8 },
    ]);
  }

  // Pick a field from a set.
  function fieldFromSet(fields) {
    return fc.constantFrom.apply(fc, fields);
  }

  // A line whose length is within the supplied maximum (includes the empty
  // string and lines exactly at the boundary). Uses simple characters so length
  // equals character count.
  function lineWithinMaxArb(maxTextLength) {
    return fc.string({ minLength: 0, maxLength: maxTextLength });
  }

  // A line whose length strictly exceeds the supplied maximum.
  function lineOverMaxArb(maxTextLength) {
    return fc.string({ minLength: maxTextLength + 1, maxLength: maxTextLength + 8 });
  }

  // A value guaranteed to contain at least one non-whitespace character and to
  // fit within maxTextLength, so it survives the prepopulation content filter.
  function contentLineWithinMaxArb(maxTextLength) {
    // maxTextLength >= 1 for all generated fields, so a single non-space char fits.
    return fc.string({ minLength: 0, maxLength: Math.max(0, maxTextLength - 1) })
      .map(function(rest) {
        var candidate = ('x' + rest);
        return candidate.slice(0, maxTextLength);
      });
  }

  // ---- Reference model action generators ----------------------------------
  // Build a sequence of actions (assign/clear) against a known field set. For
  // assigns we clamp the generated line to the chosen field's max so the assign
  // is always accepted; this lets the reference model treat every action as an
  // applied state transition (rejected assigns are handled separately in the
  // over-length property).
  function actionsArb(fields, opts) {
    var options = opts || {};
    var maxLength = options.maxLength || 120;
    var minLength = options.minLength || 0;

    var singleAction = fieldFromSet(fields).chain(function(field) {
      return fc.boolean().chain(function(isClear) {
        if (isClear) {
          return fc.constant({ type: 'clear', fieldName: field.name });
        }

        return lineWithinMaxArb(field.maxTextLength).map(function(lineText) {
          return { type: 'assign', fieldName: field.name, lineText: lineText };
        });
      });
    });

    return fc.array(singleAction, { minLength: minLength, maxLength: maxLength });
  }

  // Apply a single (always-valid) action to a MappingModel.
  function applyAction(model, action) {
    if (action.type === 'clear') {
      return model.clear(action.fieldName);
    }

    return model.assign(action.fieldName, action.lineText);
  }

  describe('crm/OCR/MappingModel', function() {
    describe('assign last-write-wins (Property 13)', function() {
      // Feature: ocr-card-scanner, Property 13: Assignment records pending value (last-write-wins) — assigning a within-max line sets the field's pending value; a second valid assign to the same field replaces the first so pending equals the most recently assigned line.
      it('records the assigned value and replaces it on a second valid assign', function() {
        fc.assert(
          fc.property(
            targetFieldsArb().chain(function(fields) {
              return fieldFromSet(fields).chain(function(field) {
                return fc.record({
                  fields: fc.constant(fields),
                  field: fc.constant(field),
                  first: lineWithinMaxArb(field.maxTextLength),
                  second: lineWithinMaxArb(field.maxTextLength),
                });
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);

              var r1 = model.assign(sample.field.name, sample.first);
              expect(r1.ok).toBe(true);
              expect(model.pending[sample.field.name]).toEqual(sample.first);

              var r2 = model.assign(sample.field.name, sample.second);
              expect(r2.ok).toBe(true);
              // Last-write-wins: pending equals the most recently assigned line.
              expect(model.pending[sample.field.name]).toEqual(sample.second);
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('assign/clear round-trip (Property 14)', function() {
      // Feature: ocr-card-scanner, Property 14: Assign/clear round-trip — for a field with an assigned pending value, clearing removes it so the field reports no pending value.
      it('clearing an assigned field removes its pending value', function() {
        fc.assert(
          fc.property(
            targetFieldsArb().chain(function(fields) {
              return fieldFromSet(fields).chain(function(field) {
                return fc.record({
                  fields: fc.constant(fields),
                  field: fc.constant(field),
                  lineText: lineWithinMaxArb(field.maxTextLength),
                });
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);

              model.assign(sample.field.name, sample.lineText);
              expect(model.pending.hasOwnProperty(sample.field.name)).toBe(true);

              var result = model.clear(sample.field.name);
              expect(result.ok).toBe(true);
              expect(model.pending.hasOwnProperty(sample.field.name)).toBe(false);
              expect(model.pending[sample.field.name]).toBeUndefined();
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('at most one pending value per field (Property 15)', function() {
      // Feature: ocr-card-scanner, Property 15: At most one pending value per field — for any sequence of assign/clear actions, every field has at most one pending value and never-assigned fields have none.
      it('keeps at most one pending value per field and none for never-assigned fields', function() {
        fc.assert(
          fc.property(
            targetFieldsArb().chain(function(fields) {
              return fc.record({
                fields: fc.constant(fields),
                actions: actionsArb(fields),
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);
              var assignedNames = {};

              sample.actions.forEach(function(action) {
                applyAction(model, action);
              });

              // Track which fields were ever assigned (last action wins for state).
              // Reconstruct expected presence from the model's own pending map:
              // each pending key maps to a single value (string), never an array.
              Object.keys(model.pending).forEach(function(name) {
                expect(typeof model.pending[name]).toBe('string');
              });

              // Every pending key corresponds to a known field name.
              var validNames = sample.fields.map(function(f) { return f.name; });
              Object.keys(model.pending).forEach(function(name) {
                expect(validNames.indexOf(name) >= 0).toBe(true);
              });

              // Fields never named by any action have no pending value.
              sample.actions.forEach(function(action) { assignedNames[action.fieldName] = true; });
              sample.fields.forEach(function(field) {
                if (!assignedNames[field.name]) {
                  expect(model.pending.hasOwnProperty(field.name)).toBe(false);
                }
              });
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('over-length assignment rejected (Property 16)', function() {
      // Feature: ocr-card-scanner, Property 16: Over-length assignment is rejected — assigning a line whose length exceeds the field's maxTextLength is rejected (ok:false) and the field's existing pending value is unchanged.
      it('rejects over-length assignments and preserves the existing pending value', function() {
        fc.assert(
          fc.property(
            targetFieldsArb().chain(function(fields) {
              return fieldFromSet(fields).chain(function(field) {
                return fc.record({
                  fields: fc.constant(fields),
                  field: fc.constant(field),
                  existing: lineWithinMaxArb(field.maxTextLength),
                  overLength: lineOverMaxArb(field.maxTextLength),
                });
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);

              // Seed an existing valid pending value.
              model.assign(sample.field.name, sample.existing);
              var before = model.pending[sample.field.name];
              var stackDepthBefore = model.undoStack.length;

              var result = model.assign(sample.field.name, sample.overLength);
              expect(result.ok).toBe(false);
              expect(result.reason).toEqual('maxLength');

              // Existing pending value is unchanged.
              expect(model.pending[sample.field.name]).toEqual(before);
              // Rejected assign records no undo action.
              expect(model.undoStack.length).toEqual(stackDepthBefore);
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('field independence on shared lines (Property 17)', function() {
      // Feature: ocr-card-scanner, Property 17: Field independence on shared lines — assigning a line to a second field leaves the first field's pending value unchanged.
      it('assigning to a second field leaves the first field unchanged', function() {
        fc.assert(
          fc.property(
            // Need at least two distinct fields.
            fc.array(fc.integer({ min: 1, max: 64 }), { minLength: 2, maxLength: 6 })
              .map(function(maxLengths) {
                return maxLengths.map(function(maxTextLength, index) {
                  return { name: 'field_' + index, property: 'Prop' + index, maxTextLength: maxTextLength };
                });
              })
              .chain(function(fields) {
                // Pick two distinct indices.
                return fc.tuple(
                  fc.integer({ min: 0, max: fields.length - 1 }),
                  fc.integer({ min: 0, max: fields.length - 1 })
                ).chain(function(indices) {
                  var i = indices[0];
                  var j = indices[1] === indices[0] ? (indices[1] + 1) % fields.length : indices[1];
                  var fieldA = fields[i];
                  var fieldB = fields[j];

                  // A shared line that fits both fields' maxima.
                  var sharedMax = Math.min(fieldA.maxTextLength, fieldB.maxTextLength);

                  return fc.record({
                    fields: fc.constant(fields),
                    fieldA: fc.constant(fieldA),
                    fieldB: fc.constant(fieldB),
                    sharedLine: lineWithinMaxArb(sharedMax),
                  });
                });
              }),
            function(sample) {
              var model = new MappingModel(sample.fields);

              model.assign(sample.fieldA.name, sample.sharedLine);
              var aBefore = model.pending[sample.fieldA.name];

              model.assign(sample.fieldB.name, sample.sharedLine);

              // First field retains its pending value; both fields hold the line.
              expect(model.pending[sample.fieldA.name]).toEqual(aBefore);
              expect(model.pending[sample.fieldB.name]).toEqual(sample.sharedLine);
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('undo stack bounded and LIFO (Property 18)', function() {
      // Feature: ocr-card-scanner, Property 18: Undo stack is bounded and LIFO — for any sequence of actions, undoStack never exceeds 50 entries; pushing onto a full stack drops the oldest first; each undo removes the most recently pushed action.
      it('never exceeds 50 entries, drops oldest on overflow, and pops most-recent on undo', function() {
        fc.assert(
          fc.property(
            targetFieldsArb().chain(function(fields) {
              return fc.record({
                fields: fc.constant(fields),
                // Generate sequences that can exceed 50 to exercise the bound.
                actions: actionsArb(fields, { minLength: 0, maxLength: 120 }),
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);
              var expectedStack = []; // mirror of the bounded undo stack

              sample.actions.forEach(function(action) {
                var prev = model.pending.hasOwnProperty(action.fieldName)
                  ? model.pending[action.fieldName]
                  : undefined;

                applyAction(model, action);

                expectedStack.push({ fieldName: action.fieldName, previousValue: prev });
                if (expectedStack.length > 50) {
                  expectedStack.shift(); // oldest dropped first
                }

                // Bound holds after every action.
                expect(model.undoStack.length).toBeLessThanOrEqual(50);
              });

              expect(model.undoStack.length).toEqual(expectedStack.length);

              // Each undo removes the most recently pushed action (LIFO).
              for (var k = expectedStack.length - 1; k >= 0; k--) {
                var topBefore = model.undoStack[model.undoStack.length - 1];
                expect(topBefore.fieldName).toEqual(expectedStack[k].fieldName);

                var stackLenBefore = model.undoStack.length;
                var result = model.undo();
                expect(result.ok).toBe(true);
                expect(result.fieldName).toEqual(expectedStack[k].fieldName);
                expect(model.undoStack.length).toEqual(stackLenBefore - 1);
              }

              // Stack fully drained; further undo reports empty.
              expect(model.canUndo()).toBe(false);
              expect(model.undo()).toEqual({ ok: false, reason: 'empty' });
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('undo restores prior state (Property 19)', function() {
      // Feature: ocr-card-scanner, Property 19: Undo restores prior state (full unwind) — undoing actions restores each affected field to the value held immediately before the action; undoing every action restores the pending map that existed before any action (with total actions <= 50 to stay within the bound).
      it('full unwind restores the original pending map (actions <= 50)', function() {
        fc.assert(
          fc.property(
            targetFieldsArb().chain(function(fields) {
              return fc.record({
                fields: fc.constant(fields),
                // Constrain total actions to <= 50 so the full-unwind assertion
                // is not affected by the stack bound.
                actions: actionsArb(fields, { minLength: 0, maxLength: 50 }),
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);

              // Capture the empty starting map (no actions performed yet).
              var original = {};

              // Snapshot the pending map immediately before each action so we can
              // assert per-action restoration on the way back up.
              var snapshots = [];

              sample.actions.forEach(function(action) {
                snapshots.push(Object.assign({}, model.pending));
                applyAction(model, action);
              });

              // Undo every action; after each undo, pending must equal the
              // snapshot taken immediately before that action was applied.
              for (var k = sample.actions.length - 1; k >= 0; k--) {
                model.undo();
                expect(model.pending).toEqual(snapshots[k]);
              }

              // Undoing every action restores the exact original (empty) map.
              expect(model.pending).toEqual(original);
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('prepopulation contains exactly non-empty pending values (Property 20)', function() {
      // Feature: ocr-card-scanner, Property 20: Pre-population map contains exactly the non-empty pending values — toPrepopulationMap produces an entry (keyed by field.property) for a field iff its pending value contains at least one non-whitespace character; whitespace-only/unassigned fields omitted.
      it('includes a property entry iff the pending value has a non-whitespace character', function() {
        // A pending value that may be: absent, whitespace-only, or has content.
        function pendingForFieldArb(field) {
          return fc.oneof(
            fc.constant(undefined),
            // Whitespace-only, within max length.
            fc.stringOf(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: field.maxTextLength }),
            // Has content, within max length.
            contentLineWithinMaxArb(field.maxTextLength)
          );
        }

        fc.assert(
          fc.property(
            targetFieldsArb().chain(function(fields) {
              return fc.tuple.apply(fc, fields.map(pendingForFieldArb)).map(function(values) {
                return { fields: fields, values: values };
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);

              // Seed pending directly only for defined values, mirroring assigns.
              sample.fields.forEach(function(field, index) {
                var value = sample.values[index];
                if (value !== undefined) {
                  model.assign(field.name, value);
                }
              });

              var map = model.toPrepopulationMap();

              sample.fields.forEach(function(field, index) {
                var value = sample.values[index];
                var hasContent = typeof value === 'string' && value.trim().length > 0;

                if (hasContent) {
                  expect(map.hasOwnProperty(field.property)).toBe(true);
                  expect(map[field.property]).toEqual(value);
                } else {
                  expect(map.hasOwnProperty(field.property)).toBe(false);
                }
              });
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('prepopulation truncation (Property 21)', function() {
      // Feature: ocr-card-scanner, Property 21: Pre-population truncation — for any pending value and field maxTextLength, the pre-populated value length is at most the maximum and equals the value truncated to that maximum.
      it('truncates included values to the field maximum length', function() {
        // assign rejects over-length lines, so seed pending directly to model an
        // over-length pending value reaching toPrepopulationMap (e.g. a value
        // already present before a max change, or content set bypassing assign).
        fc.assert(
          fc.property(
            targetFieldsArb().chain(function(fields) {
              return fieldFromSet(fields).chain(function(field) {
                return fc.record({
                  fields: fc.constant(fields),
                  field: fc.constant(field),
                  // A content value that may be within or over the field maximum.
                  value: fc.string({ minLength: 1, maxLength: field.maxTextLength + 10 })
                    .map(function(s) { return 'x' + s; }),
                });
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);

              // Seed pending directly to allow over-length values to be present.
              model.pending[sample.field.name] = sample.value;

              var map = model.toPrepopulationMap();
              var result = map[sample.field.property];

              // The value has content, so it must be present.
              expect(result).toBeDefined();
              // Length at most the field maximum.
              expect(result.length).toBeLessThanOrEqual(sample.field.maxTextLength);
              // Equals the value truncated to the maximum.
              expect(result).toEqual(sample.value.slice(0, sample.field.maxTextLength));
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });

    describe('parametric reuse across entities (Property 23)', function() {
      // Feature: ocr-card-scanner, Property 23: Parametric reuse across entities — for any caller-supplied target field set (including non-Lead field sets) and any lines, mapping/pre-population behavior is determined solely by the supplied config (names, properties, maxTextLength), producing a map keyed by those properties with no Lead-specific dependence.
      it('produces a map keyed solely by the supplied field properties', function() {
        fc.assert(
          fc.property(
            nonLeadTargetFieldsArb().chain(function(fields) {
              return fc.tuple.apply(fc, fields.map(function(field) {
                return fc.oneof(
                  fc.constant(undefined),
                  contentLineWithinMaxArb(field.maxTextLength)
                );
              })).map(function(values) {
                return { fields: fields, values: values };
              });
            }),
            function(sample) {
              var model = new MappingModel(sample.fields);

              sample.fields.forEach(function(field, index) {
                var value = sample.values[index];
                if (value !== undefined) {
                  model.assign(field.name, value);
                }
              });

              var map = model.toPrepopulationMap();

              // Every key in the map is one of the supplied field properties.
              var allowedProperties = sample.fields.map(function(f) { return f.property; });
              Object.keys(map).forEach(function(key) {
                expect(allowedProperties.indexOf(key) >= 0).toBe(true);
              });

              // Behavior matches the config: content values appear under their
              // property, others are omitted.
              sample.fields.forEach(function(field, index) {
                var value = sample.values[index];
                var hasContent = typeof value === 'string' && value.trim().length > 0;
                if (hasContent) {
                  expect(map[field.property]).toEqual(value);
                } else {
                  expect(map.hasOwnProperty(field.property)).toBe(false);
                }
              });
            }
          ),
          { numRuns: NUM_RUNS }
        );
      });
    });
  });
});
