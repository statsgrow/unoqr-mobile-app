import axios from "axios";
import { eq } from "drizzle-orm";

import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";
import { Toast } from "@/utils/general/Toast";
import { db } from "@/utils/sqlite/db";

import { getScanById } from "./getQueries";
import { initScansTable, type InsertScanInput, scansTable } from "./init";
import { insertScanToAPI, waitForInitialScanSync } from "./insertQueries";

/* ------------------ BREAK ------------------ */

export type UpdateScanInput = Partial<InsertScanInput>;

type ScanApiResponse = {
  data?: InsertScanInput | null;
};

/* ------------------ BREAK ------------------ */

// Updates an existing scan row by its ID without automatically starting an API request.
export async function updateScan(id: string, data: UpdateScanInput) {
  if (!db) return null;

  try {
    await initScansTable();
    return await db.update(scansTable).set(data).where(eq(scansTable.id, id)).run();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to update this scan.";
    Toast.error({ message });
    console.error("Error updating scan:", error);
    return null;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

// Sends collected metadata to the API and records whether the local row fully synchronized.
export async function syncCompletedScanToAPI(id: string): Promise<boolean> {
  await waitForInitialScanSync(id);

  const storedScan = await getScanById(id);

  if (!storedScan?.install_id) {
    await updateScan(id, { sync_status: "incomplete" });
    return false;
  };//if ends

  const completedScan: InsertScanInput = {
    ...storedScan,
    sync_status: "synced",
    updated_at: new Date().toISOString()
  };

  try {
    const apiUrl = apiSettings.getApiUrl({ path: `/app/scans/${id}` });
    await Axios.put<ScanApiResponse>(apiUrl.href, completedScan);
    await updateScan(id, {
      sync_status: "synced",
      updated_at: completedScan.updated_at
    });
    return true;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const insertedScan = await insertScanToAPI(completedScan);

      if (insertedScan) {
        await updateScan(id, {
          sync_status: "synced",
          user_ip: insertedScan.user_ip ?? null,
          updated_at: completedScan.updated_at
        });
        return true;
      };//if ends
    };//if ends

    console.error("Error synchronizing completed scan to API:", error);
    await updateScan(id, { sync_status: "incomplete" });
    return false;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */
