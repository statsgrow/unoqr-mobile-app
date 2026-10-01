import { and, eq, isNull, or } from "drizzle-orm";

import { deleteQrFromApi } from "@/helpers/qrcodes/api/deleteQr";
import { putQrToApi } from "@/helpers/qrcodes/api/putQr";
import type { QrApiData } from "@/helpers/qrcodes/api/types";
import { getQrById } from "@/helpers/qrcodes/db/getQr";
import { initQrCodes, qrCodeDeletionsTable, qrCodesTable, type QrCode } from "@/helpers/qrcodes/db/initQrCodes";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { publishQrSaveStatus } from "@/helpers/qrcodes/db/QrSaveStatus";
import { db } from "@/utils/sqlite/db";

/* ------------------ BREAK ------------------ */

const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
const syncQueues = new Map<string, Promise<void>>();
let isSyncPaused = false;
let pendingCheckPromise: Promise<void> | null = null;

/* ------------------ BREAK ------------------ */

// Restarts a QR's API synchronization delay after each successful local write.
export function scheduleQrCodeSync(id: string): void {
  if (isSyncPaused) return;
  clearTimeout(syncTimers.get(id));
  syncTimers.set(id, setTimeout(() => {
    syncTimers.delete(id);
    void syncQrCode(id).catch((error: unknown) => console.error("Unable to synchronize QR:", error));
  }, 2_000));
};//export ends

// Cancels delayed QR writes when the current account's local data is cleared.
export function cancelScheduledQrCodeSync(): void {
  syncTimers.forEach((timer) => clearTimeout(timer));
  syncTimers.clear();
};//export ends

// Waits for existing QR requests before another account can supply authentication.
export async function pauseQrCodeSync(): Promise<void> {
  isSyncPaused = true;
  cancelScheduledQrCodeSync();
  await Promise.allSettled([...syncQueues.values(), ...(pendingCheckPromise ? [pendingCheckPromise] : [])]);
};//export ends

// Enables QR synchronization after the account reset finishes.
export function resumeQrCodeSync(): void {
  isSyncPaused = false;
};//export ends

// Flushes a QR immediately and serializes its requests to prevent stale remote writes.
export function syncQrCode(id: string): Promise<void> {
  if (isSyncPaused) return Promise.resolve();
  clearTimeout(syncTimers.get(id));
  syncTimers.delete(id);
  const operation = (syncQueues.get(id) ?? Promise.resolve()).catch(() => undefined).then(() => synchronizeQrCode(id));
  syncQueues.set(id, operation);
  void operation.finally(() => {
    if (syncQueues.get(id) === operation) syncQueues.delete(id);
  }).catch(() => undefined);
  return operation;
};//export ends

// Retries this user's persisted pending QR writes and deletions without a recurring timer.
export function checkPendingQrCodes(): Promise<void> {
  if (isSyncPaused) return Promise.resolve();
  pendingCheckPromise ??= synchronizePendingQrCodes().finally(() => { pendingCheckPromise = null; });
  return pendingCheckPromise;
};//export ends

/* ------------------ BREAK ------------------ */

// Finds pending work for the active account and attempts every row even when one request fails.
async function synchronizePendingQrCodes(): Promise<void> {
  if (!db) return;
  const user = await getStorageUser();
  if (!user) return;
  await initQrCodes();
  const rows = await db.select({ id: qrCodesTable.id }).from(qrCodesTable).where(and(
    eq(qrCodesTable.sync_status, "pending"), or(eq(qrCodesTable.user_id, user.id), isNull(qrCodesTable.user_id))
  ));
  const deletions = await db.select({ id: qrCodeDeletionsTable.id }).from(qrCodeDeletionsTable).where(eq(qrCodeDeletionsTable.user_id, user.id));
  for (const { id } of [...rows, ...deletions]) {
    await syncQrCode(id).catch((error: unknown) => console.error("Unable to retry QR synchronization:", error));
  };//for ends
};//func ends

// Sends the latest stored version and keeps newer edits pending until their own confirmation arrives.
async function synchronizeQrCode(id: string): Promise<void> {
  if (!db) throw new Error("QR storage is unavailable on this device.");
  await initQrCodes();

  while (true) {
    const user = await getStorageUser();
    if (!user) throw new Error("Sign in to save this QR code before downloading.");

    // Process durable deletions after any earlier PUT finishes for the same QR.
    const deletion = await db.select().from(qrCodeDeletionsTable).where(eq(qrCodeDeletionsTable.id, id)).get();
    if (deletion) {
      if (deletion.user_id !== user.id) throw new Error("This QR belongs to another account.");
      const confirmed = await deleteQrFromApi({ id });
      if (confirmed?.id !== id || confirmed.deleted !== true) throw new Error("QR deletion was not confirmed.");
      await db.delete(qrCodeDeletionsTable).where(and(eq(qrCodeDeletionsTable.id, id), eq(qrCodeDeletionsTable.user_id, user.id))).run();
      return;
    };//if ends

    const row = await getQrById(id);
    if (!row) return;
    if (row.user_id && row.user_id !== user.id) throw new Error("This QR belongs to another account.");
    if (row.sync_status === "completed") return;

    // Assign legacy local rows to the signed-in account before backing them up.
    if (!row.user_id) {
      await db.update(qrCodesTable).set({ user_id: user.id }).where(and(eq(qrCodesTable.id, id), isNull(qrCodesTable.user_id))).run();
    };//if ends

    const confirmed = await putQrToApi(getQrApiData(row));
    if (confirmed?.id !== id || confirmed.sync_status !== "completed") throw new Error("QR saving was not confirmed. Please try again.");

    // Acknowledge only the exact local version sent; edits made during the request stay pending.
    const result = await db.update(qrCodesTable).set({ sync_status: "completed" }).where(and(
      eq(qrCodesTable.id, id), eq(qrCodesTable.user_id, user.id),
      row.updated_at ? eq(qrCodesTable.updated_at, row.updated_at) : isNull(qrCodesTable.updated_at)
    )).run();
    if (result.changes === 1) {
      publishQrSaveStatus(id, "completed");
      return;
    };//if ends
  };//while ends
};//func ends

// Maps the SQLite snapshot to the API contract without uploading image data or local synchronization fields.
function getQrApiData(row: QrCode): QrApiData {
  const { user_id, updated_at, sync_status, logo, type, content_type, ...fields } = row;
  return { ...fields, content_type: content_type ?? "text", logo_device_path: logo?.uri ?? null };
};//func ends
