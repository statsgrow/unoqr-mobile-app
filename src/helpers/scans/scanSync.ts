import { and, eq } from "drizzle-orm";

import { apiSettings, installSettings } from "@/settings";
import { insertAppInstall } from "@/utils/auth/AppInstall";
import { Axios } from "@/utils/general/Axios";
import { getData } from "@/utils/general/Storage";
import { db } from "@/utils/sqlite/db";

import { getScanById } from "./db/getQueries";
import { appendScanError, waitForInitialScanSync } from "./db/insertQueries";
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

type CrawlApiResponse = {
  data?: (Omit<InsertScanInput, "crawl_status"> & {
    crawl_status: InsertScanInput["crawl_status"] | "cached";
  }) | null;
};

/* ------------------ BREAK ------------------ */

let pendingScanCheckPromise: Promise<void> | null = null;
let uncrawledUrlCheckPromise: Promise<void> | null = null;
let uncrawledUrlTrigger: ReturnType<typeof setInterval> | null = null;
const crawlingScanPromises = new Map<string, Promise<void>>();
const uncrawledUrlCheckIntervalMilliseconds = 5_000;

/* ------------------ BREAK ------------------ */

// Finds pending local scans and retries their idempotent API synchronization once at a time.
export function checkPendingScans(): Promise<void> {
  if (pendingScanCheckPromise) return pendingScanCheckPromise;

  pendingScanCheckPromise = synchronizePendingScans().finally(() => {
    pendingScanCheckPromise = null;
  });

  return pendingScanCheckPromise;
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
  if (uncrawledUrlCheckPromise) return uncrawledUrlCheckPromise;

  uncrawledUrlCheckPromise = crawlPendingUrls().finally(() => {
    uncrawledUrlCheckPromise = null;
  });

  return uncrawledUrlCheckPromise;
};//export ends

// Crawls one pending website opened from My Scans and waits for its local row to be updated.
export async function crawlPendingUrlById(id: string): Promise<void> {
  const scan = await getScanById(id);

  if (!scan || scan.type !== "url" || scan.crawl_status !== "pending") return;

  await crawlPendingUrl(scan);
};//export ends

/* ------------------ BREAK ------------------ */

// Connects all remote scans for the stored installation to the authenticated user.
export async function connectUserAppScans(): Promise<InsertScanInput[] | null> {
  const installInfo = await getData({
    key: installSettings.storageKeys.installInfo.name
  }) as InstallInfo | null;
  if (!installInfo?.id) return null;

  try {
    const apiUrl = apiSettings.getApiUrl({ path: "/app/scans/connectuser" });
    const response = await Axios.put<ConnectUserScansApiResponse>(apiUrl.href, {
      install_id: installInfo.id
    });

    return response.data?.data || [];
  } catch (error: unknown) {
    console.error("Unable to connect app scans to the user:", error);
    return null;
  };//try-catch ends
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
      await synchronizePendingScan(pendingScan);
    }
  } catch (error: unknown) {
    console.error("Unable to synchronize pending scans:", error);
  };//try-catch ends
};//func ends

// Loads pending website rows and sends each one through the shared crawl endpoint.
async function crawlPendingUrls(): Promise<void> {
  if (!db) return;

  try {
    await initScansTable();
    const pendingUrls = await db
      .select()
      .from(scansTable)
      .where(and(
        eq(scansTable.type, "url"),
        eq(scansTable.crawl_status, "pending")
      ));

    for (const pendingUrl of pendingUrls) {
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
      params: {
        install_id: scan.install_id
      }
    });
    const crawledScan = response.data?.data;

    if (!crawledScan || crawledScan.id !== scan.id) {
      await appendScanError(scan.id, "The crawl API returned no website data.");
      return;
    };//if ends

    const { id: crawledScanId, ...crawledScanData } = crawledScan;
    await updateScan(crawledScanId, {
      ...crawledScanData,
      crawl_status: crawledScanData.crawl_status === "cached" ? "completed" : crawledScanData.crawl_status,
      sync_status: "synced"
    });
  } catch (error: unknown) {
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
    const response = await Axios.put<ScanApiResponse>(apiUrl.href, preparedScan);
    const synchronizedScan = response.data?.data;

    if (!isCompleteScanObject(synchronizedScan, preparedScan.id)) return;

    const { id: synchronizedId, ...synchronizedData } = synchronizedScan;
    await updateScan(synchronizedId, {
      ...synchronizedData,
      sync_status: "synced"
    });
  } catch (error: unknown) {
    console.error(`Unable to synchronize pending scan ${scan.id}:`, error);
  };//try-catch ends
};//func ends

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
  if (scan.install_id) return scan;

  const storedInstallInfo = await getData({
    key: installSettings.storageKeys.installInfo.name
  }) as InstallInfo | null;
  const installInfo = storedInstallInfo?.id
    ? storedInstallInfo
    : await insertAppInstall() as InstallInfo | null;

  if (!installInfo?.id) return null;

  await updateScan(scan.id, { install_id: installInfo.id });
  return { ...scan, install_id: installInfo.id };
};//func ends

// Converts an unknown crawl failure into a concise persisted message.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown URL crawl error.";
};//func ends

/* ------------------ BREAK ------------------ */
