import { getFile } from "@/components/files/FileStorage";

/* ------------------ BREAK ------------------ */

export type QrUserLogo = {
  uri: string;
  name: string;
  dataUrl?: string;
};

/* ------------------ BREAK ------------------ */

// Clears a small center area and embeds the uploaded image in the QR SVG.
export async function buildUserLogo(qrSize: number, logo: QrUserLogo, backgroundColor: string): Promise<string> {
  // Previously saved logos contain an embedded image instead of a stored file path.
  const dataUrl = logo.dataUrl ?? `data:image/png;base64,${await getFile(logo.uri).base64()}`;
  const size = Math.min(14, (qrSize - 2) * 0.18);
  const offset = (qrSize - size) / 2;
  const padding = 0.5;

  return `<rect x="${offset - padding}" y="${offset - padding}" width="${size + padding * 2}" height="${size + padding * 2}" rx="0.5" fill="${backgroundColor}"/>`
    + `<image x="${offset}" y="${offset}" width="${size}" height="${size}" href="${dataUrl}" preserveAspectRatio="xMidYMid meet"/>`;
};//export ends
