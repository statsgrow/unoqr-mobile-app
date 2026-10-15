import axios from "axios";

import type { FileInputValue } from "@/components/form/PxFileInput";
import type { AppDigitalCardQr, DigitalCardDetails, DigitalCardSettingsValues } from "@/helpers/digital_cards/model";
import { cacheDigitalCard } from "@/helpers/digital_cards/db/insertQueries";
import { getCachedDigitalCard } from "@/helpers/digital_cards/db/getQueries";
import { deleteCachedDigitalCard } from "@/helpers/digital_cards/db/deleteQueries";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

type CardPayload = Omit<DigitalCardDetails, "profilePicture" | "socialLinks"> & {
  uid: string;
  name: string;
  url: string;
  status: DigitalCardSettingsValues["status"];
  photo_url: string | null;
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
  published_at: string | null;
  feature_photo_url: string | null;
  photo: FileInputValue | null;
};//export ends
type CardResponse = { data: RemoteCard | null };
type CardReadOptions = { forceRefresh?: boolean };
type CardRequest = { method: "get" | "post" | "put"; payload?: unknown; forceRefresh?: boolean }
  | { method: "delete"; payload: { uid: string }; forceRefresh?: false };

/* ------------------ BREAK ------------------ */

const pendingRequests = new Set<Promise<RemoteCard | null>>();
let requestsPaused = false;

// Reads SQLite first and contacts the API only on a cache miss or explicit refresh.
export async function getDigitalCard({ forceRefresh = false }: CardReadOptions = {}): Promise<RemoteCard | null> {
  try {
    return await requestDigitalCard({ method: "get", forceRefresh });
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
  await Promise.allSettled([...pendingRequests]);
};//export ends

// Allows card reads and saves after account cleanup finishes.
export function resumeDigitalCardRequests(): void {
  requestsPaused = false;
};//export ends

// Creates or updates the account's card with the uploaded profile picture's URL.
export async function saveDigitalCard(card: AppDigitalCardQr, exists: boolean): Promise<RemoteCard> {
  const { profilePicture, socialLinks, ...details } = card.details;
  const { dot, eye, frame, styles } = card.settings;
  const payload: CardPayload = {
    ...details, phones: details.phones.filter((phone) => phone.value.trim()),
    emails: details.emails.filter((email) => email.value.trim()), uid: card.uid, url: `https://unoqr.com/dc/${card.uid}`,
    name: card.cardSettings.name, status: card.cardSettings.status, photo_url: profilePicture?.url || null, social_links: socialLinks,
    layout: card.layout, primary_color: card.primaryColor,
    qr_design: { dot, eye, frame, styles },
    seo: { title: card.cardSettings.seoTitle, description: card.cardSettings.seoDescription, allow_indexing: card.cardSettings.allowIndexing },
    allow_save_contact: card.cardSettings.allowSaveContact,
    is_contact_required: card.cardSettings.isContactRequired
  };
  try {
    const saved = await requestDigitalCard({ method: exists ? "put" : "post", payload });
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
    const saved = await requestDigitalCard({ method: "put", payload: { uid, qr_design: { dot, eye, frame, styles } } });
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
  const { profilePicture, socialLinks, ...values } = details;
  const payload = {
    ...values, uid, photo_url: profilePicture?.url || null, social_links: socialLinks,
    phones: values.phones.filter((phone) => phone.value.trim()),
    emails: values.emails.filter((email) => email.value.trim())
  };
  try {
    const saved = await requestDigitalCard({ method: "put", payload });
    if (!saved) throw new Error("Your digital card details could not be saved.");
    return saved;
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Updates only layout choices, preserving publication status, details and QR design.
export async function saveDigitalCardLayout(uid: string, layout: AppDigitalCardQr["layout"], primaryColor: string): Promise<RemoteCard> {
  try {
    const saved = await requestDigitalCard({ method: "put", payload: { uid, layout, primary_color: primaryColor } });
    if (!saved) throw new Error("Your card layout could not be saved.");
    return saved;
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Updates publication and sharing settings without overwriting the other editor sections.
export async function saveDigitalCardSettings(uid: string, settings: DigitalCardSettingsValues): Promise<RemoteCard> {
  try {
    const saved = await requestDigitalCard({ method: "put", payload: {
      uid, name: settings.name, status: settings.status,
      seo: { title: settings.seoTitle, description: settings.seoDescription, allow_indexing: settings.allowIndexing },
      allow_save_contact: settings.allowSaveContact,
      is_contact_required: settings.isContactRequired
    } });
    if (!saved) throw new Error("Your card settings could not be saved.");
    return saved;
  } catch (error: unknown) {
    throw cardApiError(error);
  };//try-catch ends
};//export ends

// Maps server fields and the linked profile picture into the existing RHF values.
export function restoreDigitalCard(remote: RemoteCard, local: AppDigitalCardQr): AppDigitalCardQr {
  return {
    ...local, id: remote.id, uid: remote.uid, userId: remote.user_id,
    details: {
      profilePicture: remote.photo,
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
async function performDigitalCardRequest({ method, payload, forceRefresh = false }: CardRequest): Promise<RemoteCard | null> {
  const user = await getStorageUser();
  if (!user) throw new Error("Sign in to load your digital card.");
  if (method === "get" && !forceRefresh) {
    const cached = await getCachedDigitalCard(user.id);
    if (cached) return cached;
  };//if ends
  const response = await Axios.request<CardResponse>({
    url: apiSettings.getApiUrl({ path: "/app/digital_cards" }).href, method, data: payload, timeout: 15000
  });
  if (method === "delete") {
    await deleteCachedDigitalCard(user.id, payload.uid);
    return null;
  };//if ends
  const remote = response.data.data;
  if (!remote) {
    if (method === "get") await deleteCachedDigitalCard(user.id);
    return null;
  };//if ends
  if (remote.user_id !== user.id) throw new Error("Your digital card belongs to a different account.");
  return cacheDigitalCard(remote);
};//func ends

// Presents the API's validation and authentication message in the form's existing error area.
function cardApiError(error: unknown): Error {
  if (axios.isAxiosError<{ message?: string }>(error)) return new Error(error.response?.data?.message || error.message);
  return error instanceof Error ? error : new Error("Your digital card request failed. Try again.");
};//func ends
