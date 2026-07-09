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
 * @module crm/Views/OCR/Capture
 *
 * The OCR capture view (`ocr_capture`). Lets the user capture or upload an
 * image, previews it, validates the declared format/size/non-emptiness, encodes
 * the bytes as Base64, and submits the image to the OCR service operation via
 * `crm/OCR/OcrServiceClient`. On success with recognized lines it routes to the
 * mapping view (`ocr_mapping`); otherwise it surfaces the appropriate
 * timeout/error/unavailable/no-text indication while retaining the selection.
 *
 * The view is entity-agnostic: the target field set and destination edit view
 * arrive through the caller-supplied scan configuration, so future entities can
 * reuse it without modification.
 */
define('crm/Views/OCR/Capture', [
  'dojo/_base/declare',
  'argos/View',
  'argos/I18n',
  '../../Utility',
  '../../OCR/imageValidation',
  '../../OCR/OcrServiceClient',
], (declare, View, getResource, Utility, imageValidation, OcrServiceClient) => {
  // Resolve the localization set defensively. The `ocrCapture` string set is
  // added by a later task; until then (and to keep the view usable standalone)
  // the local *Text defaults below are used whenever a key is absent.
  function getResourceSafe(id) {
    try {
      return getResource(id) || {};
    } catch (err) {
      return {};
    }
  }

  const resource = getResourceSafe('ocrCapture');

  const __class = declare('crm.Views.OCR.Capture', [View], {
    // Templates
    widgetTemplate: new Simplate([
      '<div id="{%= $.id %}" data-title="{%: $.titleText %}" class="view ocr-capture">',
      '<div class="wrapper">',
      '<section class="ocr-capture-panel" role="main">',
      '<p class="ocr-capture-instructions">{%: $.instructionsText %}</p>',
      '<div class="ocr-capture-browse">',
      '<button data-dojo-attach-point="browseButton" data-action="chooseImageSource" class="btn-primary ocr-capture-browse-button">{%: $.browseText %}</button>',
      // The upload input opens the OS file/gallery chooser. The camera input
      // (with the `capture` hint) is only a fallback for environments without a
      // live-capture API; "Take Photo" normally uses getUserMedia (below), which
      // works on desktop webcams too. Neither is engaged until the user picks an
      // option in the chooser modal raised by `chooseImageSource`.
      '<input id="{%= $.id %}_camera" data-dojo-attach-point="cameraInputNode" type="file" accept="image/*" capture="environment" class="ocr-capture-file-input" style="display: none;" />',
      '<input id="{%= $.id %}_upload" data-dojo-attach-point="uploadInputNode" type="file" accept="image/*" class="ocr-capture-file-input" style="display: none;" />',
      '</div>',
      // Live camera capture overlay (getUserMedia). Shown only while the user is
      // taking a photo; the live video feeds a frame grab on capture.
      '<div class="ocr-capture-camera" data-dojo-attach-point="cameraOverlayNode" style="display: none;">',
      '<video data-dojo-attach-point="cameraVideoNode" class="ocr-capture-camera-video" autoplay playsinline muted></video>',
      '<div class="ocr-capture-camera-actions">',
      '<button data-action="capturePhoto" class="btn-primary ocr-capture-camera-capture">{%: $.capturePhotoText %}</button>',
      '<button data-action="cancelCamera" class="btn-secondary ocr-capture-camera-cancel">{%: $.cancelText %}</button>',
      '</div>',
      '</div>',
      '<div class="ocr-capture-preview" data-dojo-attach-point="previewContainerNode" style="display: none;">',
      '<img data-dojo-attach-point="previewNode" class="ocr-capture-preview-image" alt="{%: $.previewAltText %}" />',
      '</div>',
      '<div class="ocr-capture-progress" data-dojo-attach-point="progressNode" style="display: none;">',
      '<span class="ocr-capture-progress-text">{%: $.progressText %}</span>',
      '</div>',
      '<div class="ocr-capture-message" data-dojo-attach-point="messageNode" role="alert" style="display: none;"></div>',
      '<div class="ocr-capture-actions">',
      '<button data-dojo-attach-point="submitButton" data-action="submit" class="btn-primary" disabled>{%: $.submitText %}</button>',
      '</div>',
      '</section>',
      '</div>',
      '</div>',
    ]),

    // View id
    id: 'ocr_capture',

    // Localization (local defaults; overlaid by the `ocrCapture` set when present)
    titleText: resource.titleText || 'Scan Card',
    instructionsText: resource.instructionsText || 'Take a photo or choose an image of the card to scan.',
    browseText: resource.browseText || 'Add an image',
    // Image-source chooser (modal) strings.
    chooserTitleText: resource.chooserTitleText || 'Add Image',
    chooserPromptText: resource.chooserPromptText
      || 'Take a photo with the camera or choose an existing image.',
    takePhotoText: resource.takePhotoText || 'Take Photo',
    chooseFileText: resource.chooseFileText || 'Choose File',
    capturePhotoText: resource.capturePhotoText || 'Capture',
    cameraErrorText: resource.cameraErrorText
      || 'The camera could not be accessed. Check permissions or choose a file instead.',
    cancelText: resource.cancelText || 'Cancel',
    submitText: resource.submitText || 'Process',
    progressText: resource.progressText || 'Recognizing text...',
    previewAltText: resource.previewAltText || 'Selected image preview',
    unsupportedFormatText: resource.unsupportedFormatText
      || 'Unsupported image format. Supported formats are PNG, JPEG, TIFF, and BMP.',
    oversizeText: resource.oversizeText
      || 'The selected image is too large. Images must be 10 MB or smaller.',
    emptyImageText: resource.emptyImageText
      || 'The image is empty or could not be captured. Please select another image.',
    invalidImageText: resource.invalidImageText
      || 'A valid image is required before scanning.',
    timeoutText: resource.timeoutText
      || 'Text recognition timed out. Please try again.',
    recognitionErrorText: resource.recognitionErrorText
      || 'Text recognition failed. Please try again.',
    unavailableText: resource.unavailableText
      || 'Text recognition is not available on this platform.',
    noTextText: resource.noTextText
      || 'No text was recognized. Capture or upload another image.',

    // Id of the mapping view recognized lines are routed to on success.
    mappingView: 'ocr_mapping',

    // Internal state
    // _scanConfig: caller-supplied scan configuration
    // _entry: originating entry (back-navigation context only)
    // _imageData: Base64-encoded bytes of the current selection
    // _declaredFormat: declared image format token of the current selection
    // _byteLength: decoded byte length of the current selection
    // _submitEnabled: mirror of the submit control's enabled state
    // _inFlight: a recognition request is currently in flight
    // _client: lazily-created OcrServiceClient (injectable for tests)
    // _cameraStream: active getUserMedia stream while capturing a photo
    _scanConfig: null,
    _entry: null,
    _imageData: '',
    _declaredFormat: null,
    _byteLength: 0,
    _submitEnabled: false,
    _inFlight: false,
    _client: null,
    _cameraStream: null,

    /**
     * Wire up the file input change handlers once the DOM exists. Both the
     * camera and upload inputs feed the same selection handler.
     */
    postCreate: function postCreate() {
      this.inherited(postCreate, arguments);

      const handler = this._onFileSelected.bind(this);

      if (this.cameraInputNode) {
        this.cameraInputNode.addEventListener('change', handler);
      }

      if (this.uploadInputNode) {
        this.uploadInputNode.addEventListener('change', handler);
      }
    },

    /**
     * Release any active camera stream when the view is destroyed.
     */
    destroy: function destroy() {
      this._stopCameraStream();
      this.inherited(destroy, arguments);
    },

    /**
     * Present the image-source chooser on every platform. Opens an SDK modal
     * letting the user pick between capturing a new photo with the device
     * camera and selecting an existing image file. The camera is not engaged
     * until the user explicitly chooses "Take Photo".
     *
     * When no modal facility is available (e.g. a minimal harness), it falls
     * back to the upload input so the view remains usable.
     */
    chooseImageSource: function chooseImageSource() {
      const app = (typeof App !== 'undefined') ? App : null;
      const modal = app ? app.modal : null;

      if (!modal || typeof modal.add !== 'function') {
        this._openUpload();
        return;
      }

      modal.add(
        { title: this.chooserTitleText, content: this.chooserPromptText },
        [
          {
            action: () => {
              modal.hide();
              this._startCameraCapture();
            },
            className: 'button--flat button--flat--split',
            text: this.takePhotoText,
          },
          {
            action: () => {
              modal.hide();
              this._openUpload();
            },
            className: 'button--flat button--flat--split',
            text: this.chooseFileText,
          },
          {
            action: 'cancel',
            className: 'button--flat button--flat--split',
            text: this.cancelText,
          },
        ],
      );
    },

    /**
     * Start a live camera capture using `getUserMedia`. This works on desktop
     * (webcam) as well as mobile, so "Take Photo" engages the device camera on
     * every platform that exposes the API. The permission prompt is raised by
     * the browser at this point. When the live-capture API is unavailable, it
     * falls back to the native camera file input (`capture` hint).
     * @private
     */
    _startCameraCapture: function _startCameraCapture() {
      const nav = (typeof navigator !== 'undefined') ? navigator : null;
      const media = nav && nav.mediaDevices;

      if (!media || typeof media.getUserMedia !== 'function') {
        // No live-capture API: rely on the native camera file input.
        this._openCamera();
        return;
      }

      media.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          this._cameraStream = stream;

          if (this.cameraVideoNode) {
            // Guard the assignment: a non-MediaStream value (older browsers or
            // test doubles) can throw, but that must not abort the capture flow.
            try {
              this.cameraVideoNode.srcObject = stream;
            } catch (err) {
              // Ignore; the overlay still opens and the live feed degrades
              // gracefully where srcObject is unsupported.
            }
          }

          this._showCameraOverlay(true);
        })
        .catch(() => {
          // Denied or unavailable: surface a message and let the user retry or
          // choose a file instead.
          this._displayMessage(this.cameraErrorText);
        });
    },

    /**
     * Capture the current video frame, convert it to a PNG image, and feed it
     * through the same selection pipeline as a chosen file.
     */
    capturePhoto: function capturePhoto() {
      const video = this.cameraVideoNode;
      const width = video && video.videoWidth;
      const height = video && video.videoHeight;

      if (!width || !height) {
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(video, 0, 0, width, height);

      this._stopCameraStream();
      this._showCameraOverlay(false);

      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => {
          if (blob) {
            this._processFile(blob);
          }
        }, 'image/png');
      } else {
        this._processFile(this._dataUrlToBlob(canvas.toDataURL('image/png')));
      }
    },

    /**
     * Cancel an in-progress camera capture, stopping the stream and hiding the
     * overlay without altering the current selection.
     */
    cancelCamera: function cancelCamera() {
      this._stopCameraStream();
      this._showCameraOverlay(false);
    },

    /**
     * Toggle the live camera overlay.
     * @param {boolean} show
     * @private
     */
    _showCameraOverlay: function _showCameraOverlay(show) {
      if (this.cameraOverlayNode) {
        this.cameraOverlayNode.style.display = show ? 'block' : 'none';
      }
    },

    /**
     * Stop the active camera stream (if any) and detach it from the video node.
     * @private
     */
    _stopCameraStream: function _stopCameraStream() {
      if (this._cameraStream && typeof this._cameraStream.getTracks === 'function') {
        this._cameraStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      this._cameraStream = null;

      if (this.cameraVideoNode) {
        this.cameraVideoNode.srcObject = null;
      }
    },

    /**
     * Convert a data URL into a Blob, used as a fallback when `canvas.toBlob`
     * is unavailable.
     * @param {string} dataUrl
     * @returns {Blob}
     * @private
     */
    _dataUrlToBlob: function _dataUrlToBlob(dataUrl) {
      const parts = dataUrl.split(',');
      const mime = ((parts[0] || '').match(/:(.*?);/) || [])[1] || 'image/png';
      const binary = atob(parts[1] || '');
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      return new Blob([bytes], { type: mime });
    },

    /**
     * Trigger the camera-backed file input (native capture fallback used only
     * when the live-capture API is unavailable).
     * @private
     */
    _openCamera: function _openCamera() {
      if (this.cameraInputNode) {
        this.cameraInputNode.click();
      }
    },

    /**
     * Trigger the upload file input, which opens the OS file/gallery chooser and
     * never engages the camera.
     * @private
     */
    _openUpload: function _openUpload() {
      if (this.uploadInputNode) {
        this.uploadInputNode.click();
      }
    },

    /**
     * Show the capture view with the caller-supplied scan configuration.
     * @param {Object} options
     * @param {Object} options.scanConfig The entity-supplied scan configuration
     *   ({ targetFields, destinationEditView, entityContext?, language? }).
     * @param {Object} [options.entry] The originating entry (back-nav context).
     */
    show: function show(options) {
      this.inherited(show, arguments);

      if (options) {
        this._scanConfig = options.scanConfig || {};
        this._entry = options.entry;
      }

      this._resetSelection();
    },

    /**
     * Reset all per-selection state so the view starts clean each time it is
     * shown. Submission stays disabled until a valid image is selected
     * (Requirement 3.7).
     * @private
     */
    _resetSelection: function _resetSelection() {
      this._imageData = '';
      this._declaredFormat = null;
      this._byteLength = 0;
      this._inFlight = false;

      // Stop any in-progress live camera capture and hide its overlay.
      this._stopCameraStream();
      this._showCameraOverlay(false);

      if (this.cameraInputNode) {
        this.cameraInputNode.value = '';
      }

      if (this.uploadInputNode) {
        this.uploadInputNode.value = '';
      }

      if (this.previewNode) {
        this.previewNode.src = '';
      }

      if (this.previewContainerNode) {
        this.previewContainerNode.style.display = 'none';
      }

      if (this.progressNode) {
        this.progressNode.style.display = 'none';
      }

      this._clearMessage();
      this._setSubmitEnabled(false);
    },

    /**
     * Handle selection or capture of an image file from a file input. A
     * cancelled selection (no file) retains the prior preview and submit state
     * (Requirement 3.10); otherwise the chosen file is processed.
     * @param {Event} evt The file input change event.
     * @private
     */
    _onFileSelected: function _onFileSelected(evt) {
      const input = evt && evt.target;
      const files = input && input.files;

      // Cancelled capture/selection: leave the prior preview and submit state
      // untouched (Requirement 3.10).
      if (!files || files.length === 0) {
        return;
      }

      this._processFile(files[0]);
    },

    /**
     * Process an image File or Blob (from a file input or a camera capture):
     * determine the declared format, read the bytes, compute the byte length,
     * render a preview, encode Base64, and validate the selection.
     * @param {File|Blob} file
     * @private
     */
    _processFile: function _processFile(file) {
      if (!file) {
        return;
      }

      this._declaredFormat = this._determineFormat(file);

      const reader = new FileReader();

      reader.onload = () => {
        const buffer = reader.result;
        const bytes = new Uint8Array(buffer || new ArrayBuffer(0));

        // Compute the decoded byte length and Base64-encode the bytes for the
        // request (Requirements 3.3, 3.5). Reuses the shared, attachment-proven
        // `crm/Utility.base64ArrayBuffer` encoder.
        this._byteLength = bytes.length;
        this._imageData = Utility.base64ArrayBuffer(bytes);

        // Render a preview of the selection within budget (Requirement 3.2).
        this._renderPreview(file);

        // Apply the validation gates (Requirements 3.4, 3.5, 3.6, 3.9).
        this._validateSelection();
      };

      reader.onerror = () => {
        this._byteLength = 0;
        this._imageData = '';
        this._displayMessage(this.emptyImageText);
        this._setSubmitEnabled(false);
      };

      reader.readAsArrayBuffer(file);
    },

    /**
     * Determine the declared image format token for the selected file, derived
     * from the MIME subtype and falling back to the file-name extension
     * (Requirement 3.8). The raw token is returned; normalization to a canonical
     * Supported_Image_Format happens in `imageValidation`.
     * @param {File} file
     * @returns {string|null}
     * @private
     */
    _determineFormat: function _determineFormat(file) {
      if (!file) {
        return null;
      }

      let token = '';

      if (typeof file.type === 'string' && file.type.indexOf('/') >= 0) {
        token = file.type.split('/')[1].replace(/^x-(ms-)?/, '');
      }

      if (!imageValidation.normalizeFormat(token) && typeof file.name === 'string') {
        const dot = file.name.lastIndexOf('.');

        if (dot >= 0) {
          token = file.name.slice(dot + 1);
        }
      }

      return token;
    },

    /**
     * Render the preview image for the current selection using a data URL built
     * from the encoded bytes (Requirement 3.2).
     * @param {File} file
     * @private
     */
    _renderPreview: function _renderPreview(file) {
      if (!this.previewNode) {
        return;
      }

      const hasImage = !!this._imageData;
      const mime = (file && file.type) || 'image/png';

      this.previewNode.src = hasImage ? `data:${mime};base64,${this._imageData}` : '';

      if (this.previewContainerNode) {
        this.previewContainerNode.style.display = hasImage ? 'block' : 'none';
      }
    },

    /**
     * Validate the current selection and set the submit-enabled state. Each
     * failing gate shows a specific message and withholds submission while
     * leaving the selection unchanged (Requirements 3.4, 3.5, 3.6); a fully
     * valid selection clears messages and enables submission (Requirement 3.9).
     * @private
     */
    _validateSelection: function _validateSelection() {
      const declaredFormat = this._declaredFormat;
      const byteLength = this._byteLength;

      if (!imageValidation.isNonEmpty(byteLength)) {
        this._displayMessage(this.emptyImageText);
        this._setSubmitEnabled(false);
        return;
      }

      if (!imageValidation.isSupportedFormat(declaredFormat)) {
        this._displayMessage(this.unsupportedFormatText);
        this._setSubmitEnabled(false);
        return;
      }

      if (!imageValidation.isWithinSizeLimit(byteLength)) {
        this._displayMessage(this.oversizeText);
        this._setSubmitEnabled(false);
        return;
      }

      this._clearMessage();
      this._setSubmitEnabled(true);
    },

    /**
     * Submit the current image for recognition. Blocks resubmission of the same
     * image while a request is in flight (Requirement 4.4) and withholds the
     * request when no valid Base64/format is available (Requirement 4.7).
     */
    submit: function submit() {
      // Block resubmission of the same image while in flight (Requirement 4.4).
      if (this._inFlight) {
        return;
      }

      const declaredFormat = this._declaredFormat;
      const imageFormat = imageValidation.normalizeFormat(declaredFormat);

      // Withhold the request unless a valid image is available (Requirement 4.7).
      if (!this._imageData
        || !imageFormat
        || !imageValidation.canSubmit({ declaredFormat, byteLength: this._byteLength })) {
        this._displayMessage(this.invalidImageText);
        return;
      }

      this._beginInFlight();

      const language = this._scanConfig && this._scanConfig.language;

      this._getClient()
        .recognize({
          imageData: this._imageData,
          imageFormat,
          language,
        })
        .then((result) => {
          this._handleResult(result);
        })
        .catch(() => {
          // Defensive: treat an unexpected rejection as a generic error and
          // re-enable submission so the user can retry (Requirement 6.4).
          this._handleResult({ ok: false, message: this.recognitionErrorText });
        });
    },

    /**
     * Interpret a normalized `OcrResult` and update the view accordingly.
     * @param {Object} result The normalized result from `OcrServiceClient`.
     * @private
     */
    _handleResult: function _handleResult(result) {
      this._endInFlight();

      const r = result || {};

      if (r.ok === true) {
        if (Array.isArray(r.lines) && r.lines.length > 0) {
          // Recognized lines: route to the mapping view (Requirement 5.3).
          this._routeToMapping(r.lines, r.confidence);
        } else {
          // Success but no usable text: prompt to recapture (Requirement 5.5).
          this._displayMessage(this.noTextText);
          this._setSubmitEnabled(true);
        }

        return;
      }

      // Platform unavailable (404): surface the unavailable message (Req 6.6).
      if (r.unavailable === true) {
        this._displayMessage(r.message || this.unavailableText);
        this._setSubmitEnabled(true);
        return;
      }

      // Timeout: retain the image and re-enable submission (Requirement 4.5).
      if (r.timedOut === true) {
        this._displayMessage(this.timeoutText);
        this._setSubmitEnabled(true);
        return;
      }

      // Error / transport failure: retain the image, show the error, and allow
      // a retry (Requirements 4.6, 6.2, 6.3, 6.4, 6.5).
      this._displayMessage(r.message || this.recognitionErrorText);
      this._setSubmitEnabled(true);
    },

    /**
     * Route recognized lines to the mapping view, forwarding the scan
     * configuration so it remains entity-agnostic (Requirement 5.3).
     *
     * Opens the mapping view with `returnTo: -1` so the capture view is removed
     * from the navigation history as the user moves forward — once recognition
     * succeeds the user cannot navigate back into the capture view (matching the
     * established action-view pattern used elsewhere in the product).
     * @param {string[]} lines The extracted Text_Lines.
     * @param {number} confidence The clamped confidence score.
     * @private
     */
    _routeToMapping: function _routeToMapping(lines, confidence) {
      const view = App.getView(this.mappingView);

      if (!view) {
        return;
      }

      view.show({
        lines,
        confidence,
        scanConfig: this._scanConfig,
      }, {
        returnTo: -1,
      });
    },

    /**
     * Lazily create (or reuse an injected) `OcrServiceClient`.
     * @returns {OcrServiceClient}
     * @private
     */
    _getClient: function _getClient() {
      if (!this._client) {
        this._client = new OcrServiceClient();
      }

      return this._client;
    },

    /**
     * Enter the in-flight state: clear messages, show the progress indicator,
     * and disable submission (Requirement 4.4).
     * @private
     */
    _beginInFlight: function _beginInFlight() {
      this._inFlight = true;
      this._clearMessage();

      if (this.progressNode) {
        this.progressNode.style.display = 'block';
      }

      this._setSubmitEnabled(false);
    },

    /**
     * Leave the in-flight state: hide the progress indicator.
     * @private
     */
    _endInFlight: function _endInFlight() {
      this._inFlight = false;

      if (this.progressNode) {
        this.progressNode.style.display = 'none';
      }
    },

    /**
     * Set the submit control's enabled/disabled state.
     * @param {boolean} enabled
     * @private
     */
    _setSubmitEnabled: function _setSubmitEnabled(enabled) {
      this._submitEnabled = enabled;

      if (this.submitButton) {
        this.submitButton.disabled = !enabled;
      }
    },

    /**
     * Display a message in the message region.
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
     * Clear any displayed message.
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
