import { and, eq, isNull, or } from "drizzle-orm";
import { File } from "expo-file-system";

import { deleteQrFromApi } from "@/helpers/qrcodes/api/deleteQr";
import { getQrPageFromApi } from "@/helpers/qrcodes/api/getQr";
import { putQrToApi } from "@/helpers/qrcodes/api/putQr";
import type { QrApiData } from "@/helpers/qrcodes/api/types";
import { getQrById } from "@/helpers/qrcodes/db/getQr";
import { initQrCodes, qrCodeDeletionsTable, qrCodesTable, type QrCode } from "@/helpers/qrcodes/db/initQrCodes";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { publishQrSaveStatus } from "@/helpers/qrcodes/db/QrSaveStatus";
import { db, sqliteDB } from "@/utils/sqlite/db";
import { colors } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type RestoreQrOptions = {
  force?: boolean;
  signal: AbortSignal;
  onPage: () => Promise<void>;
  onProgress: (received: number, total: number) => void;
};

/* ------------------ BREAK ------------------ */

const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
const syncQueues = new Map<string, Promise<void>>();
const restorePromises = new Set<Promise<boolean>>();
const historySyncs = new Map<string, { syncedAt: number; total: number }>();
export const QR_HISTORY_SYNC_WINDOW_MS = 5 * 60 * 1_000;
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
  historySyncs.clear();
  cancelScheduledQrCodeSync();
  await Promise.allSettled([...syncQueues.values(), ...restorePromises, ...(pendingCheckPromise ? [pendingCheckPromise] : [])]);
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

// Tracks GET-only QR restoration so account resets wait before clearing its rows.
export function restoreUserQrCodes(options: RestoreQrOptions): Promise<boolean> {
  const operation = restoreQrHistory(options);
  restorePromises.add(operation);
  void operation.finally(() => restorePromises.delete(operation)).catch(() => undefined);
  return operation;
};//export ends

/* ------------------ BREAK ------------------ */

// Restores account QR pages by their original IDs while retaining pending local work.
async function restoreQrHistory({ force = false, signal, onPage, onProgress }: RestoreQrOptions): Promise<boolean> {
  const user = await getStorageUser();
  if (!user || !db || !sqliteDB || isSyncPaused || signal.aborted) return false;
  const previousSync = historySyncs.get(user.id);
  if (!force && previousSync && Date.now() - previousSync.syncedAt < QR_HISTORY_SYNC_WINDOW_MS) {
    onProgress(previousSync.total, previousSync.total);
    return true;
  };//if ends
  await initQrCodes();
  let from = 0;
  let total = 0;

  do {
    if (isSyncPaused || signal.aborted) return false;
    const response = await getQrPageFromApi(from, signal);
    const rows = response.data;
    if (from === 0) total = response.count;
    if (!Array.isArray(rows) || !Number.isSafeInteger(total) || total < from + rows.length) {
      throw new Error("The QR API returned an invalid history page or total count.");
    };//if ends
    if (isSyncPaused || signal.aborted) return false;
    if (rows.length === 0 && from < total) throw new Error("QR history changed while loading. Please retry.");

    sqliteDB.withTransactionSync(() => {
      for (const row of rows) {
        const local = db!.select().from(qrCodesTable).where(eq(qrCodesTable.id, row.id)).get();
        const deletion = db!.select().from(qrCodeDeletionsTable).where(eq(qrCodeDeletionsTable.id, row.id)).get();
        if (deletion || local?.sync_status === "pending") continue;
        const logoExists = isLocalLogoAvailable(row.logo_device_path);
        const values: QrCode = {
          id: row.id, created_at: row.created_at, updated_at: row.updated_at, user_id: user.id,
          sync_status: "completed", name: row.name, hide_logo: row.hide_logo,
          content: row.content, content_type: row.content_type as QrCode["content_type"],
          content_data: row.content_data, size: row.size ?? Array.from(row.content).length, type: "static",
          dot: row.dot ?? { type: "square", color: "" }, eye: row.eye ?? { type: "square", color: "" },
          frame: row.frame ?? { type: "squircle", color: colors.secondary.main },
          styles: row.styles ?? { bg_color: colors.white.main, fg_color: colors.primary.main },
          logo: logoExists && row.logo_device_path
            ? local?.logo?.uri === row.logo_device_path ? local.logo : { uri: row.logo_device_path, name: "QR logo" }
            : null,
          last_download_type: row.last_download_type ?? null, last_download_at: row.last_download_at ?? null
        };
        const { id, ...updates } = values;
        db!.insert(qrCodesTable).values(values).onConflictDoUpdate({ target: qrCodesTable.id, set: updates }).run();
      };//for ends
    });
    from += rows.length;
    onProgress(from, total);
    await onPage();
  } while (from < total);
  if (isSyncPaused || signal.aborted) return false;
  historySyncs.set(user.id, { syncedAt: Date.now(), total });
  return true;
};//func ends

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

// Checks optional device logo URIs without allowing stale cloud paths to interrupt QR restoration.
function isLocalLogoAvailable(uri: string | null): boolean {
  if (!uri || !/^(file:\/\/\/|content:\/\/)/.test(uri)) return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

// Maps the SQLite snapshot to the API contract without uploading image data or local synchronization fields.
function getQrApiData(row: QrCode): QrApiData {
  const { user_id, updated_at, sync_status, logo, type, content_type, ...fields } = row;
  return { ...fields, content_type: content_type ?? "text", logo_device_path: logo?.uri ?? null };
};//func ends
