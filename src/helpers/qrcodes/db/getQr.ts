import { eq } from "drizzle-orm";

import { db } from "@/utils/sqlite/db";

import { initQrCodes, qrCodesTable, type QrCode } from "./initQrCodes";

/* ------------------ BREAK ------------------ */

// Fetches all saved static QR codes from the local database.
export async function getAllQrCodes(): Promise<QrCode[]> {
  if (!db) return [];

  await initQrCodes();
  return await db.select().from(qrCodesTable);
};//export ends

/* ------------------ BREAK ------------------ */

// Fetches one saved static QR code by its ID, returning null when it is not found.
export async function getQrById(id: string): Promise<QrCode | null> {
  if (!db) return null;

  await initQrCodes();
  const result = await db.select().from(qrCodesTable).where(eq(qrCodesTable.id, id)).limit(1);
  return result[0] ?? null;
};//export ends
