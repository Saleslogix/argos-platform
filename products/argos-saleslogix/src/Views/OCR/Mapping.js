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
 * @module crm/Views/OCR/Mapping
 *
 * The OCR mapping view (`ocr_mapping`). Accepts the caller-supplied scan
 * configuration and the recognized Text_Lines, presents the target fields and
 * the lines in their original order, and lets the user assign/clear lines and
 * undo mapping actions through a `crm/OCR/MappingModel`. On confirmation it
 * builds the property-keyed pre-population entry (truncating any over-length
 * value and flagging the truncation) and opens the destination edit view via
 * insert navigation so the mapped values arrive editable.
 *
 * The view is entity-agnostic: the target field set and destination edit view
 * are supplied through the scan configuration, so future entities reuse it
 * without modification. Invocation without a target field set or a destination
 * edit view is rejected, no mapping state is retained, and the configuration
 * error names the missing required parameter.
 */
define('crm/Views/OCR/Mapping', [
  'dojo/_base/declare',
  'argos/View',
  'argos/I18n',
  '../../OCR/textLines',
  '../../OCR/MappingModel',
], (declare, View, getResource, textLines, MappingModel) => {
  // Resolve the localization set defensively. The `ocrMapping` string set is
  // added by a later task; until then (and to keep the view usable standalone)
  // the local *Text defaults below are used whenever a key is absent.
  function getResourceSafe(id) {
    try {
      return getResource(id) || {};
    } catch (err) {
      return {};
    }
  }

  const resource = getResourceSafe('ocrMapping');

  const __class = declare('crm.Views.OCR.Mapping', [View], {
    // Templates
    widgetTemplate: new Simplate([
      '<div id="{%= $.id %}" data-title="{%: $.titleText %}" class="view ocr-mapping">',
      '<div class="wrapper">',
      '<section class="ocr-mapping-panel" role="main">',
      // Configuration error (Req 10.3): shown when invoked without required config.
      '<div class="ocr-mapping-config-error" data-dojo-attach-point="configErrorNode" role="alert" style="display: none;"></div>',
      // Normal mapping surface.
      '<div class="ocr-mapping-content" data-dojo-attach-point="contentNode">',
      '<p class="ocr-mapping-confidence" data-dojo-attach-point="confidenceNode" style="display: none;"></p>',
      // No-text state (Req 5.5): message + recapture/upload controls.
      '<div class="ocr-mapping-no-text" data-dojo-attach-point="noTextNode" style="display: none;">',
      '<p class="ocr-mapping-no-text-message">{%: $.noTextText %}</p>',
      '<button data-action="recapture" class="btn-primary ocr-mapping-recapture">{%: $.recaptureText %}</button>',
      '</div>',
      // Lines + fields surface.
      '<div class="ocr-mapping-lines" data-dojo-attach-point="linesSectionNode">',
      '<h3 class="ocr-mapping-lines-title">{%: $.linesTitleText %}</h3>',
      '<ul class="ocr-mapping-line-list" data-dojo-attach-point="linesContainerNode"></ul>',
      '</div>',
      '<div class="ocr-mapping-fields" data-dojo-attach-point="fieldsSectionNode">',
      '<h3 class="ocr-mapping-fields-title">{%: $.fieldsTitleText %}</h3>',
      '<ul class="ocr-mapping-field-list" data-dojo-attach-point="fieldsContainerNode"></ul>',
      '</div>',
      // Indications (max-length, undo failure, truncation, undo-empty).
      '<div class="ocr-mapping-message" data-dojo-attach-point="messageNode" role="alert" style="display: none;"></div>',
      // Actions.
      '<div class="ocr-mapping-actions">',
      '<button data-action="undo" data-dojo-attach-point="undoButton" class="btn-secondary ocr-mapping-undo" disabled>{%: $.undoText %}</button>',
      '<button data-action="confirm" data-dojo-attach-point="confirmButton" class="btn-primary ocr-mapping-confirm">{%: $.confirmText %}</button>',
      '</div>',
      '</div>',
      '</section>',
      '</div>',
      '</div>',
    ]),

    // Item template for a recognized line. The text is editable (so a messy
    // line can be trimmed before mapping), and a Split action breaks the line
    // into separate lines on whitespace. The selected line carries the
    // `selected` class so the next assignment targets it.
    lineItemTemplate: new Simplate([
      '<li class="ocr-mapping-line {% if ($.selected) { %}selected{% } %}" data-line-index="{%= $.index %}">',
      '<input type="text" class="ocr-mapping-line-input" data-line-index="{%= $.index %}" value="{%: $.text %}" aria-label="{%: $$.lineInputLabelText %}" />',
      '<button data-action="splitLine" data-line-index="{%= $.index %}" class="btn-secondary ocr-mapping-split">{%: $$.splitText %}</button>',
      '</li>',
    ]),

    // Item template for a target field showing its current pending value and
    // the assign/clear controls. Grouped fields (e.g. address sub-fields) carry
    // an extra class so they can be visually indented under a group header.
    fieldItemTemplate: new Simplate([
      '<li class="ocr-mapping-field{% if ($.grouped) { %} ocr-mapping-field-grouped{% } %}" data-field-name="{%= $.name %}">',
      '<span class="ocr-mapping-field-label">{%: $.label %}</span>',
      '<span class="ocr-mapping-field-value">{%: $.value %}</span>',
      '<button data-action="assignField" data-field-name="{%= $.name %}" class="btn-secondary ocr-mapping-assign">{%: $$.assignText %}</button>',
      '<button data-action="clearField" data-field-name="{%= $.name %}" class="btn-secondary ocr-mapping-clear"{% if (!$.hasValue) { %} disabled{% } %}>{%: $$.clearText %}</button>',
      '</li>',
    ]),

    // Header row introducing a group of related target fields (e.g. Address).
    fieldGroupHeaderTemplate: new Simplate([
      '<li class="ocr-mapping-field-group"><span class="ocr-mapping-field-group-label">{%: $.label %}</span></li>',
    ]),

    // View id
    id: 'ocr_mapping',

    // Localization (local defaults; overlaid by the `ocrMapping` set when present)
    titleText: resource.titleText || 'Map Card Text',
    linesTitleText: resource.linesTitleText || 'Recognized Text',
    fieldsTitleText: resource.fieldsTitleText || 'Fields',
    confidenceText: resource.confidenceText || 'Confidence',
    assignText: resource.assignText || 'Assign',
    clearText: resource.clearText || 'Clear',
    splitText: resource.splitText || 'Split',
    lineInputLabelText: resource.lineInputLabelText || 'Recognized text line',
    splitHintText: resource.splitHintText
      || 'Place the cursor where you want to split the line, then Split (or press Enter).',
    undoText: resource.undoText || 'Undo',
    confirmText: resource.confirmText || 'Confirm',
    recaptureText: resource.recaptureText || 'Capture another image',
    noTextText: resource.noTextText
      || 'No text was recognized. Capture or upload another image.',
    noLineSelectedText: resource.noLineSelectedText
      || 'Select a recognized line before assigning it to a field.',
    maxLengthText: resource.maxLengthText
      || 'That text is too long for this field and was not assigned.',
    nothingToUndoText: resource.nothingToUndoText
      || 'There is no mapping action to undo.',
    undoFailedText: resource.undoFailedText
      || 'The undo could not be completed.',
    truncatedText: resource.truncatedText
      || 'One or more values were shortened to fit the field length.',
    configErrorText: resource.configErrorText
      || 'The card mapping screen is missing required configuration: ',
    openFailedText: resource.openFailedText
      || 'The edit screen could not be opened. Your mapped values were kept.',

    // Id of the capture view to return to for recapture (Req 5.5).
    captureView: 'ocr_capture',

    // Internal state
    // _scanConfig: caller-supplied scan configuration
    // _model: MappingModel instance (null until a valid configuration is given)
    // _lines: extracted Text_Lines in original order
    // _confidence: clamped confidence score
    // _selectedLineIndex: index of the currently selected line (-1 when none)
    // _configError: configuration error message when invocation is rejected
    // _undoLog: unified action log (mapping actions + line splits) for undo
    _scanConfig: null,
    _model: null,
    _lines: null,
    _confidence: 0,
    _selectedLineIndex: -1,
    _configError: null,
    _undoLog: null,

    /**
     * Wire delegated listeners on the line list so editing a line keeps the
     * model in sync and focusing a line selects it for the next assignment.
     */
    postCreate: function postCreate() {
      this.inherited(postCreate, arguments);

      if (this.linesContainerNode) {
        this.linesContainerNode.addEventListener('input', this._onLineInput.bind(this));
        this.linesContainerNode.addEventListener('focusin', this._onLineFocus.bind(this));
        this.linesContainerNode.addEventListener('keydown', this._onLineKeydown.bind(this));
      }
    },

    /**
     * Keep the line model in sync as the user edits a recognized line inline.
     * @param {Event} evt
     * @private
     */
    _onLineInput: function _onLineInput(evt) {
      const node = evt && evt.target;

      if (!node || !node.classList || !node.classList.contains('ocr-mapping-line-input')) {
        return;
      }

      const index = parseInt(node.getAttribute('data-line-index'), 10);

      if (!isNaN(index) && this._lines && index >= 0 && index < this._lines.length) {
        this._lines[index] = node.value;
      }
    },

    /**
     * Select the focused line so a subsequent assignment targets it. Updates
     * the selection highlight without a full re-render (which would steal focus
     * mid-edit).
     * @param {Event} evt
     * @private
     */
    _onLineFocus: function _onLineFocus(evt) {
      const node = evt && evt.target;

      if (!node || !node.classList || !node.classList.contains('ocr-mapping-line-input')) {
        return;
      }

      const index = parseInt(node.getAttribute('data-line-index'), 10);

      if (isNaN(index)) {
        return;
      }

      this._selectedLineIndex = index;
      this._highlightSelectedLine(index);
    },

    /**
     * Toggle the `selected` class on the line rows to reflect the current
     * selection without rebuilding the inputs.
     * @param {number} index
     * @private
     */
    _highlightSelectedLine: function _highlightSelectedLine(index) {
      if (!this.linesContainerNode) {
        return;
      }

      const items = this.linesContainerNode.querySelectorAll('.ocr-mapping-line');

      Array.prototype.forEach.call(items, (li) => {
        const liIndex = parseInt(li.getAttribute('data-line-index'), 10);

        if (liIndex === index) {
          li.classList.add('selected');
        } else {
          li.classList.remove('selected');
        }
      });
    },

    /**
     * Split a recognized line at the caret position of its input into two
     * lines. Splitting at the cursor (rather than on every whitespace) gives
     * precise control — e.g. for a line like "1234 Elm St, Anytown, USA" the
     * user places the cursor and splits only where needed. Triggered by the
     * Split control; Enter in the input does the same.
     * @param {Object} params The `data-` attributes from the split control.
     * @private
     */
    splitLine: function splitLine(params) {
      const index = parseInt(params && params.lineIndex, 10);

      if (isNaN(index) || !this._lines || index < 0 || index >= this._lines.length) {
        return;
      }

      const input = this.linesContainerNode
        && this.linesContainerNode.querySelector(`.ocr-mapping-line-input[data-line-index="${index}"]`);

      if (input) {
        // Sync any in-progress edit before splitting.
        this._lines[index] = input.value;
      }

      const position = input ? input.selectionStart : null;

      if (!this._splitLineAt(index, position)) {
        this._displayMessage(this.splitHintText);
      }
    },

    /**
     * Split a line at Enter, at the caret position.
     * @param {KeyboardEvent} evt
     * @private
     */
    _onLineKeydown: function _onLineKeydown(evt) {
      if (!evt || (evt.key !== 'Enter' && evt.keyCode !== 13)) {
        return;
      }

      const node = evt.target;

      if (!node || !node.classList || !node.classList.contains('ocr-mapping-line-input')) {
        return;
      }

      evt.preventDefault();

      const index = parseInt(node.getAttribute('data-line-index'), 10);

      if (isNaN(index) || !this._lines || index < 0 || index >= this._lines.length) {
        return;
      }

      this._lines[index] = node.value;

      if (!this._splitLineAt(index, node.selectionStart)) {
        this._displayMessage(this.splitHintText);
      }
    },

    /**
     * Split the line at `index` into two lines at `position`, trimming each
     * part. A split is only performed when the position is strictly inside the
     * text and both resulting parts are non-empty; otherwise it is a no-op.
     * Records the prior line state so the split can be undone.
     * @param {number} index
     * @param {number} position Caret position to split at.
     * @returns {boolean} True when a split was performed.
     * @private
     */
    _splitLineAt: function _splitLineAt(index, position) {
      if (!this._lines || index < 0 || index >= this._lines.length) {
        return false;
      }

      const text = String(this._lines[index]);

      if (typeof position !== 'number' || isNaN(position) || position <= 0 || position >= text.length) {
        return false;
      }

      const first = text.slice(0, position).trim();
      const second = text.slice(position).trim();

      if (!first || !second) {
        return false;
      }

      this._pushLinesUndo();
      this._lines.splice(index, 1, first, second);
      this._selectedLineIndex = -1;
      this._clearMessage();
      this._renderLines();
      this._updateUndoState();

      return true;
    },

    /**
     * Snapshot the current line state onto the undo log so a split can be
     * reverted through the same Undo control as mapping actions.
     * @private
     */
    _pushLinesUndo: function _pushLinesUndo() {
      this._ensureUndoLog().push({
        type: 'lines',
        lines: this._lines.slice(),
        selected: this._selectedLineIndex,
      });
    },

    /**
     * Lazily create the unified undo log (also resilient to the test harness
     * priming state without calling `show`).
     * @returns {Array}
     * @private
     */
    _ensureUndoLog: function _ensureUndoLog() {
      if (!this._undoLog) {
        this._undoLog = [];
      }

      return this._undoLog;
    },

    /**
     * Show the mapping view. Validates the supplied configuration first: when
     * the target field set or destination edit view is missing the invocation
     * is rejected, no mapping state is retained, and a configuration error
     * naming the missing parameter is surfaced (Req 10.2, 10.3). Otherwise the
     * model is built and the lines/fields are rendered (Req 5.3, 5.4, 5.5, 7.1).
     *
     * @param {Object} options
     * @param {string[]} options.lines The extracted Text_Lines.
     * @param {number} [options.confidence] The confidence score (0..100).
     * @param {Object} options.scanConfig The caller-supplied scan configuration
     *   ({ targetFields, destinationEditView, entityContext? }).
     */
    show: function show(options) {
      this.inherited(show, arguments);

      const opts = options || {};
      const scanConfig = opts.scanConfig || {};

      // Reset any state from a prior invocation so nothing leaks across shows.
      this._resetState();

      const validation = this.validateConfiguration(scanConfig);

      if (!validation.ok) {
        // Reject the invocation, retain no mapping state (Req 10.3).
        this._configError = validation.message;
        this._renderConfigError(validation.message);
        return;
      }

      this._scanConfig = scanConfig;
      this._lines = Array.isArray(opts.lines) ? opts.lines.slice() : [];
      this._confidence = textLines.clampConfidence(opts.confidence);
      this._model = new MappingModel(scanConfig.targetFields);

      this._render();
    },

    /**
     * Validate the scan configuration. The target field set (a non-empty array)
     * and the destination edit view (a non-empty string) are both required; the
     * returned error names whichever required parameter(s) are missing
     * (Req 10.2, 10.3).
     *
     * @param {Object} scanConfig The configuration to validate.
     * @returns {{ ok: boolean, missing: string[], message: string }}
     */
    validateConfiguration: function validateConfiguration(scanConfig) {
      const config = scanConfig || {};
      const missing = [];

      if (!Array.isArray(config.targetFields) || config.targetFields.length === 0) {
        missing.push('targetFields');
      }

      if (typeof config.destinationEditView !== 'string' || config.destinationEditView.length === 0) {
        missing.push('destinationEditView');
      }

      if (missing.length > 0) {
        return {
          ok: false,
          missing,
          message: this.configErrorText + missing.join(', '),
        };
      }

      return { ok: true, missing, message: '' };
    },

    /**
     * Reset all per-invocation state so a fresh show starts clean and a rejected
     * invocation retains no mapping state (Req 10.3).
     * @private
     */
    _resetState: function _resetState() {
      this._scanConfig = null;
      this._model = null;
      this._lines = null;
      this._confidence = 0;
      this._selectedLineIndex = -1;
      this._configError = null;
      this._undoLog = [];

      this._clearMessage();

      if (this.configErrorNode) {
        this.configErrorNode.style.display = 'none';
        this.configErrorNode.textContent = '';
      }
    },

    /**
     * Render the mapping surface: confidence, the line list, and the fields, or
     * the no-text state when there are no recognized lines (Req 5.5).
     * @private
     */
    _render: function _render() {
      if (this.configErrorNode) {
        this.configErrorNode.style.display = 'none';
      }

      if (this.contentNode) {
        this.contentNode.style.display = 'block';
      }

      const hasLines = this._lines.length > 0;

      this._renderNoText(!hasLines);

      if (!hasLines) {
        return;
      }

      this._renderConfidence();
      this._renderLines();
      this._renderFields();
      this._updateUndoState();
    },

    /**
     * Toggle the no-text state. When there are no lines the no-text message and
     * recapture controls are shown and the mapping controls/confidence are
     * hidden, with the confidence omitted entirely (Req 5.5).
     * @param {boolean} noText
     * @private
     */
    _renderNoText: function _renderNoText(noText) {
      if (this.noTextNode) {
        this.noTextNode.style.display = noText ? 'block' : 'none';
      }

      const surfaceDisplay = noText ? 'none' : 'block';

      [this.linesSectionNode, this.fieldsSectionNode, this.confirmButton, this.undoButton]
        .forEach((node) => {
          if (node) {
            node.style.display = surfaceDisplay;
          }
        });

      if (noText && this.confidenceNode) {
        this.confidenceNode.style.display = 'none';
      }
    },

    /**
     * Display the confidence score as a 0..100 percentage (Req 5.4).
     * @private
     */
    _renderConfidence: function _renderConfidence() {
      if (!this.confidenceNode) {
        return;
      }

      this.confidenceNode.textContent = `${this.confidenceText}: ${this._confidence}%`;
      this.confidenceNode.style.display = 'block';
    },

    /**
     * Render the recognized lines in their original order, marking the selected
     * line (Req 5.3).
     * @private
     */
    _renderLines: function _renderLines() {
      if (!this.linesContainerNode) {
        return;
      }

      const html = this._lines
        .map((text, index) => this.lineItemTemplate.apply({
          text,
          index,
          selected: index === this._selectedLineIndex,
        }, this))
        .join('');

      this.linesContainerNode.innerHTML = html;
    },

    /**
     * Render the target fields with their current pending values and controls
     * (Req 7.1, 7.2, 7.4).
     * @private
     */
    _renderFields: function _renderFields() {
      if (!this.fieldsContainerNode || !this._model) {
        return;
      }

      let html = '';
      let currentGroup = null;

      this._model.fields.forEach((field) => {
        const group = field.group || null;

        // Emit a group header when entering a new group (e.g. Address).
        if (group && group !== currentGroup) {
          html += this.fieldGroupHeaderTemplate.apply({ label: group }, this);
        }

        currentGroup = group;

        const value = this._model.pending[field.name];
        const hasValue = typeof value === 'string' && value.length > 0;

        html += this.fieldItemTemplate.apply({
          name: field.name,
          label: field.label || field.name,
          value: hasValue ? value : '',
          hasValue,
          grouped: !!group,
        }, this);
      });

      this.fieldsContainerNode.innerHTML = html;
    },

    /**
     * Select the recognized line the user tapped so a subsequent assignment
     * targets it.
     * @param {Object} params The `data-` attributes from the line element.
     * @private
     */
    selectLine: function selectLine(params) {
      const index = parseInt(params && params.lineIndex, 10);

      if (isNaN(index) || index < 0 || index >= this._lines.length) {
        return;
      }

      this._selectedLineIndex = index;
      this._clearMessage();
      this._renderLines();
    },

    /**
     * Assign the currently selected line to a target field (Req 7.2, 7.3, 7.8).
     * Rejects when no line is selected, and surfaces the max-length indication
     * when the line is too long for the field, leaving the existing value
     * unchanged (Req 7.7).
     * @param {Object} params The `data-` attributes from the field element.
     * @private
     */
    assignField: function assignField(params) {
      const fieldName = params && params.fieldName;

      if (!fieldName || !this._model) {
        return;
      }

      if (this._selectedLineIndex < 0 || this._selectedLineIndex >= this._lines.length) {
        this._displayMessage(this.noLineSelectedText);
        return;
      }

      const lineText = this._lines[this._selectedLineIndex];
      const result = this._model.assign(fieldName, lineText);

      if (!result.ok) {
        if (result.reason === 'maxLength') {
          // Req 7.7: reject, keep the existing pending value, indicate the limit.
          this._displayMessage(this.maxLengthText);
        }

        return;
      }

      this._clearMessage();
      this._ensureUndoLog().push({ type: 'model' });
      this._renderFields();
      this._updateUndoState();
    },

    /**
     * Clear a target field's pending value (Req 7.4).
     * @param {Object} params The `data-` attributes from the field element.
     * @private
     */
    clearField: function clearField(params) {
      const fieldName = params && params.fieldName;

      if (!fieldName || !this._model) {
        return;
      }

      this._model.clear(fieldName);
      this._clearMessage();
      this._ensureUndoLog().push({ type: 'model' });
      this._renderFields();
      this._updateUndoState();
    },

    /**
     * Revert the most recent action — a mapping assign/clear or a line split —
     * through a single unified undo log so splits are undoable just like
     * mapping actions (Req 8.2, 8.3, 8.5). When nothing is available a
     * nothing-to-undo indication is shown (Req 8.7); when a model revert cannot
     * complete the action is retained and an undo-failure indication is shown
     * (Req 8.8).
     * @private
     */
    undo: function undo() {
      if (!this._undoLog || this._undoLog.length === 0) {
        // Req 8.7: nothing to undo.
        this._displayMessage(this.nothingToUndoText);
        return;
      }

      const top = this._undoLog[this._undoLog.length - 1];

      // Line split: restore the prior line state.
      if (top.type === 'lines') {
        this._undoLog.pop();
        this._lines = top.lines.slice();
        this._selectedLineIndex = (typeof top.selected === 'number') ? top.selected : -1;
        this._clearMessage();
        this._renderLines();
        this._updateUndoState();
        return;
      }

      // Mapping action (assign/clear): delegate to the model.
      if (!this._model || !this._model.canUndo()) {
        // Defensive: marker without a model action; drop it.
        this._undoLog.pop();
        this._updateUndoState();
        return;
      }

      const result = this._model.undo();

      if (!result.ok) {
        // Req 8.8: undo did not complete; field and action retained.
        this._displayMessage(this.undoFailedText);
        return;
      }

      this._undoLog.pop();
      this._clearMessage();
      this._renderFields();
      this._updateUndoState();
    },

    /**
     * Reflect the undo state on the undo control, disabling it while there is
     * nothing to undo (Req 8.4).
     * @private
     */
    _updateUndoState: function _updateUndoState() {
      if (this.undoButton) {
        this.undoButton.disabled = !(this._undoLog && this._undoLog.length > 0);
      }
    },

    /**
     * Confirm the mapping: build the property-keyed pre-population entry from
     * the non-empty pending values, truncating any over-length value to its
     * field maximum and flagging the truncation (Req 9.2, 9.3, 9.5), merge it
     * over any entity context, and open the destination edit view via insert
     * navigation so the pre-filled values arrive editable (Req 9.1, 9.4). On
     * open failure the pending values are retained and an error is shown
     * (Req 9.6).
     * @private
     */
    confirm: function confirm() {
      if (!this._model || !this._scanConfig) {
        return;
      }

      const prepopulation = this._model.toPrepopulationMap();

      if (this._wasTruncated()) {
        this._displayMessage(this.truncatedText);
      }

      const entityContext = this._scanConfig.entityContext || {};
      const entry = this._buildEntry(prepopulation, entityContext);

      if (!this._openEditView(entry)) {
        // Req 9.6: retain pending values, indicate the edit screen failed.
        this._displayMessage(this.openFailedText);
      }
    },

    /**
     * Build the edit-view entry from the entity context and the pre-population
     * map. Dotted property keys (e.g. `Address.City`) are expanded into nested
     * objects so composite fields like the address arrive in the shape the edit
     * view expects.
     * @param {Object} prepopulation Property-keyed pre-population map.
     * @param {Object} entityContext Optional defaults merged into the entry.
     * @returns {Object} The assembled edit-view entry.
     * @private
     */
    _buildEntry: function _buildEntry(prepopulation, entityContext) {
      const entry = Object.assign({}, entityContext);

      const fieldsByProperty = {};
      if (this._model && Array.isArray(this._model.fields)) {
        this._model.fields.forEach((field) => {
          if (field && field.property) {
            fieldsByProperty[field.property] = field;
          }
        });
      }

      Object.keys(prepopulation).forEach((key) => {
        const value = prepopulation[key];
        const field = fieldsByProperty[key];

        // A composite name field maps to separate name parts on the entry
        // (the formatted LeadNameLastFirst is read-only), so split it.
        if (field && field.nameField) {
          this._applyNameParts(entry, value);
          return;
        }

        if (key.indexOf('.') < 0) {
          entry[key] = value;
          return;
        }

        const parts = key.split('.');
        let target = entry;

        for (let i = 0; i < parts.length - 1; i += 1) {
          const part = parts[i];

          if (!target[part] || typeof target[part] !== 'object') {
            target[part] = {};
          }

          target = target[part];
        }

        target[parts[parts.length - 1]] = value;

        // `target` is the immediate child object (e.g. entry.Address). Apply any
        // configured child defaults (e.g. IsPrimary) and ensure the child never
        // carries a key, so the server treats it as a brand-new child and wires
        // the parent foreign key on insert.
        if (field && field.childDefaults) {
          Object.keys(field.childDefaults).forEach((defaultKey) => {
            if (target[defaultKey] === undefined) {
              target[defaultKey] = field.childDefaults[defaultKey];
            }
          });
        }

        delete target.EntityId;
        delete target.$key;
      });

      return entry;
    },

    /**
     * Split a full-name string into FirstName/LastName parts on the entry.
     * Supports both "Last, First" (comma) and "First Last" (space) orderings;
     * the user can refine the split in the name editor on the edit screen.
     * @param {Object} entry The edit-view entry being assembled.
     * @param {string} fullName The mapped name value.
     * @private
     */
    _applyNameParts: function _applyNameParts(entry, fullName) {
      const value = String(fullName === null || fullName === undefined ? '' : fullName).trim();

      if (!value) {
        return;
      }

      const comma = value.indexOf(',');

      if (comma >= 0) {
        entry.LastName = value.slice(0, comma).trim();
        entry.FirstName = value.slice(comma + 1).trim();
        return;
      }

      const space = value.indexOf(' ');

      if (space < 0) {
        entry.FirstName = value;
        return;
      }

      entry.FirstName = value.slice(0, space).trim();
      entry.LastName = value.slice(space + 1).trim();
    },

    /**
     * Open the destination edit view pre-populated via insert navigation. The
     * entry is applied as non-modified data so every pre-filled value stays
     * editable (Req 9.1, 9.4).
     * @param {Object} entry The property-keyed pre-population entry.
     * @returns {boolean} True when the view was opened, false on failure.
     * @private
     */
    _openEditView: function _openEditView(entry) {
      try {
        const view = App.getView(this._scanConfig.destinationEditView);

        if (!view) {
          return false;
        }

        view.show({
          entry,
          insert: true,
        }, {
          returnTo: -1,
        });

        return true;
      } catch (err) {
        return false;
      }
    },

    /**
     * Whether any pending value exceeds its field's maximum length and would be
     * truncated in the pre-population entry (Req 9.5).
     * @returns {boolean}
     * @private
     */
    _wasTruncated: function _wasTruncated() {
      if (!this._model) {
        return false;
      }

      return this._model.fields.some((field) => {
        const value = this._model.pending[field.name];

        return typeof value === 'string'
          && value.trim().length > 0
          && value.length > field.maxTextLength;
      });
    },

    /**
     * Return to the capture view to capture or upload another image (Req 5.5).
     * @private
     */
    recapture: function recapture() {
      const view = App.getView(this.captureView);

      if (!view) {
        return;
      }

      // returnTo: -1 removes this mapping view from history as we return to the
      // capture view, so the user does not ping-pong back into the stale map.
      view.show({
        scanConfig: this._scanConfig,
      }, {
        returnTo: -1,
      });
    },

    /**
     * Render the configuration error, hiding the normal mapping surface
     * (Req 10.3).
     * @param {string} message
     * @private
     */
    _renderConfigError: function _renderConfigError(message) {
      if (this.contentNode) {
        this.contentNode.style.display = 'none';
      }

      if (this.configErrorNode) {
        this.configErrorNode.textContent = message;
        this.configErrorNode.style.display = 'block';
      }
    },

    /**
     * Display an indication in the message region.
     * @param {string} message
     * @private
     */
    _displayMessage: function _displayMessage(message) {
      if (this.messageNode) {
        this.messageNode.textContent = message;
        this.messageNode.style.display = 'block';
      }
    },

    /**
     * Clear any displayed indication.
     * @private
     */
    _clearMessage: function _clearMessage() {
      if (this.messageNode) {
        this.messageNode.textContent = '';
        this.messageNode.style.display = 'none';
      }
    },

    /**
     * Toolbar layout: an empty top toolbar so the framework renders the title
     * bar (with the default back navigation).
     * @returns {Object}
     */
    createToolLayout: function createToolLayout() {
      return this.tools || (this.tools = {
        tbar: [],
      });
    },
  });

  return __class;
});
