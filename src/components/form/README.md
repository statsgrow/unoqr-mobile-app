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
