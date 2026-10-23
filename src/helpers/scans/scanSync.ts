import { and, eq } from "drizzle-orm";

import { apiSettings, installSettings, scansSettings } from "@/settings";
import { getInstallLinkHeaders, insertAppInstall } from "@/utils/auth/AppInstall";
import { Axios, isInstallVerificationPending } from "@/utils/general/Axios";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { getData, setData } from "@/utils/general/Storage";
import { db, sqliteDB } from "@/utils/sqlite/db";

import { getScanById } from "./db/getQueries";
import { getUnoQrDigitalCardUid } from "./identifiers/DigitalCard";
import { appendScanError, waitForInitialScanSync, waitForInitialScanSyncs } from "./db/insertQueries";
import {
  initScansTable,
  type InsertScanInput,
  scansTable
} from "./db/init";
import { updateScan } from "./db/updateQueries";

/* ------------------ BREAK ------------------ */

type ScanApiResponse = {
  data?: InsertScanInput | null;
};

type ConnectUserScansApiResponse = {
  data?: InsertScanInput[] | null;
};

type InstallInfo = {
  id?: string;
};

type RemoteScanRecord = Omit<InsertScanInput, "crawl_status"> & {
  crawl_status: InsertScanInput["crawl_status"] | "cached";
};

type ScanHistoryResponse = {
  data: RemoteScanRecord[];
  count: number;
};

type RestoreScansOptions = {
  force?: boolean;
  signal: AbortSignal;
  onPage: () => Promise<void>;
  onProgress: (received: number, total: number) => void;
};

type CrawlApiResponse = {
  data?: RemoteScanRecord | null;
};

/* ------------------ BREAK ------------------ */

let isSyncPaused = false;
let pendingScanCheckPromise: Promise<void> | null = null;
let uncrawledUrlCheckPromise: Promise<void> | null = null;
let uncrawledUrlTrigger: ReturnType<typeof setInterval> | null = null;
const crawlingScanPromises = new Map<string, Promise<void>>();
const scanRestorePromises = new Set<Promise<boolean>>();
export const SCAN_HISTORY_SYNC_WINDOW_MS = 5 * 60 * 1_000;
const uncrawledUrlCheckIntervalMilliseconds = 5_000;

/* ------------------ BREAK ------------------ */

// Finds pending local scans and retries their idempotent API synchronization once at a time.
export function checkPendingScans(): Promise<void> {
  if (isSyncPaused) return Promise.resolve();
  if (pendingScanCheckPromise) return pendingScanCheckPromise;

  pendingScanCheckPromise = synchronizePendingScans().finally(() => {
    pendingScanCheckPromise = null;
  });

  return pendingScanCheckPromise;
};//export ends

// Pauses background scan work and waits for requests from the previous account.
export async function pauseScanSync(): Promise<void> {
  isSyncPaused = true;
  await Promise.allSettled([
    pendingScanCheckPromise, uncrawledUrlCheckPromise,
    ...crawlingScanPromises.values(), ...scanRestorePromises, waitForInitialScanSyncs()
  ]);
};//export ends

// Restores background scan work after the account reset finishes.
export function resumeScanSync(): void {
  isSyncPaused = false;
};//export ends

// Starts one recurring five-second check and returns a cleanup function for the root layout.
export function startUnCrawledUrlsTrigger(): () => void {
  void checkUnCrawledUrls();

  if (!uncrawledUrlTrigger) {
    uncrawledUrlTrigger = setInterval(() => {
      void checkUnCrawledUrls();
    }, uncrawledUrlCheckIntervalMilliseconds);
  };//if ends

  return () => {
    if (!uncrawledUrlTrigger) return;

    clearInterval(uncrawledUrlTrigger);
    uncrawledUrlTrigger = null;
  };
};//export ends

// Finds pending URL rows and crawls them sequentially without duplicating active requests.
export function checkUnCrawledUrls(): Promise<void> {
  if (isSyncPaused) return Promise.resolve();
  if (uncrawledUrlCheckPromise) return uncrawledUrlCheckPromise;

  uncrawledUrlCheckPromise = crawlPendingUrls().finally(() => {
    uncrawledUrlCheckPromise = null;
  });

  return uncrawledUrlCheckPromise;
};//export ends

