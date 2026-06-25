# Requirements Document

## Introduction

This feature adds optical character recognition (OCR) card scanning to the argos-saleslogix mobile CRM. A user viewing a Lead can capture or upload an image (for example, a photo of a business card), send it to the SData OCR service operation (`POST slx/system/-/$service/executeOcr`), and receive recognized text as newline-separated lines. The user then maps individual text lines onto Lead fields through an intuitive mapping screen that supports undoing mapping actions, and finally lands on the Lead insert/edit view with the mapped values pre-populated.

The OCR engine is server-side and out of scope. These requirements cover only the mobile client (consumer) responsibilities: feature availability detection with session-scoped disable on 404, the Lead quick action entry point, image capture/upload, request construction and submission, success and error response handling, the text-to-field mapping UI with an undo stack, and pre-population of the Lead edit view. Scope is limited to the Lead entity, but the design must anticipate future expansion to Contacts and other entities.

This feature reuses the established session-scoped "unsupported operation" pattern from `crm/Views/Journey/CustomerJourney360Widget`, which detects a 404 from a platform service operation, records the operation as unavailable on `App.context`, and stops re-requesting it for the rest of the session.

### Open Questions

- **OCR_Quick_Action_Label**: The display label for the Lead quick action is undecided. Candidate values are "Scan" and "Card Reader". Requirement 2 currently uses the placeholder term `OCR_Quick_Action_Label`; the final wording must be confirmed before implementation.

## Glossary

- **OCR_Card_Scanner**: The complete mobile client feature defined by this document.
- **OCR_Service_Client**: The client component that builds, sends, and interprets requests to the OCR service operation.
- **OCR_Service_Operation**: The SData service operation `POST slx/system/-/$service/executeOcr` invoked over the authenticated System Adapter session.
- **Feature_Availability_Manager**: The client component that tracks whether the OCR_Service_Operation is available for the current session, using the session-scoped unsupported-operation map on `App.context`.
- **Lead_Detail_View**: The existing Lead Detail view (`crm/Views/Lead/Detail`) whose `QuickActionsSection` hosts the entry point.
- **OCR_Quick_Action**: The quick action added to the Lead_Detail_View `QuickActionsSection` that launches the OCR_Capture_View.
- **OCR_Quick_Action_Label**: The placeholder term for the display label of the OCR_Quick_Action (see Open Questions).
- **OCR_Capture_View**: The new view that lets the user capture or upload an image and submit it for recognition.
- **OCR_Mapping_View**: The view that lets the user map recognized text lines onto Lead fields and supports undo.
- **Lead_Edit_View**: The existing Lead insert/edit view (`crm/Views/Lead/Edit`, id `lead_edit`) that receives the pre-populated values.
- **Recognized_Text**: The newline-separated text string returned by the OCR_Service_Operation on success.
- **Text_Line**: A single line of Recognized_Text produced by splitting Recognized_Text on newline characters.
- **Confidence_Score**: An integer from 0 to 100 returned by the OCR_Service_Operation indicating recognition confidence.
- **Supported_Image_Format**: One of PNG, JPEG (with JPG as an alias), TIFF, or BMP.
- **Image_Size_Limit**: The maximum decoded image size accepted by the OCR_Service_Operation, equal to 10 megabytes.
- **Undo_Stack**: The ordered, last-in-first-out record of mapping actions that the user can reverse in the OCR_Mapping_View.
- **Mapping_Action**: A single user action in the OCR_Mapping_View that assigns or clears a Lead field value from a Text_Line.
- **Session**: The period from user authentication until the application context (`App.context`) is rebuilt or the user signs out.

## Requirements

### Requirement 1: OCR Feature Availability Detection

**User Story:** As a sales user, I want the OCR card scanning feature to be hidden when my platform does not support it, so that I am not offered an action that cannot work.

#### Acceptance Criteria

