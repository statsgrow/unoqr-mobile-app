import { eq } from "drizzle-orm";

import { apiSettings, installSettings } from "@/settings";
import { insertAppInstall } from "@/utils/auth/AppInstall";
import { Axios } from "@/utils/general/Axios";
import { getData } from "@/utils/general/Storage";
import { db } from "@/utils/sqlite/db";

import { initScansTable, type InsertScanInput, scansTable } from "./db/init";
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

/* ------------------ BREAK ------------------ */

let pendingScanCheckPromise: Promise<void> | null = null;

/* ------------------ BREAK ------------------ */

// Finds pending local scans and retries their idempotent API synchronization once at a time.
export function checkPendingScans(): Promise<void> {
  if (pendingScanCheckPromise) return pendingScanCheckPromise;

  pendingScanCheckPromise = synchronizePendingScans().finally(() => {
    pendingScanCheckPromise = null;
  });

  return pendingScanCheckPromise;
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

/* ------------------ BREAK ------------------ */
