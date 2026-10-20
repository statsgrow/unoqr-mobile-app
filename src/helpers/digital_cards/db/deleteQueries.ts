import { and, eq } from "drizzle-orm";

import { db } from "@/utils/sqlite/db";

import { digitalCardPhotosTable, digitalCardsTable, initDigitalCardsTable } from "./init";

/* ------------------ BREAK ------------------ */

// Removes confirmed-deleted card data and photo metadata, optionally restricted to one card UID.
export async function deleteCachedDigitalCard(userId: string, uid?: string, version?: number): Promise<void> {
  if (!db) return;
  await initDigitalCardsTable();
  db.transaction((transaction) => {
    const deleted = transaction.delete(digitalCardsTable).where(and(
      eq(digitalCardsTable.user_id, userId),
      uid ? eq(digitalCardsTable.uid, uid) : undefined,
      version !== undefined ? eq(digitalCardsTable.version, version) : undefined
    )).run();
    if (version !== undefined && deleted.changes === 0) return;
    transaction.delete(digitalCardPhotosTable).where(uid
      ? and(eq(digitalCardPhotosTable.user_id, userId), eq(digitalCardPhotosTable.card_uid, uid))
      : eq(digitalCardPhotosTable.user_id, userId)).run();
  });
};//export ends
