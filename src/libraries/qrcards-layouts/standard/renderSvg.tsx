import { createQrSvg, type QrDesign } from "../../unoqr-create";

import { defaultValues, layoutSettings, logoPaths, type StandardQrCardInput } from "./dataJson";

/* ------------------ TYPES ------------------ */

type GetSvgProps = { data: StandardQrCardInput };
type TextProps = { value: string; y: number; size: number; color?: string; bold?: boolean };
type CachedQr = { key: string; svg: Promise<string> };

/* ------------------ BREAK ------------------ */

let cachedQr: CachedQr | null = null;

// Builds the complete Standard QR card as ordinary SVG markup without platform or server APIs.
export async function getSvg({ data }: GetSvgProps): Promise<string> {
  const values = { ...defaultValues, ...data };
  const primary = getColor(values.qrData?.styles?.card_primary_color || values.primaryColor, defaultValues.primaryColor);
  const background = getColor(values.qrData?.styles?.card_bg_color, layoutSettings.backgroundColor);
  const [red, green, blue] = [1, 3, 5].map((offset) => parseInt(primary.slice(offset, offset + 2), 16));
  const pattern = red * 0.299 + green * 0.587 + blue * 0.114 > 170 ? layoutSettings.textColor : layoutSettings.backgroundColor;
  const qr = await getQrSvg(values.url, values.qrData);
  // Keeps the full-name initial visible underneath the photo until its image finishes loading.
  const initial = Array.from(values.name.trim())[0]?.toUpperCase() || "A";
  const photoPlaceholder = `<rect x="460" y="148" width="280" height="280" fill="${layoutSettings.placeholderColor}"/>${renderText({ value: initial, y: 293, size: 120, bold: true })}`;
  const photo = photoPlaceholder + (values.photoUrl
    ? `<image x="460" y="148" width="280" height="280" preserveAspectRatio="xMidYMid slice" href="${escapeXml(values.photoUrl)}" xlink:href="${escapeXml(values.photoUrl)}"/>`
    : "");
  const logo = logoPaths.map((path) => `<path d="${path}"/>`).join("");

  //Default Return
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${layoutSettings.width}" height="${layoutSettings.height}" viewBox="0 0 ${layoutSettings.width} ${layoutSettings.height}">
    <defs>
      <clipPath id="standard-card-clip"><rect width="1200" height="1800" rx="72"/></clipPath>
      <clipPath id="standard-cover-clip"><rect width="1200" height="288"/></clipPath>
      <clipPath id="standard-photo-clip"><circle cx="600" cy="288" r="140"/></clipPath>
    </defs>
    <g clip-path="url(#standard-card-clip)">
      <rect width="1200" height="1800" fill="${background}"/>
      <g clip-path="url(#standard-cover-clip)">
        <rect width="1200" height="288" fill="${primary}"/>
        <circle cx="-60" cy="338" r="320" fill="${pattern}" opacity="0.07"/>
        <g fill="none" stroke="${pattern}" stroke-width="7" opacity="0.14">
          <circle cx="1230" cy="-65" r="300"/><circle cx="1230" cy="-65" r="405"/><circle cx="1230" cy="-65" r="510"/>
        </g>
      </g>
      <circle cx="600" cy="288" r="155" fill="${background}"/>
      <g clip-path="url(#standard-photo-clip)">${photo}</g>
      ${renderText({ value: values.name, y: 530, size: 72, bold: true })}
      ${renderText({ value: values.position, y: 610, size: 40, color: layoutSettings.mutedTextColor })}
      ${renderText({ value: values.company, y: 670, size: 36, color: layoutSettings.mutedTextColor })}
      ${positionSvg(qr, 260, 790, 680, 680)}
      ${renderText({ value: "Scan to connect", y: 1520, size: 44, bold: true })}
      ${renderText({ value: "Powered By", y: 1605, size: 28, color: layoutSettings.mutedTextColor })}
      <g transform="translate(480 1650) scale(${240 / layoutSettings.logoWidth})" fill="${layoutSettings.textColor}">${logo}</g>
    </g>
    <rect x="1.5" y="1.5" width="1197" height="1797" rx="70.5" fill="none" stroke="${layoutSettings.borderColor}" stroke-width="3"/>
  </svg>`;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Reuses the latest vector QR when only card colors, identity text or the photo changes.
function getQrSvg(url: string, qrData: QrDesign | null): Promise<string> {
  const design: QrDesign = {
    dot: qrData?.dot, eye: qrData?.eye, frame: qrData?.frame,
    styles: { fg_color: qrData?.styles?.fg_color || "#191414", bg_color: qrData?.styles?.bg_color || "#FFFFFF" },
  };
  const key = JSON.stringify([url, design]);
  if (cachedQr?.key === key) return cachedQr.svg;//if ends
  const svg = createQrSvg(url, design);
  cachedQr = { key, svg };
  // Allows a failed generation to be retried without retaining a rejected promise.
  void svg.catch(() => { if (cachedQr?.svg === svg) cachedQr = null; });//if ends
  return svg;
};//func ends

// Centers readable SVG text and reduces long identity lines to fit Standard's available width.
function renderText({ value, y, size, color = layoutSettings.textColor, bold = false }: TextProps): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return "";//if ends
  const units = Array.from(text).reduce((width, character) => width + (/[ilI.,'!|\s]/.test(character) ? 0.3 : /[MW@%]/.test(character) ? 0.95 : /[A-Z]/.test(character) ? 0.7 : /[^\x00-\x7F]/.test(character) ? 1 : 0.56), 0);
  const fontSize = Math.max(24, Math.min(size, layoutSettings.maxTextWidth / Math.max(units, 1)));
  const fit = units * fontSize > layoutSettings.maxTextWidth ? ` textLength="${layoutSettings.maxTextWidth}" lengthAdjust="spacingAndGlyphs"` : "";
  return `<text x="600" y="${y}" text-anchor="middle" alignment-baseline="central" font-family="${layoutSettings.fontFamily}" font-size="${fontSize}" font-weight="${bold ? 700 : 400}" fill="${color}"${fit}>${escapeXml(text)}</text>`;
};//func ends

// Positions QR paths with an explicit group transform because native SVG ignores nested SVG x/y offsets.
function positionSvg(svg: string, x: number, y: number, width: number, height: number): string {
  const start = svg.indexOf("<svg");
  const end = svg.indexOf(">", start);
  const viewBox = svg.slice(start, end).match(/\bviewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) throw new Error("The QR SVG is missing its valid viewBox.");//if ends
  const [left, top, svgWidth, svgHeight] = viewBox;
  const scale = Math.min(width / svgWidth, height / svgHeight);
  const offsetX = x + (width - svgWidth * scale) / 2;
  const offsetY = y + (height - svgHeight * scale) / 2;
  const body = svg.slice(end + 1).replace(/<\/svg>\s*$/, "");
  return `<g transform="translate(${offsetX} ${offsetY}) scale(${scale}) translate(${-left} ${-top})">${body}</g>`;
};//func ends

// Accepts dynamic hex colors before inserting them into SVG attributes.
function getColor(value: string | undefined, fallback: string): string {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
};//func ends

// Escapes text and photo URLs so display data cannot introduce SVG elements or attributes.
function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
};//func ends
