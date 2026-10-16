import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

export type DigitalCardContact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  created_at: string;
};//export ends

export type DigitalCardContactsResponse = { data: DigitalCardContact[]; count: number };//export ends
export type DigitalCardContactDetails = DigitalCardContact & { tags: string[]; notes: string };//export ends
export type DigitalCardContactAnnotations = { tags: string[]; notes: string };//export ends
export type DigitalCardContactSubmission = Pick<DigitalCardContact, "first_name" | "last_name" | "email" | "mobile">;//export ends

/* ------------------ BREAK ------------------ */

// Reads one page of submitted contacts through the shared owner-authenticated API client.
export async function getDigitalCardContacts({ uid, from, signal }: { uid: string; from: number; signal: AbortSignal }): Promise<DigitalCardContactsResponse> {
  const response = await Axios.get<DigitalCardContactsResponse>(
    apiSettings.getApiUrl({ path: "/app/digital_cards/contacts" }).href,
    { params: { uid, from }, signal, timeout: 15000 }
  );
  return response.data;
};//export ends

/* ------------------ BREAK ------------------ */

// Submits visitor-provided details through the published card's public collection endpoint.
export async function submitDigitalCardContact({ uid, contact, signal }: { uid: string; contact: DigitalCardContactSubmission; signal: AbortSignal }): Promise<{ id: string; created_at: string }> {
  const response = await Axios.post<{ data: { id: string; created_at: string } }>(
    apiSettings.getApiUrl({ path: "/app/digital_cards/contacts" }).href,
    { uid, ...contact }, { signal, timeout: 15000 }
  );
  return response.data.data;
};//export ends

/* ------------------ BREAK ------------------ */

// Fetches a single submitted contact after the API verifies its card and account ownership.
export async function getDigitalCardContact({ uid, contactId, signal }: { uid: string; contactId: string; signal: AbortSignal }): Promise<DigitalCardContactDetails> {
  const response = await Axios.get<{ data: DigitalCardContactDetails }>(
    apiSettings.getApiUrl({ path: `/app/digital_cards/contacts/${encodeURIComponent(contactId)}` }).href,
    { params: { uid }, signal, timeout: 15000 }
  );
  return response.data.data;
};//export ends

/* ------------------ BREAK ------------------ */

// Saves only the owner's tags and notes while preserving the visitor's submitted details.
export async function updateDigitalCardContact({ uid, contactId, annotations, signal }: { uid: string; contactId: string; annotations: DigitalCardContactAnnotations; signal: AbortSignal }): Promise<DigitalCardContactDetails> {
  const response = await Axios.patch<{ data: DigitalCardContactDetails }>(
    apiSettings.getApiUrl({ path: `/app/digital_cards/contacts/${encodeURIComponent(contactId)}` }).href,
    annotations, { params: { uid }, signal, timeout: 15000 }
  );
  return response.data.data;
};//export ends
