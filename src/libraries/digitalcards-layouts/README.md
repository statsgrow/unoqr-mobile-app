# Digital Card Layouts — Mobile

This library belongs to **unoqr-mobile-app** and works entirely from this project's source. The other project's library has the same name and matching layout filenames so AI can find related edits. The projects are deliberately independent; changes are coordinated through direct source edits and these instructions.

## Platform usage

```tsx
import { getDigitalCardLayout, getDigitalCardLayoutData } from "@/libraries/digitalcards-layouts";

const Layout = getDigitalCardLayout(card.layout);
<Layout data={getDigitalCardLayoutData(card)} primaryColor={card.primaryColor} onOpenLink={openLink} />;
```

This project contains **native/** only. It does not need the other platform's renderers. `Modern.tsx`, `Centered.tsx`, `Spotlight.tsx` and `Minimal.tsx` are the local implementations; `shared.tsx` holds their common body.

- `core/types.ts`: layout identifiers, social-link shape and profile data contract.
- `core/options.ts`: layout names and picker values.
- `core/pattern.ts`: adaptive pattern color.
- `core/sampleLayoutData.ts`: example profile fields, including Website, LinkedIn, Facebook and Instagram.

Native layouts import this app's theme tokens directly. `native/SocialIcon.tsx` uses its official local SVG assets and Lucide contact icons. `native/shared.tsx` also exports `CardFooter`, with the local UnoQR brand component. Native fonts are loaded by the app as before. Native contact-saving actions use the app's shared `PxCircularProgress` loading icon; this is a mobile-only component change and needs no frontend library update.

`sampleLayoutData.ts` adds local portrait assets to the example fields. The layout form uses these layouts for compact thumbnails and eye-button PxModal samples. The actual profile preview uses exactly the same local renderer. No theme injection wrappers or cross-project package adapters are needed.

Pass `isPreview={true}` for sample layouts. Samples are read-only and omit the Save Contact/brand footer, including its modal footer slot. `CardFooter` also accepts `isPreview` and returns nothing when it is true. Real card previews omit this prop and retain their normal contact actions. This sample-modal behavior is native-only; frontend has no corresponding sample footer to update.

All four layouts use icon-only social links with accessible labels. Centered keeps black outlines; other layouts retain their existing accent colors. Primary color is supplied dynamically. Photo values are URL strings on web and `ImageSourcePropType` on native. API/form field mapping, storage, linking, modal state and contact saving stay in the relevant app files.

## What AI must update in other projects

| Change | Projects/files to review |
| --- | --- |
| Design change shared by both platforms | `unoqr-frontend/src/libraries/digitalcards-layouts/react/{LayoutName}.tsx` and `unoqr-mobile-app/src/libraries/digitalcards-layouts/native/{LayoutName}.tsx`, plus their `shared.tsx` files |
| Sample profile, social labels, layout options or adaptive pattern | Matching `core/` files in frontend and mobile |
| Social icon or link appearance | Frontend `core/icons.ts` + `react/SocialIcon.tsx`; mobile `native/SocialIcon.tsx` + its local SVG assets; both shared bodies |
| Native-only spacing, fonts, local portraits or linking | Mobile native/library and feature files only |
| Web-only responsive CSS, Next Image or browser behavior | Frontend React/library and feature files only |
| Add/rename a persisted layout identifier | Both `core/types.ts` and `core/options.ts`, app form/preview validators and API validation/storage rules |

**unoqr-app** is not a consumer of these profile-layout folders. Review its UI/API contract if a change affects an existing digital-card editor, but do not populate it with unused library files. **unoqr-api** supplies data and needs review for contract changes, not ordinary styling. **unoqr-page-blocks** remains a separate managed library and needs no changes for ordinary digital-card styling.

QR-card composition is separate: mobile renders local SVG through `src/libraries/qrcards-layouts/standard/`; frontend still prepares saved images under `helpers/digital_cards/qrcards/`. This library renders digital business-card profiles; changing it does not change QR-card layouts. QR generation lives in each project's own `unoqr-create` folder.

## Work and deployment rules

1. Read this README and the corresponding project's README before editing a layout.
2. Make required matching source edits directly in both projects. Keep platform-specific files/imports local and update this mapping when ownership changes.
3. Validate with the normal project checks: mobile `npm run typecheck` and native picker/modal/profile inspection; frontend TypeScript/production build and browser inspection.
4. Report which projects were updated and which are intentionally unaffected.

There is no package version to synchronize, no archive to generate, and no library build or update command. Each project compiles and deploys its own source normally. Do not reintroduce local npm dependencies, sync scripts or unused platform folders.

Modern and Centered use optional `data.featurePhoto` as a full-width 2.7:1 header, matching the cover editor crop. Without a feature photo they retain their original primary-color patterns. Spotlight and Minimal keep their existing designs. Mobile layout thumbnails and sample modals receive the saved feature photo while retaining sample identities.
