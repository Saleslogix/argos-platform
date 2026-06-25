/* eslint-disable */
define('spec/OCR/MappingView.spec', [
  'crm/Views/OCR/Mapping',
  'crm/OCR/MappingModel'
], function(
  Mapping,
  MappingModel
) {
  // A representative, entity-agnostic scan configuration. Two target fields are
  // enough to assert rendering, field independence, and pre-population keying.
  function makeScanConfig() {
    return {
      destinationEditView: 'lead_edit',
      entityContext: {},
      targetFields: [
        { name: 'company', label: 'Company', property: 'AccountName', maxTextLength: 64 },
        { name: 'lastName', label: 'Last Name', property: 'LastName', maxTextLength: 64 }
      ]
    };
  }

  describe('crm/Views/OCR/Mapping (view)', function() {
    var _app = window.App;
    var view;

    beforeEach(function() {
      window.App = {
        getView: function() { return null; },
        supportsTouch: function() {}
      };
      view = new Mapping();
    });

    afterEach(function() {
      if (view) {
        view.destroy();
        view = null;
      }
      window.App = _app;
    });

    // Put the view into a valid, rendered mapping state with the supplied lines
    // and configuration, without exercising the routing-driven `show` path.
    function primeMapping(target, lines, scanConfig) {
      target._scanConfig = scanConfig;
      target._lines = (lines || []).slice();
      target._confidence = 80;
      target._model = new MappingModel(scanConfig.targetFields);
      target._selectedLineIndex = -1;
      target._render();
    }

    describe('target fields', function() {
      it('renders one entry per configured target field (Req 7.1)', function() {
        var scanConfig = makeScanConfig();

        primeMapping(view, ['Acme Inc', 'Jane Doe'], scanConfig);

        var fieldNodes = view.fieldsContainerNode.querySelectorAll('.ocr-mapping-field');
        expect(fieldNodes.length).toBe(scanConfig.targetFields.length);

        var labels = view.fieldsContainerNode.querySelectorAll('.ocr-mapping-field-label');
        expect(labels[0].textContent).toBe('Company');
        expect(labels[1].textContent).toBe('Last Name');
      });
    });

    describe('recognized lines', function() {
      it('renders the lines in their original order as editable inputs (Req 5.3)', function() {
        var lines = ['Acme Inc', '123 Main St', 'Jane Doe'];

        primeMapping(view, lines, makeScanConfig());

        var lineNodes = view.linesContainerNode.querySelectorAll('.ocr-mapping-line-input');
        expect(lineNodes.length).toBe(lines.length);
        expect(lineNodes[0].value).toBe('Acme Inc');
        expect(lineNodes[1].value).toBe('123 Main St');
        expect(lineNodes[2].value).toBe('Jane Doe');
      });

      it('splits a line at the cursor position into two lines (splitLine)', function() {
        primeMapping(view, ['1234 Elm St Anytown', 'Jane Doe'], makeScanConfig());

        var input = view.linesContainerNode.querySelector('.ocr-mapping-line-input[data-line-index="0"]');
        input.value = '1234 Elm St Anytown';
        input.selectionStart = 11; // after "1234 Elm St"
        input.selectionEnd = 11;

        view.splitLine({ lineIndex: '0' });

        expect(view._lines).toEqual(['1234 Elm St', 'Anytown', 'Jane Doe']);
        var lineNodes = view.linesContainerNode.querySelectorAll('.ocr-mapping-line-input');
        expect(lineNodes.length).toBe(3);
        expect(lineNodes[0].value).toBe('1234 Elm St');
        expect(lineNodes[1].value).toBe('Anytown');
      });

      it('does not split and hints when the cursor is at the start or end', function() {
        primeMapping(view, ['Acme'], makeScanConfig());

        var input = view.linesContainerNode.querySelector('.ocr-mapping-line-input[data-line-index="0"]');
        input.selectionStart = 0;
        input.selectionEnd = 0;

        view.splitLine({ lineIndex: '0' });

        expect(view._lines).toEqual(['Acme']);
        expect(view.messageNode.textContent).toBe(view.splitHintText);
      });

      it('undoes a split, restoring the original line (Req 8.x parity)', function() {
        primeMapping(view, ['1234 Elm St Anytown'], makeScanConfig());

        view._splitLineAt(0, 11);
        expect(view._lines).toEqual(['1234 Elm St', 'Anytown']);
        expect(view.undoButton.disabled).toBe(false);

        view.undo();

        expect(view._lines).toEqual(['1234 Elm St Anytown']);
        expect(view.undoButton.disabled).toBe(true);
      });

      it('assigns the edited line text to a field', function() {
        primeMapping(view, ['  John Doe  '], makeScanConfig());

        // Simulate the user trimming the line inline before assigning.
        view._lines[0] = 'John Doe';
        view.selectLine({ lineIndex: '0' });
        view.assignField({ fieldName: 'company' });

        expect(view._model.pending.company).toBe('John Doe');
      });
    });

    describe('grouped (address) fields', function() {
      function makeAddressScanConfig() {
        return {
          destinationEditView: 'lead_edit',
          entityContext: {},
          targetFields: [
            { name: 'Company', label: 'Company', property: 'Company', maxTextLength: 64 },
            { name: 'Address.City', label: 'City', property: 'Address.City', maxTextLength: 32, group: 'Address', childDefaults: { IsPrimary: true } },
            { name: 'Address.PostalCode', label: 'Postal Code', property: 'Address.PostalCode', maxTextLength: 24, group: 'Address', childDefaults: { IsPrimary: true } }
          ]
        };
      }

      it('renders a group header before grouped sub-fields and indents them', function() {
        primeMapping(view, ['Anytown'], makeAddressScanConfig());

        var groups = view.fieldsContainerNode.querySelectorAll('.ocr-mapping-field-group');
        expect(groups.length).toBe(1);
        expect(groups[0].textContent).toBe('Address');

        var grouped = view.fieldsContainerNode.querySelectorAll('.ocr-mapping-field-grouped');
        expect(grouped.length).toBe(2);
      });

      it('nests dotted address properties into a nested entry on confirm', function() {
        primeMapping(view, ['Anytown'], makeAddressScanConfig());

        view.selectLine({ lineIndex: '0' });
        view.assignField({ fieldName: 'Address.City' });

        var shownOptions = null;
        spyOn(window.App, 'getView').and.returnValue({
          show: function(options) { shownOptions = options; }
        });

        view.confirm();

        expect(shownOptions).not.toBeNull();
        expect(shownOptions.entry.Address).toBeDefined();
        expect(shownOptions.entry.Address.City).toBe('Anytown');
        // New primary address child, posted without a key so the server wires
        // the parent foreign key.
        expect(shownOptions.entry.Address.IsPrimary).toBe(true);
        expect(shownOptions.entry.Address.EntityId).toBeUndefined();
      });
    });

    describe('name field', function() {
      function makeNameScanConfig() {
        return {
          destinationEditView: 'lead_edit',
          entityContext: {},
          targetFields: [
            { name: 'LeadNameLastFirst', label: 'name', property: 'LeadNameLastFirst', maxTextLength: 255, nameField: true }
          ]
        };
      }

      it('splits a "First Last" name into FirstName/LastName on confirm', function() {
        primeMapping(view, ['John Doe'], makeNameScanConfig());

        view.selectLine({ lineIndex: '0' });
        view.assignField({ fieldName: 'LeadNameLastFirst' });

        var shownOptions = null;
        spyOn(window.App, 'getView').and.returnValue({
          show: function(options) { shownOptions = options; }
        });

        view.confirm();

        expect(shownOptions.entry.FirstName).toBe('John');
        expect(shownOptions.entry.LastName).toBe('Doe');
        // The read-only formatted property is not written.
        expect(shownOptions.entry.LeadNameLastFirst).toBeUndefined();
      });

      it('splits a "Last, First" name into LastName/FirstName on confirm', function() {
        primeMapping(view, ['Doe, John'], makeNameScanConfig());

        view.selectLine({ lineIndex: '0' });
        view.assignField({ fieldName: 'LeadNameLastFirst' });

        var shownOptions = null;
        spyOn(window.App, 'getView').and.returnValue({
          show: function(options) { shownOptions = options; }
        });

        view.confirm();

        expect(shownOptions.entry.LastName).toBe('Doe');
        expect(shownOptions.entry.FirstName).toBe('John');
      });
    });

    describe('confirm', function() {
      it('opens the destination edit view with an editable, pre-populated entry (Req 9.1, 9.4)', function() {
        var scanConfig = makeScanConfig();
        primeMapping(view, ['Acme Inc', 'Jane Doe'], scanConfig);

        // Map the first line to the company field through the normal flow.
        view.selectLine({ lineIndex: '0' });
        view.assignField({ fieldName: 'company' });

        var shownOptions = null;
        var shownNav = null;
        var editView = {
          show: function(options, nav) {
            shownOptions = options;
            shownNav = nav;
          }
        };

        spyOn(window.App, 'getView').and.returnValue(editView);

        view.confirm();

        expect(window.App.getView).toHaveBeenCalledWith('lead_edit');
        expect(shownOptions).not.toBeNull();
        // Insert navigation delivers the pre-filled values as editable, non-modified data.
        expect(shownOptions.insert).toBe(true);
        expect(shownOptions.entry.AccountName).toBe('Acme Inc');
        expect(shownNav.returnTo).toBe(-1);
      });

      it('retains pending values and shows an error when the edit view cannot be opened (Req 9.6)', function() {
        var scanConfig = makeScanConfig();
        primeMapping(view, ['Acme Inc', 'Jane Doe'], scanConfig);

        view.selectLine({ lineIndex: '0' });
        view.assignField({ fieldName: 'company' });

        // App.getView returns null: the edit view could not be opened.
        spyOn(window.App, 'getView').and.returnValue(null);

        view.confirm();

        expect(view.messageNode.textContent).toBe(view.openFailedText);
        expect(view.messageNode.style.display).toBe('block');
        // The mapped value is retained for a retry.
        expect(view._model.pending.company).toBe('Acme Inc');
      });
    });

    describe('undo', function() {
      it('disables the undo control while the undo stack is empty (Req 8.4)', function() {
        primeMapping(view, ['Acme Inc'], makeScanConfig());

        expect(view.undoButton.disabled).toBe(true);

        // A successful assignment makes an action available to undo.
        view.selectLine({ lineIndex: '0' });
        view.assignField({ fieldName: 'company' });

        expect(view.undoButton.disabled).toBe(false);
      });

      it('shows a nothing-to-undo indication when there is no action to revert (Req 8.7)', function() {
        primeMapping(view, ['Acme Inc'], makeScanConfig());

        view.undo();

        expect(view.messageNode.textContent).toBe(view.nothingToUndoText);
        expect(view.messageNode.style.display).toBe('block');
      });

      it('shows an undo-failure indication when the revert cannot be completed (Req 8.8)', function() {
        primeMapping(view, ['Acme Inc'], makeScanConfig());

        // Perform a real assignment so there is an action to undo.
        view.selectLine({ lineIndex: '0' });
        view.assignField({ fieldName: 'company' });

        // Simulate the model revert failing.
        view._model.undo = function() { return { ok: false }; };

        view.undo();

        expect(view.messageNode.textContent).toBe(view.undoFailedText);
        expect(view.messageNode.style.display).toBe('block');
      });
    });
  });
});