1. WHEN the OCR_Service_Client receives a 404 response from the OCR_Service_Operation, THE Feature_Availability_Manager SHALL record the OCR_Service_Operation as unavailable for the remainder of the current Session.
2. IF the OCR_Service_Client receives a response other than 404 from the OCR_Service_Operation, THEN THE Feature_Availability_Manager SHALL leave the recorded availability state of the OCR_Service_Operation unchanged for the current Session.
3. WHILE the OCR_Service_Operation is recorded as unavailable for the current Session, THE Feature_Availability_Manager SHALL report the OCR_Card_Scanner as unavailable.
4. WHILE the OCR_Card_Scanner is reported as unavailable, WHEN the Lead_Detail_View is rendered, THE Lead_Detail_View SHALL omit the OCR_Quick_Action from the rendered set of actions.
5. WHILE the OCR_Card_Scanner is reported as available, WHEN the Lead_Detail_View is rendered, THE Lead_Detail_View SHALL include the OCR_Quick_Action in the rendered set of actions.
6. WHEN the Session ends and a new application context is built, THE Feature_Availability_Manager SHALL report the OCR_Card_Scanner as available until a subsequent 404 response is recorded for the OCR_Service_Operation in the new Session.
7. THE Feature_Availability_Manager SHALL store the unavailable state in the session-scoped unsupported-operation map on `App.context` consistent with the pattern used by `crm/Views/Journey/CustomerJourney360Widget`.

### Requirement 2: Lead Quick Action Entry Point

**User Story:** As a sales user, I want a quick action on the Lead detail screen, so that I can start scanning a card without leaving the Lead.

#### Acceptance Criteria

1. WHERE the OCR_Card_Scanner is available for the current Session, WHEN the Lead_Detail_View is rendered, THE Lead_Detail_View SHALL display the OCR_Quick_Action labeled with the OCR_Quick_Action_Label within the QuickActionsSection.
2. WHEN the user activates the OCR_Quick_Action and the OCR_Card_Scanner is available, THE OCR_Card_Scanner SHALL open the OCR_Capture_View in the context of the current Lead within 3 seconds.
3. WHERE the OCR_Card_Scanner is unavailable for the current Session, WHEN the Lead_Detail_View is rendered, THE Lead_Detail_View SHALL omit the OCR_Quick_Action from the QuickActionsSection.
4. IF the user activates the OCR_Quick_Action while the OCR_Card_Scanner is unavailable for the current Session, THEN THE OCR_Card_Scanner SHALL display a message indicating the feature is unavailable on the current platform, SHALL NOT open the OCR_Capture_View, and SHALL keep the user on the Lead_Detail_View.
5. IF the OCR_Capture_View fails to open because of a system error, THEN THE OCR_Card_Scanner SHALL display a message identifying the failure, SHALL present a retry action to the user, and SHALL keep the user on the Lead_Detail_View with the current Lead data unchanged.
6. WHEN the user activates the OCR_Quick_Action while the OCR_Card_Scanner is available, THE OCR_Card_Scanner SHALL open the OCR_Capture_View without requesting device camera access, deferring any camera permission prompt to the point at which the user chooses to capture an image with the camera.

### Requirement 3: Image Capture and Upload

**User Story:** As a sales user, I want to take a photo or choose an existing image, so that I can scan a business card or document.

#### Acceptance Criteria

