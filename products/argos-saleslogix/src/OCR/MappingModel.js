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
 * @module crm/OCR/MappingModel
 *
 * Pure mapping state for the OCR text-to-field mapping experience. Holds the
 * per-field pending values and a bounded, last-in-first-out undo stack, and
 * produces the property-keyed map used to pre-populate a destination edit view.
 *
 * The model is intentionally free of DOM and network coupling, and carries no
 * Lead-specific identifiers: target fields and their destination properties are
 * supplied by the caller, so the same model serves any entity. This keeps the
 * model straightforward to exercise with property-based tests.
 */
define('crm/OCR/MappingModel', [], () => {
  // Undo_Stack upper bound; the stack never exceeds this many entries (Req 8.1, 8.6).
  const MAX_UNDO = 50;

  /**
   * Whether a value contains at least one non-whitespace character (Req 9.2).
   * @param {*} value The candidate pending value.
   * @returns {boolean} True if the value is a non-empty, non-whitespace string.
   */
  function hasContent(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  class MappingModel {
    /**
     * @param {Array<{ name: string, property: string, maxTextLength: number }>} targetFields
     *   Caller-supplied target field descriptors (entity-agnostic).
     */
    constructor(targetFields) {
      this.fields = Array.isArray(targetFields) ? targetFields : [];
      this.pending = {}; // fieldName -> pending value (at most one per field; Req 7.5)
      this.undoStack = []; // [{ fieldName, previousValue, nextValue }] (LIFO; Req 8.1)
    }

    /**
     * Assign a Text_Line to a target field as its pending value, using
     * last-write-wins semantics so a later assignment replaces an earlier one
     * for the same field (Req 7.2, 7.3). Assigning to one field never affects
     * another field's pending value (Req 7.8). When the line length exceeds the
     * field's maximum length the assignment is rejected and the existing pending
     * value is left unchanged (Req 7.7). Successful assignments are recorded on
     * the undo stack (Req 8.1, 8.6).
     *
     * @param {string} fieldName The target field name.
     * @param {string} lineText The Text_Line text to assign.
     * @returns {{ ok: boolean, reason?: string }} Status of the assignment.
     */
    assign(fieldName, lineText) {
      const field = this._field(fieldName);

      if (!field) {
        return { ok: false, reason: 'unknownField' };
      }

      if (typeof lineText === 'string' && lineText.length > field.maxTextLength) {
        return { ok: false, reason: 'maxLength' }; // Req 7.7: reject, keep existing value
      }

      this._record(fieldName, this.pending[fieldName], lineText);
      this.pending[fieldName] = lineText;

      return { ok: true };
    }

    /**
     * Clear a target field's pending value and record the action so it can be
     * reverted (Req 7.4). Clearing a field leaves all other fields unchanged.
     *
     * @param {string} fieldName The target field name to clear.
     * @returns {{ ok: boolean }} Status of the clear.
     */
    clear(fieldName) {
      this._record(fieldName, this.pending[fieldName], undefined);
      delete this.pending[fieldName];

      return { ok: true };
    }

    /**
     * Revert the most recent Mapping_Action, restoring the affected field to the
     * pending value it held immediately before that action and removing the
     * action from the top of the undo stack (Req 8.2, 8.3, 8.5). When the stack
     * is empty no field is changed and a nothing-to-undo status is returned so
     * the caller can surface the appropriate indication (Req 8.7).
     *
     * @returns {{ ok: boolean, fieldName?: string, reason?: string }} Undo status.
     */
    undo() {
      if (this.undoStack.length === 0) {
        return { ok: false, reason: 'empty' };
      }

      const action = this.undoStack.pop();

      if (action.previousValue === undefined) {
        delete this.pending[action.fieldName];
      } else {
        this.pending[action.fieldName] = action.previousValue;
      }

      return { ok: true, fieldName: action.fieldName };
    }

    /**
     * Whether there is at least one Mapping_Action available to undo (Req 8.4).
     * @returns {boolean} True if the undo stack is non-empty.
     */
    canUndo() {
      return this.undoStack.length > 0;
    }

    /**
     * Produce the pre-population map keyed by each field's destination
     * `property`, including only fields whose pending value contains at least
     * one non-whitespace character (Req 9.2, 9.3, 10.5). Values longer than the
     * field's maximum length are truncated to that maximum (Req 9.5). Keying by
     * the caller-supplied `property` keeps the output entity-agnostic.
     *
     * @returns {Object<string, string>} Map of destination property to value.
     */
    toPrepopulationMap() {
      return this.fields.reduce((map, field) => {
        const value = this.pending[field.name];

        if (hasContent(value)) {
          map[field.property] = value.length > field.maxTextLength
            ? value.slice(0, field.maxTextLength)
            : value;
        }

        return map;
      }, {});
    }

    /**
     * Look up a target field descriptor by its logical name.
     * @param {string} fieldName The field name to resolve.
     * @returns {{ name: string, property: string, maxTextLength: number }|undefined}
     *   The matching descriptor, or undefined when no field matches.
     */
    _field(fieldName) {
      return this.fields.find(field => field.name === fieldName);
    }

    /**
     * Push a Mapping_Action onto the undo stack, dropping the oldest entry from
     * the bottom when the stack is already full so it never exceeds MAX_UNDO
     * (Req 8.1, 8.6).
     *
     * @param {string} fieldName The affected field name.
     * @param {string|undefined} previousValue The pending value before the action.
     * @param {string|undefined} nextValue The assigned value, or undefined for clear.
     */
    _record(fieldName, previousValue, nextValue) {
      this.undoStack.push({ fieldName, previousValue, nextValue });

      if (this.undoStack.length > MAX_UNDO) {
        this.undoStack.shift(); // Req 8.6: drop oldest, never exceed 50
      }
    }
  }

  return MappingModel;
});