// Crawls one pending website opened from My Scans and waits for its local row to be updated.
export async function crawlPendingUrlById(id: string): Promise<void> {
  const scan = await getScanById(id);
  const install = await getData({ key: installSettings.storageKeys.installInfo.name }) as InstallInfo | null;

  if (!scan || scan.install_id !== install?.id || scan.type !== "url" || scan.crawl_status !== "pending") return;

  await crawlPendingUrl(scan);
};//export ends

/* ------------------ BREAK ------------------ */

// Tracks account history restoration so logout waits before clearing SQLite.
export function restoreUserScans(options: RestoreScansOptions): Promise<boolean> {
  const operation = restoreScanHistory(options);
  scanRestorePromises.add(operation);
  void operation.finally(() => scanRestorePromises.delete(operation)).catch(() => undefined);
  return operation;
};//export ends

// Downloads 500-row account pages and commits their original IDs into SQLite.
async function restoreScanHistory({ force = false, signal, onPage, onProgress }: RestoreScansOptions): Promise<boolean> {
  const user = await getStorageUser();
  if (!user || !db || !sqliteDB || isSyncPaused || signal.aborted) return false;
  await initScansTable();
  const storedLastCheck = await getData({ key: scansSettings.lastCheckedAtKey });
  const lastCheckedAt = typeof storedLastCheck === "string" ? Date.parse(storedLastCheck) : NaN;
  const age = Date.now() - lastCheckedAt;
  if (!force && Number.isFinite(lastCheckedAt) && age >= 0 && age < SCAN_HISTORY_SYNC_WINDOW_MS) {
    const total = sqliteDB.getFirstSync<{ total: number }>("SELECT COUNT(*) AS total FROM scans WHERE user_id = ?", user.id)?.total ?? 0;
    onProgress(total, total);
    return true;
  };//if ends
  let total = 0;
  let from = 0;

  do {
    if (isSyncPaused || signal.aborted) return false;
    const url = apiSettings.getApiUrl({ path: "/app/scans" });
    const response = await Axios.get<ScanHistoryResponse>(url.href, {
      params: { from, to: from + 499 }, timeout: 30_000, signal
    });
    const rows = response.data.data;
    if (from === 0) total = response.data.count;
    if (!Array.isArray(rows) || !Number.isSafeInteger(total) || total < from + rows.length) {
      throw new Error("The scan API returned an invalid history page or total count.");
    };//if ends
    if (isSyncPaused || signal.aborted) return false;
    if (rows.length === 0 && from < total) throw new Error("Scan history changed while loading. Please retry.");

    sqliteDB.withTransactionSync(() => {
      for (const row of rows) {
        const local = db!.select().from(scansTable).where(eq(scansTable.id, row.id)).get();
        if (local?.sync_status === "pending") continue;
        if (!local?.notes_pending && Date.parse(local?.updated_at ?? "") > Date.parse(row.updated_at ?? "")) continue;
        const isLegacyDigitalCard = (row.type === "url" || row.type === "website") && Boolean(getUnoQrDigitalCardUid(row.value));
        const values: InsertScanInput = {
          id: row.id, created_at: row.created_at, updated_at: row.updated_at ?? null,
          value: row.value, input_url: row.input_url ?? null, final_url: row.final_url ?? null,
          type: isLegacyDigitalCard ? "digital-card" : row.type ?? null,
          kind: isLegacyDigitalCard ? "digital-card" : row.kind ?? null,
          status: isLegacyDigitalCard ? "completed" : row.status ?? null,
          user_ip: row.user_ip ?? null, location: row.location ?? null, user_id: user.id,
          website_id: row.website_id ?? null, install_id: row.install_id ?? null,
          sync_status: isLegacyDigitalCard ? "pending" : "synced",
          crawl_status: isLegacyDigitalCard ? "not_needed" : row.crawl_status === "cached" ? "completed" : row.crawl_status,
          error: isLegacyDigitalCard ? null : row.error ?? null, metadata: row.metadata ?? null,
          comment: local?.notes_pending ? local.comment : row.comment ?? null,
          tags: local?.notes_pending ? local.tags : row.tags ?? [],
          notes_pending: local?.notes_pending ?? false
        };
        const { id, ...updates } = values;
        db!.insert(scansTable).values(values).onConflictDoUpdate({ target: scansTable.id, set: updates }).run();
      };//for ends
    });
    from += rows.length;
    onProgress(from, total);
    await onPage();
  } while (from < total);

  if (isSyncPaused || signal.aborted) return false;
  await setData({ key: scansSettings.lastCheckedAtKey, value: new Date().toISOString() });
  return true;
};//func ends

