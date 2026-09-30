import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

import { QR_API_TIMEOUT, type QrApiResponse, type QrDeleteConfirmation } from "./types";

/* ------------------ BREAK ------------------ */

// Deletes a remote QR by its ID using the authenticated user's API session.
export async function deleteQrFromApi({ id }: { id: string }): Promise<QrDeleteConfirmation | null> {
  const url = apiSettings.getApiUrl({ path: "/app/static_qrcodes" });
  const response = await Axios.delete<QrApiResponse<QrDeleteConfirmation>>(url.href, { data: { id }, timeout: QR_API_TIMEOUT });
  return response.data.data ?? null;
};//export ends
