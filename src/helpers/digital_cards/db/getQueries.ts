import { eq } from "drizzle-orm";

import { db } from "@/utils/sqlite/db";

import type { RemoteCard } from "../api/cards";
import { digitalCardPhotosTable, digitalCardsTable, initDigitalCardsTable } from "./init";

/* ------------------ BREAK ------------------ */

// Reads only the signed-in account's saved card and its linked photo metadata.
export async function getCachedDigitalCard(userId: string): Promise<RemoteCard | null> {
  if (!db) return null;
  await initDigitalCardsTable();
  const [row] = await db.select({ card: digitalCardsTable, photo: digitalCardPhotosTable.photo })
    .from(digitalCardsTable)
    .leftJoin(digitalCardPhotosTable, eq(digitalCardPhotosTable.user_id, digitalCardsTable.user_id))
    .where(eq(digitalCardsTable.user_id, userId)).limit(1);
  return row ? { ...row.card, photo: row.photo } : null;
};//export ends
