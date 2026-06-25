/* eslint-disable */
define('spec/OCR/Capture.spec', [
  'crm/Views/OCR/Capture'
], function(
  Capture
) {
  // Image_Size_Limit is 10 MB; this exceeds it for the oversize gate.
  var OVERSIZE_BYTES = (10 * 1024 * 1024) + 1;

  describe('crm/Views/OCR/Capture', function() {
    var _app = window.App;
    var view;

    beforeEach(function() {
      window.App = {
        getView: function() { return null; },
        supportsTouch: function() {}
      };
      view = new Capture();
    });

    afterEach(function() {
      if (view) {
        view.destroy();
        view = null;
      }
      window.App = _app;
    });

    // Put the view into a known, valid, ready-to-submit selection state without
    // exercising the asynchronous FileReader path.
    function primeValidSelection(target) {
      target._imageData = 'QUJD'; // "ABC" in Base64
      target._declaredFormat = 'png';
      target._byteLength = 100;
      target._inFlight = false;
    }

    describe('browse control', function() {
      it('renders a browse button plus separate camera and upload image inputs', function() {
        expect(view.browseButton).toBeDefined();
        expect(view.cameraInputNode).toBeDefined();
        expect(view.uploadInputNode).toBeDefined();

        // Both inputs accept images.
        expect(view.cameraInputNode.getAttribute('accept')).toBe('image/*');
        expect(view.uploadInputNode.getAttribute('accept')).toBe('image/*');

        // Only the camera input carries the capture hint; the upload input must
        // not, so it opens the OS file/gallery chooser without the camera.
        expect(view.cameraInputNode.hasAttribute('capture')).toBe(true);
        expect(view.uploadInputNode.hasAttribute('capture')).toBe(false);
      });

      it('starts with submission disabled until a valid image is selected', function() {
        view._resetSelection();

        expect(view._submitEnabled).toBe(false);
        expect(view.submitButton.disabled).toBe(true);
      });
    });

    describe('image source chooser', function() {
      it('presents a modal offering camera, upload, and cancel choices', function() {
        var added = null;
        window.App.modal = {
          add: function(content, toolbar) { added = { content: content, toolbar: toolbar }; return Promise.resolve(); },
          hide: function() {}
        };

        view.chooseImageSource();

        expect(added).not.toBeNull();
        var texts = added.toolbar.map(function(t) { return t.text; });
        expect(texts).toContain(view.takePhotoText);
        expect(texts).toContain(view.chooseFileText);
        expect(texts).toContain(view.cancelText);
      });

      it('starts live camera capture and hides the modal when Take Photo is chosen', function() {
        var hidden = false;
        var toolbar = null;
        window.App.modal = {
          add: function(content, actions) { toolbar = actions; return Promise.resolve(); },
          hide: function() { hidden = true; }
        };
        spyOn(view, '_startCameraCapture');

        view.chooseImageSource();
        toolbar.filter(function(t) { return t.text === view.takePhotoText; })[0].action();

        expect(hidden).toBe(true);
        expect(view._startCameraCapture).toHaveBeenCalled();
      });

      it('triggers the upload input and hides the modal when Choose File is chosen', function() {
        var hidden = false;
        var toolbar = null;
        window.App.modal = {
          add: function(content, actions) { toolbar = actions; return Promise.resolve(); },
          hide: function() { hidden = true; }
        };
        spyOn(view, '_openUpload');

        view.chooseImageSource();
        toolbar.filter(function(t) { return t.text === view.chooseFileText; })[0].action();

        expect(hidden).toBe(true);
        expect(view._openUpload).toHaveBeenCalled();
      });

      it('falls back to the upload input when no modal facility is available', function() {
        window.App.modal = null;
        spyOn(view, '_openUpload');

        view.chooseImageSource();

        expect(view._openUpload).toHaveBeenCalled();
      });
    });

    describe('live camera capture', function() {
      it('falls back to the native camera input when getUserMedia is unavailable', function() {
        var originalDesc = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
        Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
        spyOn(view, '_openCamera');

        view._startCameraCapture();

        expect(view._openCamera).toHaveBeenCalled();

        if (originalDesc) {
          Object.defineProperty(navigator, 'mediaDevices', originalDesc);
        } else {
          try { delete navigator.mediaDevices; } catch (e) { /* ignore */ }
        }
      });

      it('shows the camera overlay with a live stream once permission is granted', function(done) {
        var fakeStream = { getTracks: function() { return []; } };
        // A real <video>.srcObject only accepts a MediaStream; use a plain
        // stand-in node so the fake stream can be attached without throwing.
        view.cameraVideoNode = {};
        var originalDesc = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
        Object.defineProperty(navigator, 'mediaDevices', {
          value: { getUserMedia: function() { return Promise.resolve(fakeStream); } },
          configurable: true
        });

        view._startCameraCapture();

        setTimeout(function() {
          expect(view._cameraStream).toBe(fakeStream);
          expect(view.cameraOverlayNode.style.display).toBe('block');

          if (originalDesc) {
            Object.defineProperty(navigator, 'mediaDevices', originalDesc);
          } else {
            try { delete navigator.mediaDevices; } catch (e) { /* ignore */ }
          }
          done();
        }, 0);
      });

      it('shows a camera-error message when access is denied', function(done) {
        var originalDesc = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
        Object.defineProperty(navigator, 'mediaDevices', {
          value: { getUserMedia: function() { return Promise.reject(new Error('denied')); } },
          configurable: true
        });

        view._startCameraCapture();

        setTimeout(function() {
          expect(view.messageNode.textContent).toBe(view.cameraErrorText);

          if (originalDesc) {
            Object.defineProperty(navigator, 'mediaDevices', originalDesc);
          } else {
            try { delete navigator.mediaDevices; } catch (e) { /* ignore */ }
          }
          done();
        }, 0);
      });

      it('stops the stream and hides the overlay on cancel', function() {
        var stopped = 0;
        view._cameraStream = { getTracks: function() { return [{ stop: function() { stopped += 1; } }]; } };
        view._showCameraOverlay(true);

        view.cancelCamera();

        expect(stopped).toBe(1);
        expect(view._cameraStream).toBeNull();
        expect(view.cameraOverlayNode.style.display).toBe('none');
      });
    });

    describe('selection validation', function() {
      it('rejects an empty image and keeps submission disabled', function() {
        view._declaredFormat = 'png';
        view._byteLength = 0;

        view._validateSelection();

        expect(view.messageNode.textContent).toBe(view.emptyImageText);
        expect(view._submitEnabled).toBe(false);
      });

      it('rejects an unsupported format and keeps submission disabled', function() {
        view._declaredFormat = 'gif';
        view._byteLength = 100;

        view._validateSelection();

        expect(view.messageNode.textContent).toBe(view.unsupportedFormatText);
        expect(view._submitEnabled).toBe(false);
      });

      it('rejects an oversize image and keeps submission disabled', function() {
        view._declaredFormat = 'png';
        view._byteLength = OVERSIZE_BYTES;

        view._validateSelection();

        expect(view.messageNode.textContent).toBe(view.oversizeText);
        expect(view._submitEnabled).toBe(false);
      });

      it('clears messaging and enables submission for a valid selection', function() {
        view._declaredFormat = 'jpg';
        view._byteLength = 100;

        view._validateSelection();

        expect(view.messageNode.style.display).toBe('none');
        expect(view._submitEnabled).toBe(true);
        expect(view.submitButton.disabled).toBe(false);
      });
    });

    describe('preview rendering', function() {
      it('shows the preview image when an image is selected', function() {
        view._imageData = 'QUJD';

        view._renderPreview({ type: 'image/png' });

        expect(view.previewContainerNode.style.display).toBe('block');
        expect(view.previewNode.src.indexOf('base64,QUJD')).toBeGreaterThan(-1);
      });
    });

    describe('cancelled selection', function() {
      it('retains the prior preview and submit state when no file is chosen', function() {
        // Establish a valid, previewed, submit-enabled state.
        primeValidSelection(view);
        view._renderPreview({ type: 'image/png' });
        view._setSubmitEnabled(true);

        var priorImage = view._imageData;
        var priorPreview = view.previewContainerNode.style.display;

        // A change event carrying no files represents a cancelled capture.
        view._onFileSelected({ target: { files: [] } });

        expect(view._imageData).toBe(priorImage);
        expect(view.previewContainerNode.style.display).toBe(priorPreview);
        expect(view._submitEnabled).toBe(true);
      });
    });

    describe('submission', function() {
      it('shows progress, disables submission, and blocks resubmission while in flight', function() {
        primeValidSelection(view);

        var calls = 0;
        view._client = {
          recognize: function() {
            calls += 1;
            return new Promise(function() {}); // never resolves: stays in flight
          }
        };

        view.submit();

        expect(calls).toBe(1);
        expect(view._inFlight).toBe(true);
        expect(view.progressNode.style.display).toBe('block');
        expect(view.submitButton.disabled).toBe(true);

        // A second submit of the same in-flight image must not re-issue.
        view.submit();
        expect(calls).toBe(1);
      });

      it('withholds the request and warns when no valid image is available', function() {
        view._imageData = '';
        view._declaredFormat = null;
        view._byteLength = 0;

        var calls = 0;
        view._client = { recognize: function() { calls += 1; return Promise.resolve({}); } };

        view.submit();

        expect(calls).toBe(0);
        expect(view.messageNode.textContent).toBe(view.invalidImageText);
      });
    });

    describe('result handling', function() {
      it('re-enables submission and retains the image on timeout', function() {
        primeValidSelection(view);
        view._beginInFlight();

        view._handleResult({ timedOut: true });

        expect(view._inFlight).toBe(false);
        expect(view.messageNode.textContent).toBe(view.timeoutText);
        expect(view._submitEnabled).toBe(true);
        expect(view._imageData).toBe('QUJD');
      });

      it('re-enables submission and retains the image on error', function() {
        primeValidSelection(view);
        view._beginInFlight();

        view._handleResult({ ok: false, message: 'boom' });

        expect(view.messageNode.textContent).toBe('boom');
        expect(view._submitEnabled).toBe(true);
        expect(view._imageData).toBe('QUJD');
      });

      it('shows the unavailable message and re-enables submission on 404', function() {
        primeValidSelection(view);
        view._beginInFlight();

        view._handleResult({ unavailable: true, message: 'not here' });

        expect(view.messageNode.textContent).toBe('not here');
        expect(view._submitEnabled).toBe(true);
      });

      it('prompts to recapture when recognition succeeds with no text', function() {
        primeValidSelection(view);
        view._beginInFlight();

        view._handleResult({ ok: true, lines: [] });

        expect(view.messageNode.textContent).toBe(view.noTextText);
        expect(view._submitEnabled).toBe(true);
      });

      it('routes recognized lines to the mapping view with the scan configuration', function() {
        var scanConfig = { targetFields: [], destinationEditView: 'lead_edit' };
        view._scanConfig = scanConfig;

        var shown = null;
        var shownNav = null;
        var mappingView = {
          show: function(options, nav) { shown = options; shownNav = nav; }
        };

        spyOn(window.App, 'getView').and.returnValue(mappingView);

        view._handleResult({ ok: true, lines: ['Acme Inc'], confidence: 80 });

        expect(window.App.getView).toHaveBeenCalledWith('ocr_mapping');
        expect(shown).not.toBeNull();
        expect(shown.lines).toEqual(['Acme Inc']);
        expect(shown.confidence).toBe(80);
        expect(shown.scanConfig).toBe(scanConfig);
        // Capture is removed from history as the user proceeds to mapping.
        expect(shownNav).toEqual({ returnTo: -1 });
      });
    });
  });
});
