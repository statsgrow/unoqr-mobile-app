import { and, asc, eq } from "drizzle-orm";

import { db } from "@/utils/sqlite/db";

import type { RemoteCard } from "../api/cards";
import { digitalCardPhotosTable, digitalCardsTable, initDigitalCardsTable } from "./init";

/* ------------------ BREAK ------------------ */

// Reads one owned card by UID, preserving the oldest card as the existing default destination.
export async function getCachedDigitalCard(userId: string, uid?: string): Promise<RemoteCard | null> {
  const cards = await getCachedDigitalCards(userId, uid);
  return cards[0] ?? null;
};//export ends

// Reads owned SQLite cards with their linked photos, optionally selecting one public UID.
export async function getCachedDigitalCards(userId: string, uid?: string): Promise<RemoteCard[]> {
  if (!db) return [];
  await initDigitalCardsTable();
  const rows = await db.select({ card: digitalCardsTable, photo: digitalCardPhotosTable.photo, feature_photo: digitalCardPhotosTable.feature_photo })
    .from(digitalCardsTable)
    .leftJoin(digitalCardPhotosTable, and(
      eq(digitalCardPhotosTable.card_uid, digitalCardsTable.uid),
      eq(digitalCardPhotosTable.user_id, digitalCardsTable.user_id)
    ))
    .where(and(eq(digitalCardsTable.user_id, userId), uid ? eq(digitalCardsTable.uid, uid) : undefined))
    .orderBy(asc(digitalCardsTable.created_at), asc(digitalCardsTable.uid));
  return rows.map((row) => ({ ...row.card, photo: row.photo, feature_photo: row.feature_photo }));
};//export ends
