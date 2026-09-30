import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

import { QR_API_TIMEOUT, type QrApiData, type QrApiResponse, type QrSyncConfirmation } from "./types";

/* ------------------ BREAK ------------------ */

// Saves a complete QR snapshot and returns the API's synchronization confirmation.
export async function putQrToApi(data: QrApiData): Promise<QrSyncConfirmation | null> {
  const url = apiSettings.getApiUrl({ path: "/app/static_qrcodes" });
  const response = await Axios.put<QrApiResponse<QrSyncConfirmation>>(url.href, data, { timeout: QR_API_TIMEOUT });
  return response.data.data ?? null;
};//export ends
