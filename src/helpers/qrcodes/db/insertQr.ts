import type { SQLiteRunResult } from "expo-sqlite";

import { db } from "@/utils/sqlite/db";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { scheduleQrCodeSync } from "@/helpers/qrcodes/QrSync";

import { initQrCodes, qrCodesTable, type InsertQrInput } from "./initQrCodes";
import { getQrUpdatedAt } from "./QrTimestamp";
import { publishQrSaveStatus } from "./QrSaveStatus";

/* ------------------ BREAK ------------------ */

// Inserts one QR form object into the local database after initializing its table.
export async function insertQr(data: InsertQrInput): Promise<SQLiteRunResult | null> {
  if (!db) return null;

  await initQrCodes();
  const user = await getStorageUser();
  // Bind the backup to its local owner and persist the pending state with the initial row.
  const result = await db.insert(qrCodesTable).values({
    ...data, user_id: user?.id ?? null, updated_at: getQrUpdatedAt(), sync_status: "pending"
  }).run();
  publishQrSaveStatus(data.id, "pending");
  scheduleQrCodeSync(data.id);
  return result;
};//export ends