1. THE OCR_Capture_View SHALL provide a browse control that presents the user with a choice between capturing an image using the device camera and selecting an existing image file.
2. WHEN the user selects or captures an image, THE OCR_Capture_View SHALL display a preview of the selected image to the user within 2 seconds of selection or capture completing.
3. WHEN the user selects or captures an image, THE OCR_Capture_View SHALL encode the image as a Base64 string.
4. IF the selected image is not a Supported_Image_Format, THEN THE OCR_Capture_View SHALL display a message identifying the supported formats, SHALL withhold submission to the OCR_Service_Operation, and SHALL leave the selected image unchanged.
5. IF the decoded image exceeds the Image_Size_Limit, THEN THE OCR_Capture_View SHALL display a message indicating the image is too large, SHALL withhold submission to the OCR_Service_Operation, and SHALL leave the selected image unchanged.
6. IF the selected image contains zero bytes, THEN THE OCR_Capture_View SHALL display a message indicating the image is empty or could not be captured, SHALL withhold submission to the OCR_Service_Operation, and SHALL leave the selected image unchanged.
7. WHILE no image has been selected, THE OCR_Capture_View SHALL keep the submit control disabled.
8. WHEN the user selects or captures an image, THE OCR_Capture_View SHALL determine the declared image format of the selected image.
9. WHEN the user selects or captures an image that is a Supported_Image_Format, does not exceed the Image_Size_Limit, and contains at least one byte, THE OCR_Capture_View SHALL enable the submit control.
10. IF the user cancels image capture or selection without producing an image, THEN THE OCR_Capture_View SHALL retain any previously displayed preview and SHALL keep the submit control in its prior enabled or disabled state.
11. WHEN the user activates the browse control, THE OCR_Capture_View SHALL present a chooser offering a camera-capture option and a file-selection option, and SHALL NOT engage the device camera until the user selects the camera-capture option.
12. WHEN the user selects the camera-capture option, THE OCR_Capture_View SHALL initiate live device camera capture (including on desktop devices with a camera), and any required camera permission SHALL be requested at that time.

### Requirement 4: OCR Request Submission

**User Story:** As a sales user, I want my captured image sent to the OCR service, so that the text on the card can be recognized.

#### Acceptance Criteria

1. WHEN the user submits a selected image, THE OCR_Service_Client SHALL send a `POST` request to the OCR_Service_Operation over the authenticated System Adapter session with a JSON body containing `request.imageData` set to the Base64 string and `request.imageFormat` set to the declared Supported_Image_Format.
2. WHERE the user has specified a language token, THE OCR_Service_Client SHALL include `request.language` with the specified token in the request body.
3. WHERE the user has not specified a language token, THE OCR_Service_Client SHALL omit `request.language` from the request body so that the server applies its configured default.
4. WHILE a submitted recognition request is in flight, THE OCR_Capture_View SHALL display a progress indicator and SHALL prevent resubmission of the same image until a response is received or the request terminates.
5. IF a submitted recognition request does not complete within 30 seconds, THEN THE OCR_Service_Client SHALL terminate the request, THE OCR_Capture_View SHALL retain the selected image, SHALL display a recognition-timeout indication, and SHALL re-enable submission.
6. IF the OCR_Service_Operation returns an error response or the request fails before a response is received, THEN THE OCR_Capture_View SHALL display a recognition-error indication and SHALL re-enable submission of the selected image.
7. IF the user attempts to submit when no Base64 imageData is available or no Supported_Image_Format has been declared, THEN THE OCR_Service_Client SHALL withhold the request and THE OCR_Capture_View SHALL present an indication that a valid image is required.

### Requirement 5: OCR Success Response Handling

**User Story:** As a sales user, I want the recognized text presented as individual lines, so that I can map each line to the right field.

#### Acceptance Criteria

1. WHEN the OCR_Service_Operation returns a response with `success` set to true, THE OCR_Service_Client SHALL extract the Recognized_Text and the Confidence_Score from the response.
2. WHEN the OCR_Service_Client extracts the Recognized_Text, THE OCR_Card_Scanner SHALL split the Recognized_Text on newline characters into an ordered collection of Text_Lines, preserving the original sequence and excluding any line that contains only whitespace characters after trimming leading and trailing whitespace.
3. WHEN the Text_Lines are produced and the collection contains at least one Text_Line, THE OCR_Mapping_View SHALL open within 1 second and display the Text_Lines in their original order.
4. WHERE text extraction succeeds and at least one Text_Line is produced, THE OCR_Mapping_View SHALL display the Confidence_Score to the user as a value bounded between 0 and 100 inclusive, representing a percentage.
5. IF the Recognized_Text is an empty string or the collection of Text_Lines is empty after splitting and trimming, THEN THE OCR_Mapping_View SHALL display a message indicating that no text was recognized, SHALL omit the Confidence_Score, and SHALL present the user with controls to capture a new image or upload another image.

