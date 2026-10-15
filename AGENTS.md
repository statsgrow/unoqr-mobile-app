# AGENTS.md

This file defines the coding style conventions for AI agents working in this repository.

## Coding Style

- Use TypeScript with explicit prop and helper types.
- Use Lucide icons with `strokeWidth={1.25}` consistently for UI icons. Preserve official brand assets for brand logos.
- Keep imports grouped in this order:
  1. React/external libraries
  2. Internal alias imports (`@/...`)
  3. Relative/local imports
- Organize every `.tsx` file in this order:
  1. Imports
  2. Types
  3. Main exported function/component
  4. Helper functions
  5. Styles
- Add a one-line comment immediately above every main function/component and helper function describing what it does.
- Use section dividers to keep files readable:
  - `/* ------------------ BREAK ------------------ */`
- Keep helper functions near their usage (usually below component body and above styles).
- Keep styles in `StyleSheet.create(...)` at file bottom.
- Prefer theme tokens over hardcoded values:
  - `colors`, `spacing`, `radii`, `fontFamilies`, `fontSizes`, and related tokens from `src/theme/tokens.ts`.
  - If legacy components still depend on `src/theme/themeSettings.ts`, treat it as a compatibility layer rather than the primary source.
- Keep route components as default exports.
- Keep page-specific code inside that page file by default.
  - Root-level JSX, page helpers, and local page logic should stay in the page unless explicitly asked to move them into `components`, `utils`, `assets`, or other shared folders.
- Keep feature-specific custom components inside that feature's helper directory.
  - Scan components must live in `src/helpers/scans/components/`, not `src/components/`.
- New page routes should live directly in their route path when possible.
  - Prefer files like `/auth/login.tsx` over `/auth/login/index.tsx` unless explicitly told to use folder-based route files.
- Common style pattern in components:
  - `//Default Return` comment before return block.
- Closing comment convention is required:
  - Exported functions/exports should end with comments like `};//export ends`.
  - Non-export functions should end with comments like `};//func ends`.
  - Return blocks should end with comments like `);//return ends` when applicable.
  - `if` blocks should end with comments like `};//if ends` when applicable.

## Shared Form Controls

- Keep reusable form components in `src/components/form/`. Use `PxTextInput`, `PxTextArea`, `PxSwitch` and `PxSelect` for ordinary page/modal form fields instead of recreating their controls, labels, validation or helper text.
- Bind forms through `RHF` and `name` with `rules` when needed. For existing controlled state, pass `value` and its change callback. Errors take precedence over `helperText`; wire RHF change, blur and input ref so validation and focus work.
- Use the shared `PxFormField` wrapper. `fullWidth` defaults to `true`; use `fullWidth={false}` with the component's wrapper `style` or a page-owned parent when arranging columns. Keep width/flex decisions in the importing page.
- Preserve the existing text-input/textarea appearance. Use one iOS-style `PxSwitch` design on both iOS and Android; never import native/Paper Switch in individual pages.
- `PxSelect` takes an array of `{ label, value }` options and opens `PxModal` for selection/search. Let PxModal own its shared structure and scrolling.

## Loading Indicators

- Strictly use `PxCircularProgress` from `src/components/elements/PxCircularProgress.tsx` for app loading icons, including digital-card/QR previews, modal actions, forms and buttons.
- Pass a color from theme tokens and a numeric `size`; size applies equally to width and height. The component is only an animated icon, with no card, background, border or padding.
- Do not introduce React Native/Paper `ActivityIndicator` or per-platform spinner designs. `PxButton` routes its `loading` prop through this shared component. Preserve native pull-to-refresh controls as their own interaction.

## Modal Action Footers

- Strictly use the `footerAction` prop for every `PxModal` footer action. Pass JSX directly, grouping buttons inside a `<View>`.
- Never place footer buttons such as Save, Share, Download, Delete, Done, or Update inside the modal's scrollable children, and do not use the old `footer` prop.
- `PxModal` owns the footer position, horizontal spacing, and bottom safe-area padding. Do not add per-modal footer inset padding or manually position footer actions.
- Keep tabs, selection options, and controls for individual fields in the modal body. Modals without footer actions should omit `footerAction`.
- `PxModal` strictly owns its handle, header, scroll region, footer, scroll hint and safe-area spacing. Adapt screen content to its existing props; never add screen-specific positioning or offsets for those shared elements.
- Keyboard handling belongs inside PxModal's opaque sheet body: animate keyboard clearance there, keep fixed-height sheets anchored, and restore content bounds on dismissal. Do not move the outer sheet with KeyboardAvoidingView or add per-dialog keyboard offsets.
- The scroll hint belongs just above `footerAction` when actions exist, otherwise just above the sheet's safe bottom area. It appears only while more content remains below. Fix this behavior in `PxModal`, never in individual screens.

## Page Bottom Navigation and Keyboard

- Use `GeneralLayout.bottomNav` for page-level bottom buttons/actions. Pass JSX directly, grouping elements in a `<View>`; pass `null` when there is no bottom action or navigation. Omitting it uses the app navigation.
- `GeneralLayout` owns one bottom slot outside the scrollable content. Do not render `BottomNav` inside individual forms or manually position page footers.
- The shared bottom slot owns horizontal padding and bottom safe-area spacing. Page action wrappers may define a gap, but must not add footer padding, inset padding or absolute positioning.
- Use `GeneralLayout.floatingAction` for floating page controls above the bottom slot. Keep Save/Download actions in `bottomNav`; do not put floating Settings controls inside the footer. Reserve enough content padding for the floating control.
- Use the layout's default scrolling for forms so keyboard-height clearance and focused-input scrolling work centrally. Do not nest an additional `ScrollView` or `KeyboardAvoidingView` around a form using this behavior.
- Use `hideBottomViewOnKeyboard` to hide bottom actions while typing; it defaults to `true`. Restore existing bottom actions when the keyboard closes, animate away its clearance, and clamp scrolling to the normal content bounds. Support iOS will/did-hide and Android did-hide events centrally. Fix keyboard spacing in `GeneralLayout`, never with per-form keyboard listeners or offsets.

## Implementation Simplicity

- Prefer the smallest implementation that satisfies the requested flow.
- Follow an existing working project pattern when the user points to one; do not add speculative validation, fallback mechanisms, abstractions, or alternate flows unless they are required by the stated contract or a concrete security boundary.
- Before adding logic to fix an integration failure, verify that the app and API deployments are running compatible versions.
- Keep necessary validation focused at the actual trust boundary and avoid duplicating the same check across layers without a demonstrated need.

## Validation

- Run `npm run typecheck` after non-trivial changes.

## Local Libraries and Cross-Project Changes

- `src/libraries/unoqr-create/` and `src/libraries/digitalcards-layouts/` contain this project's own editable source. They must build in isolation, with no sibling-project imports, local npm archive dependencies or library sync scripts.
- Read each library's README.md and AGENTS.md before edits. They map corresponding names/files and explain when frontend, mobile, unoqr-app or API changes are needed.
- Make applicable matching edits directly in the other project's source during the task. Keep only the code and platform files each project uses; do not add unused libraries to other projects.
- Use the normal project build/typecheck to validate local source. Never require a separate library packing, compilation or update step.
