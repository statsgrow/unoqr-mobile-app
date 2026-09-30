import { eq } from "drizzle-orm";
import type { SQLiteRunResult } from "expo-sqlite";

import { db } from "@/utils/sqlite/db";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { scheduleQrCodeSync } from "@/helpers/qrcodes/QrSync";

import { initQrCodes, qrCodeDeletionsTable, qrCodesTable } from "./initQrCodes";
import { publishQrSaveStatus } from "./QrSaveStatus";

/* ------------------ BREAK ------------------ */

// Deletes one saved QR from the local database by its ID.
export async function deleteQr(id: string): Promise<SQLiteRunResult | null> {
  if (!db) return null;

  await initQrCodes();
  const row = await db.select().from(qrCodesTable).where(eq(qrCodesTable.id, id)).get();
  const ownerId = row?.user_id ?? (await getStorageUser())?.id;
  // Keep a durable deletion request in the same transaction that removes the local QR.
  const result = db.transaction((transaction) => {
    if (row && ownerId) {
      transaction.insert(qrCodeDeletionsTable).values({ id, user_id: ownerId }).onConflictDoNothing().run();
    };//if ends
    return transaction.delete(qrCodesTable).where(eq(qrCodesTable.id, id)).run();
  });
  if (result.changes === 1) {
    publishQrSaveStatus(id, null);
    if (ownerId) scheduleQrCodeSync(id);
  };//if ends
  return result;
};//export ends