/* ------------------ BREAK ------------------ */

// Connects all remote scans for the stored installation to the authenticated user.
export async function connectUserAppScans({ signal }: { signal?: AbortSignal } = {}): Promise<InsertScanInput[]> {
  const installInfo = await getData({
    key: installSettings.storageKeys.installInfo.name
  }) as InstallInfo | null;
  if (!installInfo?.id) throw new Error("An app installation is required to connect your scans.");

  const headers = await getInstallLinkHeaders(installInfo.id);
  const apiUrl = apiSettings.getApiUrl({ path: "/app/scans/connectuser" });
  const response = await Axios.put<ConnectUserScansApiResponse>(apiUrl.href, {
    install_id: installInfo.id
  }, { headers, signal, timeout: 15_000 });
  if (!response.data?.data) throw new Error("The API did not confirm the scan connection.");
  return response.data.data;
};//export ends

/* ------------------ BREAK ------------------ */

// Loads pending SQLite rows and synchronizes them sequentially to avoid request bursts.
async function synchronizePendingScans(): Promise<void> {
  if (!db) return;

  try {
    await initScansTable();
    const pendingScans = await db
      .select()
      .from(scansTable)
      .where(eq(scansTable.sync_status, "pending"));

    for (const pendingScan of pendingScans) {
      if (isSyncPaused) return;
      await synchronizePendingScan(pendingScan);
    }
    const pendingNotes = db.select().from(scansTable).where(eq(scansTable.notes_pending, true)).all();
    for (const scan of pendingNotes) {
      if (isSyncPaused) return;
      await synchronizeScanNotes(scan);
    };//for ends
  } catch (error: unknown) {
    console.error("Unable to synchronize pending scans:", error);
  };//try-catch ends
};//func ends

// Loads pending website rows and sends each one through the shared crawl endpoint.
async function crawlPendingUrls(): Promise<void> {
  if (!db) return;

  try {
    await initScansTable();
    const install = await getData({ key: installSettings.storageKeys.installInfo.name }) as InstallInfo | null;
    if (!install?.id) return;
    const pendingUrls = await db
      .select()
      .from(scansTable)
      .where(and(
        eq(scansTable.type, "url"),
        eq(scansTable.crawl_status, "pending"),
        eq(scansTable.install_id, install.id)
      ));

    for (const pendingUrl of pendingUrls) {
      if (isSyncPaused) return;
      await crawlPendingUrl(pendingUrl);
    }
  } catch (error: unknown) {
    console.error("Unable to check uncrawled URLs:", error);
  };//try-catch ends
};//func ends

// Shares one in-flight crawl promise for every pending scan ID.
function crawlPendingUrl(scan: InsertScanInput): Promise<void> {
  const existingPromise = crawlingScanPromises.get(scan.id);
  if (existingPromise) return existingPromise;

  const crawlPromise = requestPendingUrlCrawl(scan).finally(() => {
    crawlingScanPromises.delete(scan.id);
  });
  crawlingScanPromises.set(scan.id, crawlPromise);
  return crawlPromise;
};//func ends

// Requests one server-owned crawl and mirrors the returned Supabase row into SQLite.
async function requestPendingUrlCrawl(scan: InsertScanInput): Promise<void> {
  try {
    await waitForInitialScanSync(scan.id);
    const apiUrl = apiSettings.getApiUrl({ path: `/app/scans/${scan.id}/crawl_url` });
    const response = await Axios.get<CrawlApiResponse>(apiUrl.href, {
      timeout: 15_000,
      params: {
        install_id: scan.install_id
      }
    });
    const crawledScan = response.data?.data;

    if (!crawledScan || crawledScan.id !== scan.id) {
      await appendScanError(scan.id, "The crawl API returned no website data.");
      return;
    };//if ends

    const { id: crawledScanId, comment, tags, notes_pending, ...crawledScanData } = crawledScan;
    await updateScan(crawledScanId, {
      ...crawledScanData,
      crawl_status: crawledScanData.crawl_status === "cached" ? "completed" : crawledScanData.crawl_status,
      sync_status: "synced"
    });
  } catch (error: unknown) {
    // Keep deferred crawls pending without recording installation verification as a scan failure.
    if (isInstallVerificationPending(error)) return;
    await appendScanError(scan.id, getErrorMessage(error));
    console.error(`Unable to crawl pending URL scan ${scan.id}:`, error);
  };//try-catch ends
};//func ends

