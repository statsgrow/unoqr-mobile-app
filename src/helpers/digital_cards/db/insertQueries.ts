import { db } from "@/utils/sqlite/db";

import type { RemoteCard } from "../api/cards";
import { getCachedDigitalCard } from "./getQueries";
import { digitalCardPhotosTable, digitalCardsTable, initDigitalCardsTable } from "./init";

/* ------------------ BREAK ------------------ */

// Saves the complete API response atomically before returning the locally stored card.
export async function cacheDigitalCard(card: RemoteCard): Promise<RemoteCard> {
  if (!db) return card;
  await initDigitalCardsTable();
  const { photo, ...values } = card;
  db.transaction((transaction) => {
    transaction.insert(digitalCardsTable).values(values)
      .onConflictDoUpdate({ target: digitalCardsTable.user_id, set: values }).run();
    transaction.insert(digitalCardPhotosTable).values({ user_id: card.user_id, photo })
      .onConflictDoUpdate({ target: digitalCardPhotosTable.user_id, set: { photo } }).run();
  });
  const cached = await getCachedDigitalCard(card.user_id);
  if (!cached) throw new Error("Your digital card could not be stored on this device.");
  return cached;
};//export ends
