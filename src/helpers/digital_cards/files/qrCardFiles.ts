import { Directory, File, Paths } from "expo-file-system";

import { getCachedDigitalCard } from "@/helpers/digital_cards/db/getQueries";
import { getData } from "@/utils/general/Storage";
import type { UserType } from "@/utils/auth/UserTypes";
import type { RemoteCard } from "@/helpers/digital_cards/api/cards";
import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { hashValue } from "@/libraries/unoqr-create/frame/dots";
import { layoutSettings } from "@/libraries/qrcards-layouts/standard/dataJson";
import { frontendSettings, userTokenSettings } from "@/settings";
import { getUserTokens } from "@/utils/auth/AuthTokens";

/* ------------------ BREAK ------------------ */

type QrCardImageInput = { card: AppDigitalCardQr; draft: boolean; forceRefresh?: boolean; signal: AbortSignal };
type QrCardImagePayload = {
  name: string; position: string; company: string; primary_color: string;
  qr_design: Pick<AppDigitalCardQr["settings"], "dot" | "eye" | "frame" | "styles">;
  photo_url: string | null;
};
type QrCardImageFormat = "png" | "jpg" | "svg";
type QrCardImageSource = { uid: string; userId: string; version?: number; payload: QrCardImagePayload };
type ImageDownload = { format: QrCardImageFormat; bytes: Uint8Array };
type SavedImageRequest = { key: string; request: Promise<File> };
const IMAGE_FORMATS: QrCardImageFormat[] = ["png", "jpg", "svg"];
const savedRequests = new Map<string, SavedImageRequest>();
const QR_CARD_LAYOUT_VERSION = layoutSettings.version;
const requests = new Set<AbortController>();
let requestsPaused = false;

/* ------------------ BREAK ------------------ */

// Fingerprints the card identity and visible fields so saved files change only with their image content.
export function getQrCardImageKey(card: AppDigitalCardQr): string {
  return getImageKey({ uid: card.uid, userId: card.userId, version: card.version, payload: getQrCardImagePayload(card) });
};//export ends

// Reuses persistent saved files for previews and sharing; unsaved previews stay in temporary storage.
export async function loadQrCardImage({ card, draft, forceRefresh = false, signal }: QrCardImageInput): Promise<File> {
  const source = { uid: card.uid, userId: card.userId, version: card.version, payload: getQrCardImagePayload(card) };
  if (requestsPaused || signal.aborted) throw new Error("The QR card preview was closed.");
  if (!draft) return storeImageFiles(source, forceRefresh);
  return downloadImageFiles(source, true, forceRefresh, signal);
};//export ends

// Downloads the saved card's PNG, JPG and SVG by UID using its current SQLite version and owner.
export async function downloadDigitalCardImages(uid: string, userId?: string): Promise<void> {
  const owner = userId ?? (await getData({ key: userTokenSettings.storageTokens.userData.name }) as UserType | null)?.id;
  if (!owner) throw new Error("Sign in to prepare your QR card.");
  const card = await getCachedDigitalCard(owner, uid);
  if (!card) throw new Error("Your digital card could not be found on this device.");
  await storeSavedQrCardImages(card);
};//export ends

// Stores all three QR-card file formats using the API-confirmed values after a card save.
export async function storeSavedQrCardImages(card: RemoteCard): Promise<void> {
  const { dot, eye, frame, styles } = card.qr_design;
  await storeImageFiles({
    uid: card.uid, userId: card.user_id, version: card.version,
    payload: {
      name: card.fullname || card.name, position: card.position, company: card.company,
      primary_color: card.primary_color, qr_design: { dot, eye, frame, styles }, photo_url: card.photo?.url || card.photo_url
    }
  });
};//export ends

