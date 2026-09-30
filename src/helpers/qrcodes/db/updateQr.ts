import { eq } from "drizzle-orm";
import type { SQLiteRunResult } from "expo-sqlite";

import { db } from "@/utils/sqlite/db";
import { scheduleQrCodeSync } from "@/helpers/qrcodes/QrSync";

import { initQrCodes, qrCodesTable, type InsertQrInput } from "./initQrCodes";
import { getQrUpdatedAt } from "./QrTimestamp";
import { publishQrSaveStatus } from "./QrSaveStatus";

/* ------------------ BREAK ------------------ */

export type UpdateQrInput = Pick<InsertQrInput, "id"> & Partial<Omit<InsertQrInput, "id" | "created_at" | "user_id" | "sync_status" | "updated_at">>;

/* ------------------ BREAK ------------------ */

// Updates the supplied QR form fields for one local row identified by its ID.
export async function updateQrcode({ id, ...data }: UpdateQrInput): Promise<SQLiteRunResult | null> {
  if (!db) return null;

  await initQrCodes();
  const previous = await db.select({ updated_at: qrCodesTable.updated_at }).from(qrCodesTable).where(eq(qrCodesTable.id, id)).get();
  // Commit each local edit and its pending synchronization marker together.
  const result = await db.update(qrCodesTable).set({
    ...data, updated_at: getQrUpdatedAt(previous?.updated_at), sync_status: "pending"
  }).where(eq(qrCodesTable.id, id)).run();
  if (result.changes === 1) {
    publishQrSaveStatus(id, "pending");
    scheduleQrCodeSync(id);
  };//if ends
  return result;
};//export ends
