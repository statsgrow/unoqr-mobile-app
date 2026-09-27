import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { selectImage } from "@/components/files/ImagePicker";
import type { QrUserLogo } from "@/helpers/qrcodes/modify/logo";

/* ------------------ BREAK ------------------ */

// Selects a photo and converts it into an embedded PNG for every QR export format.
export async function pickQrLogo(): Promise<QrUserLogo | null> {
  const selected = await selectImage();
  if (!selected) return null;

  const image = await manipulateAsync(selected.uri, [{ resize: { width: 512 } }], {
    format: SaveFormat.PNG,
    base64: true
  });
  if (!image.base64) throw new Error("Could not prepare the selected logo.");

  return {
    uri: selected.uri,
    name: selected.name,
    dataUrl: `data:image/png;base64,${image.base64}`
  };
};//export ends
