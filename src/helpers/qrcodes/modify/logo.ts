import { getFile } from "@/components/files/FileStorage";

/* ------------------ BREAK ------------------ */

export type QrUserLogo = { uri: string; name: string; dataUrl?: string };//export ends

/* ------------------ BREAK ------------------ */

// Reads the native logo file once and supplies its embedded bytes to the local generator.
export async function getQrLogoDataUrl(logo: QrUserLogo): Promise<string> {
  return logo.dataUrl ?? `data:image/png;base64,${await getFile(logo.uri).base64()}`;
};//export ends
