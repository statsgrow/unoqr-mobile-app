import { Directory, File, Paths } from "expo-file-system";

import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { hashValue } from "@/libraries/unoqr-create/frame/dots";
import { frontendSettings, userTokenSettings } from "@/settings";
import { getUserTokens } from "@/utils/auth/AuthTokens";

/* ------------------ BREAK ------------------ */

type QrCardImageInput = { card: AppDigitalCardQr; draft: boolean; forceRefresh?: boolean; signal: AbortSignal };
type QrCardImagePayload = {
  name: string; position: string; company: string; primary_color: string;
  qr_design: Pick<AppDigitalCardQr["settings"], "dot" | "eye" | "frame" | "styles">;
  photo_url: string | null;
};
const CACHE_MAX_AGE = 5 * 60 * 1000;
const QR_CARD_LAYOUT_VERSION = "standard-svg-2";
const requests = new Set<AbortController>();
let requestsPaused = false;

/* ------------------ BREAK ------------------ */

// Uses the same image fingerprint for saved previews and identical unsaved QR appearance.
export function getQrCardImageKey(card: AppDigitalCardQr): string {
  const value = `${QR_CARD_LAYOUT_VERSION}-${JSON.stringify(getQrCardImagePayload(card))}`;
  return `${hashValue(value).toString(36)}-${hashValue(value.split("").reverse().join("")).toString(36)}`;
};//export ends

// Downloads the endpoint's PNG once and reuses the locally cached original bytes for display and sharing.
export async function loadQrCardImage({ card, draft, forceRefresh = false, signal }: QrCardImageInput): Promise<File> {
  if (requestsPaused || signal.aborted) throw new Error("The QR card preview was closed.");
  const folder = new Directory(Paths.cache, "digital-card-qrcards", card.userId, card.uid);
  const key = getQrCardImageKey(card);
  const cached = folder.exists ? folder.list().find((entry): entry is File => entry instanceof File && entry.name.startsWith(`${key}-`)) : null;
  if (!forceRefresh && cached && Date.now() - (cached.lastModified || 0) < CACHE_MAX_AGE) return cached;
  const file = new File(folder, `${key}-${Date.now()}.png`);
  const controller = new AbortController();
  // Cancels the network request when its editor or preview is dismissed.
  const cancel = (): void => controller.abort();//func ends
  signal.addEventListener("abort", cancel, { once: true });
  requests.add(controller);
  const timeout = setTimeout(cancel, 30000);
  try {
    const { accessToken, refreshToken } = await getUserTokens();
    if (!accessToken) throw new Error("Sign in to preview your QR card.");
    const url = frontendSettings.getFrontendUrl({ path: `/dc/${card.uid}/qrcard` });
    url.searchParams.set("type", "png");
    url.searchParams.set("preview", "true");
    url.searchParams.set("v", getQrCardImageKey(card));
    const response = await fetch(url.href, {
      method: draft ? "POST" : "GET",
      headers: {
        [userTokenSettings.headerTokens.accessToken.name]: accessToken,
        ...(refreshToken ? { [userTokenSettings.headerTokens.refreshToken.name]: refreshToken } : {}),
        ...(draft ? { "Content-Type": "application/json" } : {})
      },
      ...(draft ? { body: JSON.stringify(getQrCardImagePayload(card)) } : {}),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(await response.text() || "Your QR card could not be loaded.");
    if (!response.headers.get("content-type")?.startsWith("image/png")) throw new Error("The frontend did not return a QR card image.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (controller.signal.aborted || signal.aborted || requestsPaused) throw new Error("The QR card preview was closed.");
    folder.create({ intermediates: true, idempotent: true });
    file.create({ overwrite: true });
    file.write(bytes);
    // Keep only the latest successful portrait for this card.
    for (const previous of folder.list()) {
      if (previous instanceof File && previous.uri !== file.uri) previous.delete();
    };//for ends
    return file;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
    requests.delete(controller);
  };//try-catch ends
};//export ends

// Stops image downloads before logout removes the account's cached portraits.
export function pauseQrCardImageRequests(): void {
  requestsPaused = true;
  for (const controller of requests) controller.abort();
};//export ends

// Allows preview downloads again after local account cleanup completes.
export function resumeQrCardImageRequests(): void {
  requestsPaused = false;
};//export ends

/* ------------------ BREAK ------------------ */

// Sends only the fields the Standard QR-card layout actually displays.
function getQrCardImagePayload(card: AppDigitalCardQr): QrCardImagePayload {
  const { dot, eye, frame, styles } = card.settings;
  return {
    name: card.details.fullname, position: card.details.position, company: card.details.company,
    primary_color: card.primaryColor, qr_design: { dot, eye, frame, styles },
    photo_url: card.details.profilePicture?.url || null
  };
};//func ends
