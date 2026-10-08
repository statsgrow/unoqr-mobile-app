import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

import { deleteScan } from "./db/deleteQueries";
import { pauseScanSync, resumeScanSync } from "./scanSync";

/* ------------------ BREAK ------------------ */

type DeleteScanResponse = { data?: { id: string; deleted: boolean } | null };

/* ------------------ BREAK ------------------ */

// Confirms cloud deletion before deleting SQLite after all active scan requests finish.
export async function deleteSavedScan({ id }: { id: string }): Promise<void> {
  await pauseScanSync();
  try {
    const url = apiSettings.getApiUrl({ path: `/app/scans/${id}` });
    const response = await Axios.delete<DeleteScanResponse>(url.href, { timeout: 15_000 });
    if (response.data.data?.id !== id || response.data.data.deleted !== true) throw new Error("Scan deletion was not confirmed by the API.");
    const result = await deleteScan(id);
    if (!result) throw new Error("The scan was deleted from the cloud, but local cleanup failed. Please try again.");
  } finally {
    resumeScanSync();
  };//try-catch ends
};//export ends
