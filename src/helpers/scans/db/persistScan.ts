import { getUUIDv4 } from "@/utils/general/Uid";

import type { ScanType } from "../scanIdentifier";
import { insertScan } from "./insertQueries";
import type { InsertScanInput } from "./init";

/* ------------------ BREAK ------------------ */

export type StoredScanReference = {
  id: string;
  type: ScanType;
  value: string;
};

/* ------------------ BREAK ------------------ */

// Creates the shared SQLite row before any type-specific scan processing begins.
export async function persistScan(value: string, scanType: ScanType): Promise<StoredScanReference | null> {
  const now = new Date().toISOString();
  const isWebsiteScan = scanType === "url";
  const scanData: InsertScanInput = {
    id: getUUIDv4(),
    created_at: now,
    updated_at: now,
    value,
    input_url: isWebsiteScan ? value : null,
    final_url: null,
    type: scanType,
    status: isWebsiteScan ? "pending" : "completed",
    user_ip: null,
    location: null,
    user_id: null,
    website_id: null,
    sync_status: "pending",
    metadata: null
  };

  const insertResult = await insertScan(scanData);
  return insertResult ? { id: scanData.id, type: scanType, value: scanData.value } : null;
};//export ends
