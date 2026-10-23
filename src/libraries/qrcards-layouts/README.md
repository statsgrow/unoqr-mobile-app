# QR Card Layouts — Mobile

Each layout has two source files: `standard/dataJson.ts` defines its display types, required defaults, dimensions and official logo paths; `standard/renderSvg.tsx` exports `getSvg({ data })`, returning a promise of ordinary SVG markup. Despite its extension, the renderer contains no JSX, React, React Native, filesystem, network or server APIs. Its only rendering dependency is this project's local `unoqr-create` vector generator.

```tsx
import { getSvg } from "@/libraries/qrcards-layouts/standard/renderSvg";

const xml = await getSvg({
  data: {
    url: settings.content,
    name: details.fullname,
    position: details.position,
    company: details.company,
    primaryColor,
    photoUrl: details.profilePicture?.url || details.profilePicture?.uri || null,
    qrData: settings,
  },
});
```

`url` is required and must contain the real QR destination. Other fields default through `dataJson.ts`. Images are referenced by URL in SVG, never downloaded or rasterized by the generator. Embedding prepared image data URLs is also supported. Display text and image attributes are XML-escaped. QR geometry and its colors retain the existing `unoqr-create` validation.

Standard retains the 1200 × 1800 portrait, cover pattern, circular photo, identity text, styled QR and official wordmark. The app loads the bundled Schibsted Grotesk font, with its license under `src/assets/fonts/digital-cards/`. Text uses SVG text elements rather than server-only font outlines; long lines shrink to fit. A single cached QR promise avoids recalculating QR geometry when only card colors, identity text or the profile image changes.

`helpers/digital_cards/components/DigitalCardQrPreview.tsx` maps current saved or RHF draft data into this renderer and displays the resulting string through `SvgXml`. It shows the shared skeleton while a local calculation is pending and ignores superseded results. Form/modal state, RHF dirty tracking, saving, storage and file sharing stay outside this library.

Only Save persists QR appearance. The existing API-confirmed saved-image preparation remains unchanged. Explicit image sharing/downloads reuse those saved frontend PNG files; the native preview never makes PNGs or requests the frontend image endpoint while editing.

Frontend now contains identical `libraries/qrcards-layouts/standard/dataJson.ts` and `renderSvg.tsx` files. Its browser preview renders the same SVG inline; `helpers/digital_cards/qrcards/layouts/Standard.ts` only adapts saved data and outlines generated text for font-independent exports. Server photo preparation and image conversion remain outside the library. Keep both layout source files identical through direct source edits, with no cross-project imports, packages, generated distributions or synchronization scripts.

Future layouts receive their own `dataJson.ts` and `renderSvg.tsx`. Do not reuse the profile card's persisted `layout` field for QR-card layouts. Add persisted QR layout selection separately when requested.

Follow the mobile project's TypeScript, one-line function comments, section-divider and closing-comment conventions. Validate with the normal `npm run typecheck`, SVG output checks and native preview inspection.

`layoutSettings.version` identifies the SVG implementation. It is currently `standard-svg-3` and is shared with frontend. It feeds the saved-file cache key and `layout` image URL parameter so older exported images are regenerated after layout changes. The separate numeric `v` parameter still checks the saved card data version; local SVG previews need neither an image URL nor `v`.