// PUTs one pending row and applies the returned database object only when its ID matches.
async function synchronizePendingScan(scan: InsertScanInput): Promise<void> {
  try {
    const preparedScan = await ensurePendingScanInstall(scan);

    if (!preparedScan?.install_id) return;

    const apiUrl = apiSettings.getApiUrl({ path: `/app/scans/${preparedScan.id}` });
    const response = await Axios.put<ScanApiResponse>(apiUrl.href, preparedScan, { timeout: 15_000 });
    const synchronizedScan = response.data?.data;

    if (!isCompleteScanObject(synchronizedScan, preparedScan.id)) return;

    const { id: synchronizedId, comment, tags, notes_pending, ...synchronizedData } = synchronizedScan;
    await updateScan(synchronizedId, {
      ...synchronizedData,
      sync_status: "synced"
    });
  } catch (error: unknown) {
    if (isInstallVerificationPending(error)) return;
    console.error(`Unable to synchronize pending scan ${scan.id}:`, error);
  };//try-catch ends
};//func ends

// Saves note edits locally before attempting the independent cloud notes queue.
export async function saveScanNotes(id: string, notes: { comment: string | null; tags: string[] }): Promise<{ comment: string | null; tags: string[] }> {
  if (!db || isSyncPaused) throw new Error("Scan storage is not available. Please try again.");
  await initScansTable();
  const normalizedNotes = {
    comment: notes.comment?.trim() || null,
    tags: [...new Set(notes.tags.map((tag) => tag.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/ +/g, " ").trim()).filter(Boolean))]
  };
  const result = db.update(scansTable).set({ ...normalizedNotes, notes_pending: true }).where(eq(scansTable.id, id)).run();
  if (!result.changes) throw new Error("This scan could not be found on this device.");
  await checkPendingScans();
  return normalizedNotes;
};//export ends

/* ------------------ BREAK ------------------ */

// Updates only cloud note fields and preserves edits made while this request was running.
async function synchronizeScanNotes(scan: InsertScanInput): Promise<void> {
  if (!db || scan.sync_status === "pending") return;
  const notes = { comment: scan.comment ?? null, tags: scan.tags ?? [] };
  try {
    const response = await Axios.patch<{ data: { id: string; comment: string | null; tags: string[]; updated_at: string } }>(
      apiSettings.getApiUrl({ path: `/app/scans/${scan.id}/notes` }).href, notes, { timeout: 15_000 }
    );
    const saved = response.data.data;
    if (saved?.id !== scan.id || saved.comment !== notes.comment || JSON.stringify(saved.tags) !== JSON.stringify(notes.tags)) {
      throw new Error("Scan notes were not confirmed by the API.");
    };//if ends
    const current = db.select().from(scansTable).where(eq(scansTable.id, scan.id)).get();
    if (current?.comment === notes.comment && JSON.stringify(current.tags) === JSON.stringify(notes.tags)) {
      db.update(scansTable).set({ notes_pending: false, updated_at: saved.updated_at }).where(eq(scansTable.id, scan.id)).run();
    };//if ends
  } catch (error: unknown) {
    console.warn("Scan notes remain saved locally for cloud retry:", error);
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

// Confirms the API returned the complete identifying fields for the requested scan row.
function isCompleteScanObject(
  value: InsertScanInput | null | undefined,
  expectedId: string
): value is InsertScanInput {
  return Boolean(
    value
    && value.id === expectedId
    && typeof value.created_at === "string"
    && typeof value.value === "string"
    && typeof value.install_id === "string"
    && typeof value.sync_status === "string"
  );
};//func ends

// Adds the stored or newly created app-install ID before retrying a pending scan.
async function ensurePendingScanInstall(scan: InsertScanInput): Promise<InsertScanInput | null> {
  const storedInstallInfo = await getData({
    key: installSettings.storageKeys.installInfo.name
  }) as InstallInfo | null;
  const installInfo = storedInstallInfo?.id
    ? storedInstallInfo
    : await insertAppInstall() as InstallInfo | null;

  if (!installInfo?.id) return null;
  if (scan.install_id === installInfo.id) return scan;

  await updateScan(scan.id, { install_id: installInfo.id });
  return { ...scan, install_id: installInfo.id };
};//func ends

// Converts an unknown crawl failure into a concise persisted message.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown URL crawl error.";
};//func ends

/* ------------------ BREAK ------------------ */
