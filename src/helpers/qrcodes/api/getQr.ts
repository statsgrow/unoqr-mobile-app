import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

import { QR_API_TIMEOUT, type QrApiResponse, type QrRemoteRecord } from "./types";

/* ------------------ BREAK ------------------ */

// Reads one remote QR or the authenticated user's collection without restoring it locally.
export async function getQrFromApi({ id }: { id?: string } = {}): Promise<QrRemoteRecord | QrRemoteRecord[] | null> {
  const url = apiSettings.getApiUrl({ path: "/app/static_qrcodes" });
  if (id) url.searchParams.set("id", id);
  const response = await Axios.get<QrApiResponse<QrRemoteRecord | QrRemoteRecord[]>>(url.href, { timeout: QR_API_TIMEOUT });
  return response.data.data ?? null;
};//export ends
