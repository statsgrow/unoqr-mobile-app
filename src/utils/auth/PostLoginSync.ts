import { useSyncExternalStore } from "react";

import { restoreUserDigitalCards } from "@/helpers/digital_cards/utils/SyncDigitalCards";
import { restoreUserQrCodes } from "@/helpers/qrcodes/QrSync";
import { connectUserAppScans, restoreUserScans } from "@/helpers/scans/scanSync";
import { postLoginSyncSettings } from "@/settings";
import { connectUserAppInstall, insertAppInstall } from "@/utils/auth/AppInstall";
import { getData, removeData, setData } from "@/utils/general/Storage";

/* ------------------ BREAK ------------------ */

export type PostLoginSyncStatus = "pending" | "completed" | "failed";
type SyncFeature = keyof typeof postLoginSyncSettings;
export type PostLoginSyncState = Record<SyncFeature, PostLoginSyncStatus | null> & {
  checking: boolean;
};
type StartSyncOptions = { retryFailed?: boolean };

/* ------------------ BREAK ------------------ */

const features: SyncFeature[] = ["cards", "scans", "qrcodes"];
const listeners = new Set<() => void>();
let state: PostLoginSyncState = { cards: null, scans: null, qrcodes: null, checking: true };
let isPaused = false;
let activeUserId: string | null = null;
let controller: AbortController | null = null;
let syncPromise: Promise<void> | null = null;
let statusWrite: Promise<void> = Promise.resolve();

/* ------------------ BREAK ------------------ */

// Shares initial download progress with Home and account layouts without polling storage.
export function usePostLoginSync(): PostLoginSyncState {
  return useSyncExternalStore(subscribe, getPostLoginSyncState, getPostLoginSyncState);
};//export ends

// Reads the current download state when another synchronization entry point needs to defer.
export function getPostLoginSyncState(): PostLoginSyncState {
  return state;
};//export ends

// Marks all three downloads pending before a newly authenticated account is published.
export async function initializePostLoginSync(): Promise<void> {
  for (const feature of features) await saveStatus(feature, "pending");
  publish({ ...state, checking: false });
};//export ends

// Starts one account restoration from the root layout and leaves completed downloads untouched.
export function startPostLoginSync(userId: string | null, options: StartSyncOptions = {}): Promise<void> {
  if (isPaused) return Promise.resolve();
  if (syncPromise) {
    if (activeUserId === userId && !options.retryFailed) return syncPromise;
    return syncPromise.then(() => startPostLoginSync(userId, options));
  };//if ends
  if (!userId) {
    publish({ cards: null, scans: null, qrcodes: null, checking: false });
    return Promise.resolve();
  };//if ends

  activeUserId = userId;
  const operationController = new AbortController();
  controller = operationController;
  syncPromise = synchronize(options, operationController.signal).finally(() => {
    syncPromise = null;
    controller = null;
  });
  return syncPromise;
};//export ends

// Retries failed collections through the same worker that the root layout owns.
export function retryPostLoginSync(): Promise<void> {
  return startPostLoginSync(activeUserId, { retryFailed: true });
};//export ends

// Aborts initial restoration and drains status writes before account cleanup deletes local data.
export async function pausePostLoginSync(): Promise<void> {
  isPaused = true;
  controller?.abort();
  await Promise.allSettled([syncPromise, statusWrite]);
};//export ends

// Allows the root layout to start downloads after account cleanup finishes.
export function resumePostLoginSync(): void {
  isPaused = false;
};//export ends

// Removes completion markers together with the account tables so another login restores its own data.
export async function resetPostLoginSync(): Promise<void> {
  for (const feature of features) await removeData({ key: postLoginSyncSettings[feature] });
  activeUserId = null;
  publish({ cards: null, scans: null, qrcodes: null, checking: false });
};//export ends

/* ------------------ BREAK ------------------ */

// Restores independent collections concurrently and retries only explicitly requested failures.
async function synchronize({ retryFailed = false }: StartSyncOptions, signal: AbortSignal): Promise<void> {
  const values = await Promise.all(features.map(feature => getData({ key: postLoginSyncSettings[feature] })));
  if (signal.aborted) return;
  const statuses = Object.fromEntries(features.map((feature, index) => {
    const value = values[index];
    return [feature, value === "completed" || value === "failed" ? value : "pending"];
  })) as Record<SyncFeature, PostLoginSyncStatus>;
  publish({ ...statuses, checking: false });

  // Persist pending markers before starting requests, including upgraded accounts without these keys.
  for (const feature of features) {
    if (signal.aborted) return;
    if (statuses[feature] === "pending" || (retryFailed && statuses[feature] === "failed")) {
      await saveStatus(feature, "pending", signal);
    };//if ends
  };//for ends
  if (signal.aborted) return;

  const results = await Promise.allSettled(features.map(async feature => {
    if (state[feature] !== "pending" || signal.aborted) return;
    try {
      const completed = await restoreFeature(feature, signal);
      if (signal.aborted) return;
      if (!completed) throw new Error(`The initial ${feature} download did not complete.`);
      await saveStatus(feature, "completed", signal);
    } catch (error: unknown) {
      if (signal.aborted) return;
      console.error(`Unable to finish post-login ${feature} synchronization:`, error);
      await saveStatus(feature, "failed", signal);
    };//try-catch ends
  }));
  for (const result of results) {
    if (result.status === "rejected") throw result.reason;
  };//for ends
};//func ends

// Reuses each collection's existing restoration and links guest scans before downloading history.
async function restoreFeature(feature: SyncFeature, signal: AbortSignal): Promise<boolean> {
  if (feature === "cards") return restoreUserDigitalCards({ signal });
  if (feature === "scans") {
    const install = await insertAppInstall();
    if (signal.aborted) return false;
    if (!install?.id) throw new Error("Unable to prepare this installation for scan synchronization.");
    await connectUserAppInstall({ signal });
    if (signal.aborted) return false;
    await connectUserAppScans({ signal });
    if (signal.aborted) return false;
    return restoreUserScans({ force: true, signal, onPage: async () => {}, onProgress: () => {} });
  };//if ends
  return restoreUserQrCodes({ force: true, signal, onPage: async () => {}, onProgress: () => {} });
};//func ends

// Serializes the three status writes because native storage maintains a shared key index.
function saveStatus(feature: SyncFeature, status: PostLoginSyncStatus, signal?: AbortSignal): Promise<void> {
  statusWrite = statusWrite.catch(() => undefined).then(async () => {
    if (signal?.aborted) return;
    await setData({ key: postLoginSyncSettings[feature], value: status });
    if (!signal?.aborted) publish({ ...state, [feature]: status });
  });
  return statusWrite;
};//func ends

// Subscribes mounted views to persisted status changes.
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };//return ends
};//func ends

// Publishes a stable snapshot until the next status change.
function publish(next: PostLoginSyncState): void {
  state = next;
  for (const listener of listeners) listener();
};//func ends