### Requirement 6: OCR Error Response Handling

**User Story:** As a sales user, I want clear feedback when recognition fails, so that I know what went wrong and what to do next.

#### Acceptance Criteria

1. WHEN the OCR_Service_Operation returns a response with `success` set to false, THE OCR_Service_Client SHALL extract the `errorMessage` from the response, and WHERE the `errorMessage` is absent or empty, THE OCR_Service_Client SHALL substitute a generic recognition-error message.
2. WHEN the OCR_Service_Client extracts or substitutes an error message, THE OCR_Capture_View SHALL display the message to the user within 2 seconds of receiving the response.
3. WHILE an error message is displayed, THE OCR_Capture_View SHALL allow the user to retry with the same or a different image, and each retry SHALL initiate a new recognition request while retaining the captured image.
4. IF the recognition request fails due to a network or transport error other than a 404, THEN THE OCR_Capture_View SHALL display a generic recognition-error message within 2 seconds of the failure and SHALL allow the user to retry.
5. IF a recognition request does not receive a response within 30 seconds, THEN THE OCR_Service_Client SHALL treat the request as a network error and THE OCR_Capture_View SHALL display a generic recognition-error message and allow the user to retry.
6. WHEN the OCR_Service_Operation returns a 404 response, THE OCR_Card_Scanner SHALL apply the availability handling defined in Requirement 1 and SHALL inform the user that the feature is unavailable on the current platform.

### Requirement 7: Text-to-Field Mapping

**User Story:** As a sales user, I want to quickly assign recognized text lines to Lead fields, so that I can build a Lead record without retyping the card.

#### Acceptance Criteria

1. THE OCR_Mapping_View SHALL present the available target Lead fields to which a Text_Line can be assigned.
2. WHEN the user performs a Mapping_Action that assigns a Text_Line to a target Lead field, THE OCR_Mapping_View SHALL record the assigned Text_Line text as the pending value for that field AND SHALL update the display to show the pending value within 1 second.
3. WHEN the user assigns a Text_Line to a target Lead field that already has a pending value, THE OCR_Mapping_View SHALL replace the previous pending value with the text of the newly assigned Text_Line.
4. WHEN the user performs a Mapping_Action to clear a target Lead field, THE OCR_Mapping_View SHALL remove the pending value from that target Lead field and SHALL update the display to show the field as having no pending value within 1 second.
5. THE OCR_Mapping_View SHALL allow each target Lead field to remain unassigned, with a maximum of one pending value retained per target Lead field at any time.
6. WHEN no Mapping_Action has been performed, THE OCR_Mapping_View SHALL leave every target Lead field with no pending value.
7. IF the user assigns a Text_Line whose text length exceeds the maximum allowed length of the target Lead field, THEN THE OCR_Mapping_View SHALL reject the assignment, SHALL retain the field's existing pending value unchanged, and SHALL present an indication that the text exceeds the field's maximum length.
8. WHERE the user assigns a Text_Line that is already the pending value of another target Lead field, THE OCR_Mapping_View SHALL record the Text_Line text as the pending value for the newly targeted field while retaining the pending value of the previously assigned field.

### Requirement 8: Undo Mapping Actions

**User Story:** As a sales user, I want to undo my last mapping action, so that I can recover quickly from a mistake.

#### Acceptance Criteria

