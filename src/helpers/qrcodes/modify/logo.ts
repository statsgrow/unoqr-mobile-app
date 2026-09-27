/* ------------------ BREAK ------------------ */

export type QrUserLogo = {
  uri: string;
  name: string;
  dataUrl: string;
};

/* ------------------ BREAK ------------------ */

// Clears a small center area and embeds the uploaded image in the QR SVG.
export function buildUserLogo(qrSize: number, logo: QrUserLogo, backgroundColor: string): string {
  const size = Math.min(14, (qrSize - 2) * 0.18);
  const offset = (qrSize - size) / 2;
  const padding = 0.5;

  return `<rect x="${offset - padding}" y="${offset - padding}" width="${size + padding * 2}" height="${size + padding * 2}" rx="0.5" fill="${backgroundColor}"/>`
    + `<image x="${offset}" y="${offset}" width="${size}" height="${size}" href="${logo.dataUrl}" preserveAspectRatio="xMidYMid meet"/>`;
};//export ends
