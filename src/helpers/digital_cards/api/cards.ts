import axios from "axios";

import type { FileInputValue } from "@/components/form/PxFileInput";
import type { AppDigitalCardQr, DigitalCardDetails, DigitalCardSettingsValues } from "@/helpers/digital_cards/model";
import { cacheDigitalCard } from "@/helpers/digital_cards/db/insertQueries";
import { getCachedDigitalCard } from "@/helpers/digital_cards/db/getQueries";
import { deleteCachedDigitalCard } from "@/helpers/digital_cards/db/deleteQueries";
import { deleteQrCardImages, downloadDigitalCardImages } from "@/helpers/digital_cards/files/qrCardFiles";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { apiSettings, userTokenSettings } from "@/settings";
import type { UserType } from "@/utils/auth/UserTypes";
import { getData } from "@/utils/general/Storage";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

type CardPayload = Omit<DigitalCardDetails, "profilePicture" | "featurePhoto" | "socialLinks"> & {
  uid: string;
  name: string;
  url: string;
  status: DigitalCardSettingsValues["status"];
  photo_url: string | null;
  feature_photo_url: string | null;
  social_links: DigitalCardDetails["socialLinks"];
  layout: AppDigitalCardQr["layout"];
  primary_color: string;
  qr_design: Pick<AppDigitalCardQr["settings"], "dot" | "eye" | "frame" | "styles">;
  seo: { title: string; description: string; allow_indexing: boolean };
  allow_save_contact: boolean;
  is_contact_required: boolean;
};
export type RemoteCard = CardPayload & {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  published_at: string | null;
  photo: FileInputValue | null;
  feature_photo?: FileInputValue | null;
};//export ends
export type DigitalCardFileField = "photo_url" | "feature_photo_url";
export type DigitalCardUpdate = Partial<Omit<CardPayload, "uid" | "url">>;
type BackgroundPostUpdate = { uid: string; request: Promise<void> };
type CardResponse = { data: RemoteCard | null };
type CardReadOptions = { uid?: string };
type CardRequest = { method: "get" | "post" | "put"; payload?: unknown; uid?: string }
  | { method: "delete"; payload: { uid: string }; uid?: never };

/* ------------------ BREAK ------------------ */

const pendingRequests = new Set<Promise<RemoteCard | null>>();
const backgroundPostUpdates = new Set<BackgroundPostUpdate>();
let requestsPaused = false;