// Removes a deleted card's persistent images and any unsaved preview files.
export function deleteQrCardImages(uid: string): void {
  for (const root of [Paths.document, Paths.cache]) {
    const folder = new Directory(root, "qrcards", uid);
    if (folder.exists) folder.delete();
  };//for ends
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

// Shares matching downloads and keeps newer replacements after older downloads for the same card.
function storeImageFiles(source: QrCardImageSource, forceRefresh = false): Promise<File> {
  const key = getImageKey(source);
  const pending = savedRequests.get(source.uid);
  if (pending?.key === key) return pending.request;
  const request = pending
    ? pending.request.catch(() => undefined).then(() => downloadImageFiles(source, false, forceRefresh))
    : downloadImageFiles(source, false, forceRefresh);
  savedRequests.set(source.uid, { key, request });
  // Removes only this download so an older completion cannot clear a queued replacement.
  const clear = (): void => {
    if (savedRequests.get(source.uid)?.request === request) savedRequests.delete(source.uid);
  };//func ends
  void request.then(clear, clear);
  return request;
};//func ends

// Writes a complete replacement set before removing older images from this card's folder.
async function downloadImageFiles(source: QrCardImageSource, draft: boolean, forceRefresh: boolean, signal?: AbortSignal): Promise<File> {
  if (requestsPaused || signal?.aborted) throw new Error("The QR card preview was closed.");
  if (!draft && (!Number.isSafeInteger(source.version) || source.version! < 1)) {
    throw new Error("Refresh your digital card to get its server version before preparing its QR images.");
  };//if ends
  const folder = new Directory(draft ? Paths.cache : Paths.document, "qrcards", source.uid);
  const key = getImageKey(source);
  const formats: QrCardImageFormat[] = draft ? ["png"] : IMAGE_FORMATS;
  const file = new File(folder, `${key}.png`);
  if (!forceRefresh && formats.every((format) => new File(folder, `${key}.${format}`).exists)) return file;
  const controller = new AbortController();
  // Cancels draft downloads when their preview closes and all downloads during account cleanup.
  const cancel = (): void => controller.abort();//func ends
  signal?.addEventListener("abort", cancel, { once: true });
  requests.add(controller);
  const timeout = setTimeout(cancel, 30000);
  try {
    const { accessToken, refreshToken } = await getUserTokens();
    if (!accessToken) throw new Error("Sign in to prepare your QR card.");
    const downloads = await Promise.all(formats.map(async (format): Promise<ImageDownload> => {
      const url = frontendSettings.getFrontendUrl({ path: `/dc/${source.uid}/qrcard` });
      url.searchParams.set("type", format);
      url.searchParams.set("layout", QR_CARD_LAYOUT_VERSION);
      url.searchParams.set("preview", "true");
      if (source.version) url.searchParams.set("v", String(source.version));
      if (draft) url.searchParams.set("design", key);
      const response = await fetch(url.href, {
        method: draft ? "POST" : "GET",
        headers: {
          [userTokenSettings.headerTokens.accessToken.name]: accessToken,
          ...(refreshToken ? { [userTokenSettings.headerTokens.refreshToken.name]: refreshToken } : {}),
          ...(draft ? { "Content-Type": "application/json" } : {})
        },
        ...(draft ? { body: JSON.stringify(source.payload) } : {}),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(await response.text() || "Your QR card could not be loaded.");
      if (!draft && response.headers.get("x-digital-card-version") !== String(source.version)) {
        throw new Error("Your QR card image does not match the saved card version. Refresh your card and try again.");
      };//if ends
      const mimeType = format === "jpg" ? "image/jpeg" : format === "svg" ? "image/svg+xml" : "image/png";
      if (!response.headers.get("content-type")?.startsWith(mimeType)) throw new Error("The frontend did not return a QR card image.");
      return { format, bytes: new Uint8Array(await response.arrayBuffer()) };
    }));
    if (controller.signal.aborted || signal?.aborted || requestsPaused) throw new Error("The QR card preview was closed.");
    folder.create({ intermediates: true, idempotent: true });
    for (const download of downloads) {
      const output = new File(folder, `${key}.${download.format}`);
      output.create({ overwrite: true });
      output.write(download.bytes);
    };//for ends
    for (const previous of folder.list()) {
      if (previous instanceof File && !formats.some((format) => previous.name === `${key}.${format}`)) previous.delete();
    };//for ends
    return file;
  } catch (error: unknown) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
    requests.delete(controller);
  };//try-catch ends
};//func ends

// Includes the account and card identity to keep cached image fingerprints distinct.
function getImageKey(source: QrCardImageSource): string {
  const value = `${QR_CARD_LAYOUT_VERSION}-${source.userId}-${source.uid}-${source.version ?? "draft"}-${JSON.stringify(source.payload)}`;
  return `${hashValue(value).toString(36)}-${hashValue(value.split("").reverse().join("")).toString(36)}`;
};//func ends

// Sends only the fields the Standard QR-card layout actually displays.
function getQrCardImagePayload(card: AppDigitalCardQr): QrCardImagePayload {
  const { dot, eye, frame, styles } = card.settings;
  return {
    name: card.details.fullname, position: card.details.position, company: card.details.company,
    primary_color: card.primaryColor, qr_design: { dot, eye, frame, styles },
    photo_url: card.details.profilePicture?.url || null
  };
};//func ends
