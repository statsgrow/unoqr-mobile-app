# UnoQR Create — Mobile

This is an ordinary source folder owned by **unoqr-mobile-app**. Its files are imported locally and compiled by this project's normal build. It has no local npm package, archive, generated distribution, sync command or build-time dependency on another UnoQR checkout.

The equivalent library in **unoqr-frontend** uses the same directory and helper names. The implementations are independent: humans and AI must review and edit the matching files directly when behavior should agree. Do not create a package connection or add unused platform files to either project.

## Usage

```ts
import { createQrSvg } from "@/libraries/unoqr-create";

const svg = await createQrSvg(content, design, {
  logoDataUrl: embeddedLogo,
  hideUnoqrLogo: false
});
```

`design` carries dot, eye, frame, foreground and background styles. Runtime colors accept six-digit hex values. Component colors fall back to the foreground. QR content is trimmed and limited to 500 Unicode characters. Frames keep deterministic decorative dots.

## Files and platform scope

- `index.ts`: SVG creation and runtime appearance resolution.
- `types.ts`: this project's QR design contract.
- `dot/`: square, rounded, dots, classy and connected module shapes.
- `eye/`: square, rounded, circle, leaf and frame finder eyes.
- `frame/`: square, round, squircle and no-frame behavior.
- `branding/`: official UnoQR wordmark geometry.
- `logo/`: embedded center-image geometry, used only by mobile's static QR creator.

Mobile also supports hidden branding and uploaded center logos, using high error correction when a logo is present. Native file access and PNG/JPEG/PDF exports remain in `helpers/qrcodes/create/QrCreate.ts` and the native logo file helper. These native operations do not belong in frontend.

## Cross-project update instructions for AI

| Change | Files to review and update |
| --- | --- |
| Dot, eye, frame or wordmark geometry | Matching files under `src/libraries/unoqr-create/` in **unoqr-frontend** and **unoqr-mobile-app** |
| Dynamic colors, defaults, matrix behavior or supported shape names | `index.ts`, `types.ts` and affected shape files in both projects; retain intentional platform-specific options |
| Native uploaded logo or file export | Mobile `logo/` and its native helpers; frontend needs no added files unless its product flow starts using that feature |
| QR-card composition or raster conversion | Mobile previews use `libraries/qrcards-layouts/standard/` and this QR generator locally. Frontend `helpers/digital_cards/qrcards/` still owns saved image/export generation; check both for shared design changes |

**unoqr-app** also has QR generation under `src/helpers/content/qrcodes/qrPreview/` (including `QrEyes.ts` and `QrFrames.tsx`). Review that implementation when changing QR styling or the stored design contract. It has not been reorganized into this library directory; do not add files there merely because this project's library changes. **unoqr-api** and **unoqr-page-blocks** do not use these local generator folders.

### Before finishing a change

1. Read this README and the matching other project's README.
2. Edit the current project's local source and the other project's matching source when the change applies there.
3. Preserve platform-specific differences instead of copying incompatible imports or unnecessary files.
4. Run the normal checks: mobile `npm run typecheck`, frontend TypeScript/production build, and relevant QR previews. No sync, packing or library compilation command is required.
5. Report which projects changed and any intentionally unaffected project. Each project is deployed independently from its own files.
