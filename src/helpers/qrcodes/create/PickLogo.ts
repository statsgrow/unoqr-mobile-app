import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { selectImage } from "@/components/files/ImagePicker";
import { saveFile } from "@/components/files/FileStorage";
import type { QrUserLogo } from "@/helpers/qrcodes/modify/logo";
import { getUUIDv4 } from "@/utils/general/Uid";

/* ------------------ BREAK ------------------ */

// Selects a photo and saves a resized PNG in persistent QR file storage.
export async function pickQrLogo(): Promise<QrUserLogo | null> {
  const selected = await selectImage();
  if (!selected) return null;

  const image = await manipulateAsync(selected.uri, [{ resize: { width: 512 } }], {
    format: SaveFormat.PNG
  });
  const path = await saveFile({ uri: image.uri, name: `${getUUIDv4()}.png`, folder: "qrcodes" });

  return {
    uri: path,
    name: selected.name
  };
};//export ends
