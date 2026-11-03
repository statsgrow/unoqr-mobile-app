import { File, Paths } from "expo-file-system";

import type { RemoteCard } from "@/helpers/digital_cards/api/cards";
import { frontendSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

// Loads a temporary published QR image for the shared preview exporter; the caller removes it after reading.
export async function loadPublishedGroupQrCard(card: Pick<RemoteCard, "uid" | "version" | "status">, signal: AbortSignal): Promise<File> {
  if (card.status !== "published") throw new Error("Ask the card owner to publish this card before sharing it.");
  const url = frontendSettings.getFrontendUrl({ path: `/dc/${encodeURIComponent(card.uid)}/qrcard` });
  url.searchParams.set("type", "png");
  url.searchParams.set("v", String(card.version));
  const response = await Axios.get<ArrayBuffer>(url.href, { responseType: "arraybuffer", signal, timeout: 30000 });
  if (!String(response.headers["content-type"] || "").startsWith("image/png")) throw new Error("The QR card image could not be prepared.");
  if (String(response.headers["x-digital-card-version"]) !== String(card.version)) throw new Error("The card has changed. Refresh it before downloading its QR card.");
  if (signal.aborted) throw new Error("The QR export was closed.");
  const file = new File(Paths.cache, `group-${card.uid}-${Date.now()}.png`);
  try {
    file.create({ overwrite: true });
    file.write(new Uint8Array(response.data));
    return file;
  } catch (error: unknown) { if (file.exists) file.delete(); throw error; };//try-catch ends
};//export ends
