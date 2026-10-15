/* ------------------ BREAK ------------------ */

// Clears a small center area and embeds a prepared image without reading platform files.
export function buildUserLogo(qrSize: number, dataUrl: string, backgroundColor: string): string {
  if (!/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(dataUrl)) throw new Error("The QR logo must be a base64 image data URL.");
  const size = Math.min(14, (qrSize - 2) * 0.18);
  const offset = (qrSize - size) / 2;
  const padding = 0.5;
  return `<rect x="${offset - padding}" y="${offset - padding}" width="${size + padding * 2}" height="${size + padding * 2}" rx="0.5" fill="${backgroundColor}"/>`
    + `<image x="${offset}" y="${offset}" width="${size}" height="${size}" href="${dataUrl}" preserveAspectRatio="xMidYMid meet"/>`;
};//export ends
