# Shared form controls

`PxTextInput`, `PxTextArea`, `PxSwitch` and `PxSelect` belong to this mobile app. The SPG Sevadal app was a reference; it is not imported or changed.

## RHF binding

```tsx
<PxTextInput RHF={form} name="fullname" label="Full name" fullWidth helperText="Enter your name." rules={{ required: "Enter your name." }} />
<PxTextArea RHF={form} name="bio" label="Bio" />
<PxSwitch RHF={form} name="allowSaveContact" label="Allow contact download" description="Let visitors save your details." />
<PxSelect RHF={form} name="platform" label="Platform" options={[{ label: "Website", value: "website" }, { label: "LinkedIn", value: "linkedin" }]} />
```

RHF values, blur, rules and input refs are connected by the component. Field errors override helper text. All controls accept `label`, `fullWidth`, `helperText`, `error`, `disabled` and wrapper `style`; the spelling `lable` is also accepted, with `label` taking precedence.

## Controlled values and width

For existing page state, omit `RHF` and pass `value` with `onChangeText` for inputs or `onValueChange` for switches/selects. These callbacks also work alongside RHF binding.

`fullWidth` defaults to true. Arrange columns in the page's parent View and use `fullWidth={false}` with `style={{ flex: 1 }}` or a specific wrapper width. `style` controls the entire field; `inputStyle` and `contentStyle` control only the text input. Labels, inputs and feedback stay together in `PxFormField`.

`PxTextArea` uses the same input shell with multiline content. `PxSwitch` uses the same iOS-style rounded track and pill thumb on Android and iOS. `PxSelect` takes string label/value options, supports search and opens the existing PxModal at 70% screen height; filtering does not resize the sheet. Its local search input keeps the clear X inside its border and stays above the scrolling options. PxSelect measures the existing modal viewport and surrounding content spacing, without changing PxModal or copying its header/inset sizes. Selecting an option closes the sheet. It has no separate modal footer.

Specialized search boxes, color editing, phone/date pickers and tag editors retain their own interaction-specific controls. Keep reusable form controls under this directory and follow AGENTS.md when editing them.

## Photo editing

`PxFileInput` offers Gallery/Camera selection and a photo preview with Edit, Replace and Delete. It uses `src/components/files/ImagePicker.ts` for native image picking. A selected image opens locally in `PxPhotoEditor`; choosing an image does not upload it. Apply calls the existing `onUpload` callback before changing the form value. Upload errors leave the editor open for retry.

```tsx
<PxPhotoEditor
  open={editorOpen}
  setOpen={setEditorOpen}
  file={photo} // Base64/data URL, saved photo URL, expo-file-system File, or null.
  ratio="4:5" // 1 (default), "3:4", "4:5", "9:16", or "2.7:1".
  bgcolor="#FFFFFF"
  onApply={async ({ file, base64, width, height, bgcolor }) => {
    // Upload file.uri through the existing photo upload helper, or store base64 locally.
  }}
/>
```

The main editor shows a static preview. Its Crop button switches to a separate, non-scrolling crop view for dragging and pinching. Both views share one native PxModal to avoid a dismiss/reopen flash on iOS. Images initially fit the crop window height. The crop sheet uses a dark canvas, a rule-of-thirds grid and corner guides. Crop confirms the crop locally; closing the crop sheet discards its unconfirmed moves. Uncovered areas use the live background color. Apply exports the final composition as PNG, capped at 2048 pixels on its longest side without upscaling smaller exports; the existing API handles storage conversion. `PxFileInput` also accepts `ratio` and `bgcolor` for its editor. Canceling the editor leaves the selected photo unchanged. Android exports the visible SVG after native image readiness, since cached SVG images do not emit `onLoad`. Export attempts own their callbacks and timeout; closing or changing the source cancels pending preparation, and late callbacks cannot complete a retry.

For saved digital cards, Apply uploads the edited file, saves only the photo reference through the existing card API, caches the response in SQLite, then deletes the previous file. Other unsaved Details fields are preserved. New cards retain the uploaded photo in their draft until Save Now creates the card. Removing a saved photo clears only its card reference and caches the confirmed response before deleting the retired upload; other unsaved Details fields remain unchanged. New-card photo removal stays in the draft. Failed old-file cleanup offers a retry without resaving the current photo.

Digital-card Details includes a Feature photo section before Personal details. Its cover image uses `ratio="2.7:1"` and the existing upload/editor flow. Apply on a saved card updates only `feature_photo_url`, caches the confirmed card, and resets only the feature-photo RHF baseline before retiring the old upload. New cards retain the upload until Save Now. The API returns feature-file metadata and SQLite retains it for replacement/deletion after reopening.
