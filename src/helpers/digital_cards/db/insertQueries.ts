import { sql } from "drizzle-orm";

import { db } from "@/utils/sqlite/db";

import type { RemoteCard } from "../api/cards";
import { getCachedDigitalCard } from "./getQueries";
import { digitalCardPhotosTable, digitalCardsTable, initDigitalCardsTable } from "./init";

/* ------------------ BREAK ------------------ */

// Saves the complete API response atomically before returning the locally stored card.
export async function cacheDigitalCard(card: RemoteCard): Promise<RemoteCard> {
  if (!db) return card;
  await initDigitalCardsTable();
  const { photo, feature_photo = null, ...values } = card;
  db.transaction((transaction) => {
    transaction.insert(digitalCardsTable).values(values)
      .onConflictDoUpdate({ target: digitalCardsTable.uid, set: values, setWhere: sql`${digitalCardsTable.version} <= ${card.version}` }).run();
    transaction.insert(digitalCardPhotosTable).values({ card_uid: card.uid, user_id: card.user_id, photo, feature_photo })
      .onConflictDoUpdate({ target: digitalCardPhotosTable.card_uid, set: { photo, feature_photo },
        setWhere: sql`(SELECT version FROM digital_cards WHERE uid = ${card.uid}) = ${card.version}` }).run();
  });
  const cached = await getCachedDigitalCard(card.user_id, card.uid);
  if (!cached) throw new Error("Your digital card could not be stored on this device.");
  return cached;
};//export ends
