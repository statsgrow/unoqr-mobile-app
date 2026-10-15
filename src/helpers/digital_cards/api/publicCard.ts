import { apiSettings } from "@/settings";
import { Axios, isAxiosError } from "@/utils/general/Axios";

import type { RemoteCard } from "./cards";

/* ------------------ BREAK ------------------ */

export type PublicDigitalCard = Pick<RemoteCard,
  "uid" | "url" | "name" | "fullname" | "company" | "position" | "phones" | "emails" |
  "social_links" | "bio" | "address" | "layout" | "primary_color" | "photo_url" | "allow_save_contact" | "seo"
>;//export ends

/* ------------------ BREAK ------------------ */

// Reads a published card through the shared client without using the owner's SQLite cache.
export async function getPublicDigitalCard(uid: string, signal: AbortSignal): Promise<PublicDigitalCard> {
  const url = apiSettings.getApiUrl({ path: `/p/digital_cards/${encodeURIComponent(uid)}` });
  try {
    const response = await Axios.get<{ data: PublicDigitalCard | null }>(url.href, { signal, timeout: 15000 });
    if (!response.data.data) throw new Error("This digital card is no longer available.");
    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError<{ name?: string }>(error) && error.response?.status === 404) {
      throw new Error(error.response.data.name === "DigitalCardUnpublished"
        ? "This digital card is currently unpublished."
        : "This digital card is no longer available.");
    };//if ends
    throw error;
  };//try-catch ends
};//export ends