// Reads the saved account's SQLite card without refreshing authentication or requesting API data.
export async function getDigitalCard({ uid }: CardReadOptions = {}): Promise<RemoteCard | null> {
  try {
    return await requestDigitalCard({ method: "get", uid });
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Deletes the remote card first and clears only its matching SQLite cache after API success.
export async function deleteDigitalCard(uid: string): Promise<void> {
  try {
    await requestDigitalCard({ method: "delete", payload: { uid } });
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Drains old account requests before logout clears their locally stored responses.
export async function pauseDigitalCardRequests(): Promise<void> {
  requestsPaused = true;
  await Promise.allSettled([...pendingRequests, ...[...backgroundPostUpdates].map(({ request }) => request)]);
};//export ends

// Allows card reads and saves after account cleanup finishes.
export function resumeDigitalCardRequests(): void {
  requestsPaused = false;
};//export ends

// Updates supplied card fields through the existing endpoint and shared post-save processing.
export async function updateDigitalCard(uid: string, changes: DigitalCardUpdate): Promise<RemoteCard> {
  const saved = await requestDigitalCard({ method: "put", payload: { ...changes, uid } });
  if (!saved) throw new Error("Your digital card could not be saved.");
  return saved;
};//export ends

// Attaches or clears one uploaded file URL without changing the card's other fields.
export async function updateDigitalCardFile(uid: string, field: DigitalCardFileField, url: string | null): Promise<RemoteCard> {
  try {
    return await updateDigitalCard(uid, { [field]: url });
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Creates or updates the account's card with the uploaded profile picture's URL.
export async function saveDigitalCard(card: AppDigitalCardQr, exists: boolean): Promise<RemoteCard> {
  const { profilePicture, featurePhoto, socialLinks, ...details } = card.details;
  const { dot, eye, frame, styles } = card.settings;
  const payload: CardPayload = {
    ...details, phones: details.phones.filter((phone) => phone.value.trim()),
    emails: details.emails.filter((email) => email.value.trim()), uid: card.uid, url: `https://unoqr.com/dc/${card.uid}`,
    name: card.cardSettings.name, status: card.cardSettings.status, photo_url: profilePicture?.url || null, feature_photo_url: featurePhoto?.url || null, social_links: socialLinks,
    layout: card.layout, primary_color: card.primaryColor,
    qr_design: { dot, eye, frame, styles },
    seo: { title: card.cardSettings.seoTitle, description: card.cardSettings.seoDescription, allow_indexing: card.cardSettings.allowIndexing },
    allow_save_contact: card.cardSettings.allowSaveContact,
    is_contact_required: card.cardSettings.isContactRequired
  };
  try {
    const saved = exists ? await updateDigitalCard(card.uid, payload) : await requestDigitalCard({ method: "post", payload });
    if (!saved) throw new Error("Your digital card could not be saved.");
    return saved;
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Updates only QR appearance and card colors, leaving publication status and other card fields intact.
export async function saveDigitalCardQrDesign(uid: string, settings: AppDigitalCardQr["settings"]): Promise<RemoteCard> {
  const { dot, eye, frame, styles } = settings;
  try {
    const saved = await updateDigitalCard(uid, { qr_design: { dot, eye, frame, styles } });
    if (!saved) throw new Error("Your QR card settings could not be saved.");
    return saved;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Open Preview to create your digital card first, then save its QR settings.");
    };//if ends
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Saves only the Details section and its uploaded photo without changing publication or appearance.
export async function saveDigitalCardDetails(uid: string, details: DigitalCardDetails): Promise<RemoteCard> {
  const { profilePicture, featurePhoto, socialLinks, ...values } = details;
  const payload = {
    ...values, uid, photo_url: profilePicture?.url || null, feature_photo_url: featurePhoto?.url || null, social_links: socialLinks,
    phones: values.phones.filter((phone) => phone.value.trim()),
    emails: values.emails.filter((email) => email.value.trim())
  };
  try {
    const saved = await updateDigitalCard(uid, payload);
    if (!saved) throw new Error("Your digital card details could not be saved.");
    return saved;
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Saves only the photo URL and caches the confirmed API response before old-file cleanup.
export async function saveDigitalCardPhoto(uid: string, photo: FileInputValue): Promise<RemoteCard> {
  if (!photo.url) throw new Error("Your uploaded photo URL is missing. Please try again.");
  try {
    const saved = await updateDigitalCardFile(uid, "photo_url", photo.url);
    if (!saved) throw new Error("Your profile photo could not be saved.");
    return saved;
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Updates only layout choices, preserving publication status, details and QR design.
export async function saveDigitalCardLayout(uid: string, layout: AppDigitalCardQr["layout"], primaryColor: string): Promise<RemoteCard> {
  try {
    const saved = await updateDigitalCard(uid, { layout, primary_color: primaryColor });
    if (!saved) throw new Error("Your card layout could not be saved.");
    return saved;
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Updates publication and sharing settings without overwriting the other editor sections.
export async function saveDigitalCardSettings(uid: string, settings: DigitalCardSettingsValues): Promise<RemoteCard> {
  try {
    const saved = await updateDigitalCard(uid, {
      name: settings.name, status: settings.status,
      seo: { title: settings.seoTitle, description: settings.seoDescription, allow_indexing: settings.allowIndexing },
      allow_save_contact: settings.allowSaveContact,
      is_contact_required: settings.isContactRequired
    });
    if (!saved) throw new Error("Your card settings could not be saved.");
    return saved;
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Maps server fields and the linked profile picture into the existing RHF values.
export function restoreDigitalCard(remote: RemoteCard, local: AppDigitalCardQr): AppDigitalCardQr {
  return {
    ...local, id: remote.id, uid: remote.uid, userId: remote.user_id, version: remote.version, updated_at: remote.updated_at,
    details: {
      profilePicture: remote.photo_url || remote.photo?.url ? { ...remote.photo, url: remote.photo?.url || remote.photo_url } : null,
      featurePhoto: remote.feature_photo_url ? { ...remote.feature_photo, url: remote.feature_photo_url } : null,
      fullname: remote.fullname || remote.name, company: remote.company,
      position: remote.position, phones: remote.phones.length ? remote.phones : [{ value: "" }],
      emails: remote.emails.length ? remote.emails : [{ value: "" }], socialLinks: remote.social_links,
      bio: remote.bio, address: remote.address
    },
    settings: { ...local.settings, ...remote.qr_design, name: "My Qr", hide_logo: false, logo: null, content: remote.url },
    layout: remote.layout, primaryColor: remote.primary_color,
    cardSettings: { name: remote.fullname?.trim() ? remote.name || "My Card" : "My Card", status: remote.status, seoTitle: remote.seo.title, seoDescription: remote.seo.description, allowIndexing: remote.seo.allow_indexing, allowSaveContact: remote.allow_save_contact, isContactRequired: remote.is_contact_required ?? false }
  };
};//export ends

// Tracks the entire read or write so account cleanup cannot race a late cache update.
function requestDigitalCard(request: CardRequest): Promise<RemoteCard | null> {
  if (requestsPaused) return Promise.reject(new Error("Your account session is being reset. Try again."));
  const pending = performDigitalCardRequest(request);
  pendingRequests.add(pending);
  void pending.then(() => pendingRequests.delete(pending), () => pendingRequests.delete(pending));
  return pending;
};//func ends

// Persists API-confirmed fields before any caller displays or reuses the response.
async function performDigitalCardRequest({ method, payload, uid }: CardRequest): Promise<RemoteCard | null> {
  if (method === "get") {
    const storedUser = await getData({ key: userTokenSettings.storageTokens.userData.name }) as UserType | null;
    return storedUser?.id ? getCachedDigitalCard(storedUser.id, uid) : null;
  };//if ends
  const user = await getStorageUser();
  if (!user) throw new Error("Sign in to load your digital card.");
  const response = await Axios.request<CardResponse>({
    url: apiSettings.getApiUrl({ path: "/app/digital_cards" }).href, method, data: payload, ...(uid ? { params: { uid } } : {}), timeout: 15000
  });
  if (method === "delete") {
    await deleteCachedDigitalCard(user.id, payload.uid);
    // Drain this card's in-flight downloads before removing its files, preventing late recreation.
    await Promise.allSettled([...backgroundPostUpdates].filter((job) => job.uid === payload.uid).map((job) => job.request));
    deleteQrCardImages(payload.uid);
    return null;
  };//if ends
  const remote = response.data.data;
  if (!remote) return null;
  return postUpdateProcess(remote, user.id);
};//func ends

/* ------------------ BREAK ------------------ */

// Stores the confirmed card first and prepares versioned QR images without blocking the form.
async function postUpdateProcess(remote: RemoteCard, userId: string): Promise<RemoteCard> {
  if (remote.user_id !== userId) throw new Error("Your digital card belongs to a different account.");
  if (!Number.isSafeInteger(remote.version) || remote.version < 1) throw new Error("The digital card API must return a positive server version.");
  const saved = await cacheDigitalCard(remote);
  if (!requestsPaused) {
    const request = downloadDigitalCardImages(saved.uid, saved.user_id).catch((error: unknown) => {
      // Preview retries missing images; a QR download failure does not undo a confirmed card save.
      console.error("Your digital card was saved, but its local QR images could not be prepared:", error);
    });
    const job: BackgroundPostUpdate = { uid: saved.uid, request };
    backgroundPostUpdates.add(job);
    void request.then(() => backgroundPostUpdates.delete(job));
  };//if ends
  return saved;
};//func ends

/* ------------------ BREAK ------------------ */

// Presents the API's validation and authentication message in the form's existing error area.
function cardApiError(error: unknown): Error {
  if (axios.isAxiosError<{ message?: string }>(error)) return new Error(error.response?.data?.message || error.message);
  return error instanceof Error ? error : new Error("Your digital card request failed. Try again.");
};//func ends