1. WHEN the user performs a Mapping_Action AND the Undo_Stack contains fewer than 50 Mapping_Actions, THE OCR_Mapping_View SHALL push the Mapping_Action onto the top of the Undo_Stack.
2. WHEN the user requests an undo AND the Undo_Stack is not empty, THE OCR_Mapping_View SHALL revert the most recent Mapping_Action and SHALL remove that Mapping_Action from the Undo_Stack within 1 second of the request.
3. WHEN the user reverts a Mapping_Action, THE OCR_Mapping_View SHALL restore the affected target Lead field to the pending value it held immediately before that Mapping_Action.
4. WHILE the Undo_Stack contains zero Mapping_Actions, THE OCR_Mapping_View SHALL present the undo control in a disabled, non-interactive state.
5. WHEN the user reverts every Mapping_Action on the Undo_Stack, THE OCR_Mapping_View SHALL present the same field assignments that existed before any Mapping_Action was performed.
6. WHEN the user performs a Mapping_Action AND the Undo_Stack already contains 50 Mapping_Actions, THE OCR_Mapping_View SHALL remove the oldest Mapping_Action from the bottom of the Undo_Stack before pushing the new Mapping_Action, so that the Undo_Stack never exceeds 50 entries.
7. IF the user requests an undo AND the Undo_Stack is empty, THEN THE OCR_Mapping_View SHALL take no action on any Lead field and SHALL present an indication that no Mapping_Action is available to undo.
8. IF reverting a Mapping_Action fails to restore the affected target Lead field, THEN THE OCR_Mapping_View SHALL retain the affected Lead field at its current value, SHALL retain the Mapping_Action on the Undo_Stack, and SHALL present an indication that the undo did not complete.

### Requirement 9: Pre-populate the Lead Edit View

**User Story:** As a sales user, I want the Lead edit screen opened with my mapped values filled in, so that I can review, complete, and save the Lead.

#### Acceptance Criteria

1. WHEN the user confirms the mapping in the OCR_Mapping_View, THE OCR_Card_Scanner SHALL open the Lead_Edit_View within 2 seconds of the confirmation.
2. WHEN the Lead_Edit_View opens from a confirmed mapping, THE OCR_Card_Scanner SHALL pre-populate each target Lead field that has a non-empty pending value with that pending value, where a pending value is non-empty if it contains at least one non-whitespace character.
3. WHERE a target Lead field has no pending value or a pending value that is empty after trimming leading and trailing whitespace, THE OCR_Card_Scanner SHALL leave that field at the Lead_Edit_View default.
4. WHEN the Lead_Edit_View opens from a confirmed mapping, THE Lead_Edit_View SHALL allow the user to edit every pre-populated value before saving.
5. IF a pending value exceeds the maximum length accepted by its target Lead field, THEN THE OCR_Card_Scanner SHALL pre-populate that field with the pending value truncated to the field maximum length and SHALL display an indication that the value was truncated.
6. IF the Lead_Edit_View fails to open after a confirmed mapping, THEN THE OCR_Card_Scanner SHALL retain all pending values and SHALL display an error indication that the Lead edit screen could not be opened.

### Requirement 10: Extensibility for Future Entities

**User Story:** As a developer, I want the OCR scanning components designed for reuse, so that Contacts and other entities can adopt scanning without rework.

#### Acceptance Criteria

1. THE OCR_Service_Client SHALL perform image submission and response interpretation using only the image input and recognition response, without referencing any Lead-entity-specific field names, views, or logic.
2. WHEN the caller invokes the OCR_Mapping_View, THE OCR_Mapping_View SHALL accept the set of target fields and the destination edit view as configuration parameters supplied by the caller.
3. IF the OCR_Mapping_View is invoked without a target field set or without a destination edit view, THEN THE OCR_Mapping_View SHALL reject the invocation, retain no partial mapping state, and return an error indicating which required configuration parameter is missing.
4. WHERE a future entity provides its own target field set and destination edit view, THE OCR_Card_Scanner SHALL map recognized text to that entity's target fields with no modification to the OCR_Service_Client source.
5. IF a configured target field has no corresponding recognized text in the recognition response, THEN THE OCR_Card_Scanner SHALL leave that target field unset and continue mapping the remaining target fields.
