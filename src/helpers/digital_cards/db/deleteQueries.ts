import { and, eq } from "drizzle-orm";

import { db } from "@/utils/sqlite/db";

import { digitalCardPhotosTable, digitalCardsTable, initDigitalCardsTable } from "./init";

/* ------------------ BREAK ------------------ */

// Removes confirmed-deleted card data and photo metadata, optionally restricted to one card UID.
export async function deleteCachedDigitalCard(userId: string, uid?: string): Promise<void> {
  if (!db) return;
  await initDigitalCardsTable();
  db.transaction((transaction) => {
    const deleted = transaction.delete(digitalCardsTable).where(uid
      ? and(eq(digitalCardsTable.user_id, userId), eq(digitalCardsTable.uid, uid))
      : eq(digitalCardsTable.user_id, userId)).run();
    if (!uid || deleted.changes > 0) {
      transaction.delete(digitalCardPhotosTable).where(eq(digitalCardPhotosTable.user_id, userId)).run();
    };//if ends
  });
};//export ends
