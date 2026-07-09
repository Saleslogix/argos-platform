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

/* eslint-env node, mocha, chai */
/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const common = require('./common');
const config = require('./config');
const debug = require('debug')('e2e');

// A minimal but valid 1x1 PNG. It is a Supported_Image_Format (PNG), contains
// more than zero bytes, and is well under the 10 MB Image_Size_Limit, so it
// passes the capture view's validation gates and enables the submit control.
const ONE_BY_ONE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

function makeImageUpload() {
  return {
    name: 'business-card.png',
    mimeType: 'image/png',
    buffer: Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'),
  };
}

// Navigate from the left drawer into the first Lead detail card. Mirrors the
// navigation pattern used by the existing Detail e2e tests.
async function openFirstLeadDetail(page) {
  await common.expandLeftDrawerGoToMenuHeader(page);

  const leadListHandle = await page.waitForSelector('#left_drawer a[data-view="lead_list"]');
  await leadListHandle.click();

  const cardHandle = await page.waitForSelector('#lead_list div[data-action="activateEntry"]');
  await cardHandle.click();

  await page.waitForSelector('#lead_detail');
}

describe('OCR Card Scanner', () => {
  describe('OCRCARD-1: Happy path - recognize, map a line, and pre-populate the Lead edit view', () => {
    it('should scan a supported image, map a recognized line, and open lead_edit pre-populated', async () => {
      const page = await common.auth(config.crm.users.admin.userId, config.crm.users.admin.password);

      // The capture view ensures the device (camera) permission before opening.
      // Grant it up-front so the permission check resolves without an OS prompt.
      await page.context().grantPermissions(['camera']);

      // Stub the OCR service operation (POST slx/system/-/$service/executeOcr)
      // with a deterministic success payload so the test does not depend on a
      // server-side OCR engine. The service-operation response wraps the OCR
      // payload under `response`, matching OcrServiceClient._normalizeResponse.
      await page.route(/executeOcr/, (route) => {
        debug('Stubbing executeOcr with a success response');
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            $name: 'executeOcrResponse',
            response: {
              success: true,
              recognizedText: 'Acme Corporation\nJane Smith\nCEO',
              confidence: 92,
            },
          }),
        });
      });

      await openFirstLeadDetail(page);

      // Req 2.1: while the feature is available, the OCR quick action is shown
      // in the QuickActionsSection.
      const ocrActionHandle = await page.waitForSelector('#lead_detail .quick-actions a[data-action="startOcrScan"]');

      // Req 2.2: activating the quick action opens the capture view in the
      // context of the current Lead.
      await ocrActionHandle.click();
      await page.waitForSelector('#ocr_capture');

      // Req 3.x: select a supported image. The capture view exposes a camera
      // input and an upload input; the image-source chooser modal lets the user
      // pick between them. Setting the file directly on the upload input mirrors
      // choosing "Choose File" and keeps the test deterministic (no OS dialog or
      // camera). The submit control becomes enabled once validation passes.
      await page.setInputFiles('#ocr_capture_upload', makeImageUpload());
      const submitHandle = await page.waitForSelector('#ocr_capture button[data-action="submit"]:not([disabled])');

      // Req 4.1 / 5.x: submit the image; on a successful recognition the mapping
      // view opens with the recognized lines.
      await submitHandle.click();
      await page.waitForResponse(/executeOcr/);
      await page.waitForSelector('#ocr_mapping');

      // The OCR views' dynamically-shown content (line list, fields) is wired
      // through argos' delegated `data-action` click handling on the view's
      // domNode. Drive the interactions with dispatched click events that bubble
      // to that delegated handler, rather than synthesized mouse clicks, so the
      // assertions exercise the real view logic + navigation without coupling to
      // the view's CSS layout in the test harness.
      await page.waitForSelector('#ocr_mapping .ocr-mapping-line-input[data-line-index="0"]', { state: 'attached' });

      // Req 5.3: recognized text lines are shown in the mapping view in order
      // (now as editable inputs).
      const firstLineValue = await page.inputValue('#ocr_mapping .ocr-mapping-line-input[data-line-index="0"]');
      expect(firstLineValue.trim()).to.equal('Acme Corporation');

      // Req 7.2: select the first recognized line (focusing it selects it) and
      // assign it to the Company target field; the field reflects the pending value.
      await page.focus('#ocr_mapping .ocr-mapping-line-input[data-line-index="0"]');
      await page.dispatchEvent('#ocr_mapping button[data-action="assignField"][data-field-name="Company"]', 'click');

      await page.waitForFunction(() => {
        const node = document.querySelector('#ocr_mapping li[data-field-name="Company"] .ocr-mapping-field-value');
        return node && node.textContent.trim().length > 0;
      });
      const pendingValue = await page.textContent('#ocr_mapping li[data-field-name="Company"] .ocr-mapping-field-value');
      expect(pendingValue.trim()).to.equal('Acme Corporation');

      // Req 9.1 / 9.2: confirming the mapping opens lead_edit pre-populated with
      // the mapped value.
      await page.dispatchEvent('#ocr_mapping button[data-action="confirm"]', 'click');
      await page.waitForSelector('#lead_edit');

      // On insert, the edit view applies the supplied entry as the final step of
      // its template processing, which runs after its SData template request
      // resolves. Wait for the mapped value to land before asserting.
      await page.waitForFunction(() => {
        const el = document.querySelector('#lead_edit input[name="Company"]');
        return !!el && el.value === 'Acme Corporation';
      }, null, { timeout: 30000 });

      const companyInput = await page.waitForSelector('#lead_edit input[name="Company"]');
      const companyValue = await companyInput.inputValue();
      expect(companyValue).to.equal('Acme Corporation');

      // Req 9.4: the pre-populated value remains editable.
      const isEditable = await companyInput.isEditable();
      expect(isEditable).to.be.true;

      await page.close();
    });
  });

  describe('OCRCARD-2: 404 path - the OCR quick action is hidden for the session', () => {
    it('should omit the OCR quick action from the Lead detail after the service returns 404', async () => {
      const page = await common.auth(config.crm.users.admin.userId, config.crm.users.admin.password);

      await page.context().grantPermissions(['camera']);

      // Stub the OCR service operation with a 404 to drive the session-scoped
      // "unsupported operation" handling (Req 1.1 / 6.6).
      await page.route(/executeOcr/, (route) => {
        debug('Stubbing executeOcr with a 404 response');
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: '[{ "message": "Operation not found." }]',
        });
      });

      await openFirstLeadDetail(page);

      // The feature is available on first render, so the action is present.
      const ocrActionHandle = await page.waitForSelector('#lead_detail .quick-actions a[data-action="startOcrScan"]');
      await ocrActionHandle.click();
      await page.waitForSelector('#ocr_capture');

      // Submit a supported image via the upload input; the stubbed 404 surfaces
      // the unavailable message and records the operation as unavailable for the
      // session (Req 6.6 -> Req 1.1 via OcrServiceClient/FeatureAvailability).
      await page.setInputFiles('#ocr_capture_upload', makeImageUpload());
      const submitHandle = await page.waitForSelector('#ocr_capture button[data-action="submit"]:not([disabled])');
      await submitHandle.click();
      await page.waitForResponse(/executeOcr/);

      // The capture view surfaces the platform-unavailable message. Assert on the
      // message content (the alert region is populated by the view's result
      // handling) rather than coupling to its CSS visibility in the harness.
      await page.waitForFunction(() => {
        const node = document.querySelector('#ocr_capture .ocr-capture-message');
        return node && node.textContent.trim().length > 0;
      });
      const unavailableMessage = await page.textContent('#ocr_capture .ocr-capture-message');
      expect(unavailableMessage.toLowerCase()).to.have.string('not available');

      // The 404 is recorded in the session-scoped unsupported-operation map on
      // App.context (the same map the journey widget uses).
      const recordedUnavailable = await page.evaluate(() => {
        return !!(App.context
          && App.context.unsupportedOperations
          && App.context.unsupportedOperations.executeOcr);
      });
      expect(recordedUnavailable, 'executeOcr should be recorded as unavailable for the session').to.be.true;

      // Req 1.4: while the feature is unavailable, rendering the Lead detail
      // omits the OCR quick action from the rendered set of actions. The detail
      // layout is cached per view instance, so force a rebuild to reflect the
      // now-unavailable feature, then assert the action is no longer included.
      const ocrActionOmitted = await page.evaluate(() => {
        const view = App.getView('lead_detail');
        view.layout = null; // discard the cached layout so it rebuilds
        const layout = view.createLayout();
        const section = layout.filter(s => s.name === 'QuickActionsSection')[0];
        const actionNames = (section && section.children || []).map(child => child.name);
        return {
          hasOcrAction: actionNames.indexOf('OCR_Quick_Action') !== -1,
          // A non-OCR action remains, confirming the section itself still renders.
          hasOtherAction: actionNames.indexOf('AddNoteAction') !== -1,
        };
      });
      expect(ocrActionOmitted.hasOcrAction, 'OCR quick action should be omitted while unavailable').to.be.false;
      expect(ocrActionOmitted.hasOtherAction, 'other quick actions should still render').to.be.true;

      await page.close();
    });
  });
});
