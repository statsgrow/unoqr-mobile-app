import type { RemoteCard } from "@/helpers/digital_cards/api/cards";
import { deleteCachedDigitalCard } from "@/helpers/digital_cards/db/deleteQueries";
import { getCachedDigitalCard, getCachedDigitalCards } from "@/helpers/digital_cards/db/getQueries";
import { cacheDigitalCard } from "@/helpers/digital_cards/db/insertQueries";
import { deleteQrCardImages, storeSavedQrCardImages } from "@/helpers/digital_cards/files/qrCardFiles";
import { apiSettings } from "@/settings";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { Axios, isAxiosError } from "@/utils/general/Axios";
import { db } from "@/utils/sqlite/db";

/* ------------------ BREAK ------------------ */

type DigitalCardSummary = Pick<RemoteCard, "uid" | "version" | "updated_at">;
type DigitalCardSyncResponse = { data: { cards: DigitalCardSummary[]; server_time: string }; count: number };
type DigitalCardResponse = { data: RemoteCard | null };
type DigitalCardSyncListener = () => void;
type RestoreDigitalCardsOptions = { signal: AbortSignal };
type SynchronizeDigitalCardsOptions = { restore?: boolean; signal?: AbortSignal };

/* ------------------ BREAK ------------------ */

export const DIGITAL_CARDS_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const DIGITAL_CARDS_SETTLE_MS = 2 * 60 * 1000;
const listeners = new Set<DigitalCardSyncListener>();
const restorationPromises = new Set<Promise<boolean>>();
let pendingSync: Promise<void> | null = null;
let isSyncPaused = false;

/* ------------------ BREAK ------------------ */

// Checks every owned server card once at a time without putting screens into a loading state.
export function checkUnSyncedDigitalCards(): Promise<void> {
  if (isSyncPaused || restorationPromises.size > 0) return Promise.resolve();
  if (pendingSync) return pendingSync;
  pendingSync = synchronizeDigitalCards().then(() => undefined).catch((error: unknown) => {
    if (isSyncPaused) return;
    if (!isDigitalCardNetworkError(error)) throw error;
    console.warn("Digital card sync could not reach the API; keeping saved data until the next check.");
  }).finally(() => { pendingSync = null; });
  return pendingSync;
};//export ends

// Restores every owned card before Home opens and tracks the operation so logout can drain it.
export function restoreUserDigitalCards({ signal }: RestoreDigitalCardsOptions): Promise<boolean> {
  const operation = restoreDigitalCards(signal);
  restorationPromises.add(operation);
  // Releases the completed restoration without leaving an unhandled rejection on failure.
  const clear = (): void => { restorationPromises.delete(operation); };//func ends
  void operation.then(clear, clear);
  return operation;
};//export ends

// Refreshes SQLite-backed screens when a background check changes their locally saved cards.
export function subscribeDigitalCardSync(listener: DigitalCardSyncListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };//return ends
};//export ends

// Drains background card synchronization before logout clears the previous account's files and rows.
export async function pauseDigitalCardSync(): Promise<void> {
  isSyncPaused = true;
  await Promise.allSettled([pendingSync, ...restorationPromises]);
};//export ends

// Resumes account card synchronization after local session cleanup completes.
export function resumeDigitalCardSync(): void {
  isSyncPaused = false;
};//export ends

/* ------------------ BREAK ------------------ */

// Waits for an earlier background check before downloading a full account snapshot without the settling delay.
async function restoreDigitalCards(signal: AbortSignal): Promise<boolean> {
  await Promise.allSettled([pendingSync]);
  if (isSyncPaused || signal.aborted) return false;
  return synchronizeDigitalCards({ restore: true, signal });
};//func ends

// Pages through the existing card endpoint and compares versions using the API server's clock.
async function synchronizeDigitalCards({ restore = false, signal }: SynchronizeDigitalCardsOptions = {}): Promise<boolean> {
  const user = await getStorageUser();
  if (!user || !db || isSyncPaused || signal?.aborted) return false;
  const beforeSync = await getCachedDigitalCards(user.id);
  const summaries: DigitalCardSummary[] = [];
  const url = apiSettings.getApiUrl({ path: "/app/digital_cards" }).href;
  let from = 0;
  let total = 0;
  let serverTime = 0;
  do {
    if (isSyncPaused || signal?.aborted) return false;
    const response = await Axios.get<DigitalCardSyncResponse>(url, {
      params: { sync: true, from, to: from + 499 }, timeout: 15000, signal
    });
    const page = response.data.data;
    if (!Array.isArray(page?.cards) || !Number.isSafeInteger(response.data.count) || response.data.count < 0) {
      throw new Error("The digital card API returned an invalid sync response.");
    };//if ends
    if (from === 0) {
      total = response.data.count;
      serverTime = getTimestamp(page.server_time);
      if (!Number.isFinite(serverTime)) throw new Error("The digital card API did not return its UTC sync time.");
    };//if ends
    if (response.data.count !== total || (page.cards.length === 0 && from < total)) {
      throw new Error("Your digital cards changed while syncing. The next check will retry.");
    };//if ends
    summaries.push(...page.cards);
    from += page.cards.length;
  } while (from < total);

  for (const summary of summaries) {
    if (isSyncPaused || signal?.aborted) return false;
    try {
      if (!Number.isSafeInteger(summary.version) || summary.version < 1) throw new Error("Your digital card has an invalid server version.");
      let local = await getCachedDigitalCard(user.id, summary.uid);
      if (restore || !local || summary.version > local.version) {
        if (!restore && !isSettledCard(summary, serverTime)) continue;
        const response = await Axios.get<DigitalCardResponse>(url, { params: { uid: summary.uid }, timeout: 15000, signal });
        const remote = response.data.data;
        if (isSyncPaused || signal?.aborted) return false;
        if (!remote) {
          if (restore) throw new Error("Your digital cards changed while restoring. Please try again.");
          continue;
        };//if ends
        if (remote.user_id !== user.id || remote.uid !== summary.uid) throw new Error("The digital card does not belong to this account.");
        if (!Number.isSafeInteger(remote.version) || remote.version < summary.version) {
          if (restore) throw new Error("Your digital card API returned an outdated version. Please try again.");
          continue;
        };//if ends
        if (!restore && !isSettledCard(remote, serverTime)) continue;
        const saved = await cacheDigitalCard(remote);
        if (!local || saved.version > local.version) notifyDigitalCardSync();
        local = saved;
      };//if ends
      // Checks local files even when the data version matches so interrupted image downloads retry.
      if (local && !isSyncPaused && !signal?.aborted) await storeSavedQrCardImages(local);
    } catch (error: unknown) {
      if (isSyncPaused || signal?.aborted) return false;
      if (restore) throw error;
      if (isDigitalCardNetworkError(error)) {
        console.warn(`Digital card ${summary.uid} could not sync over the network; the next check will retry.`);
      } else {
        console.error(`Unable to sync digital card ${summary.uid}:`, error);
      };//if ends
    };//try-catch ends
  };//for ends

  // Removes cards deleted on another device only if this device has not saved a newer version meanwhile.
  const ownedUids = new Set(summaries.map((card) => card.uid));
  for (const previous of beforeSync) {
    if (isSyncPaused || signal?.aborted) return false;
    if (ownedUids.has(previous.uid)) continue;
    const current = await getCachedDigitalCard(user.id, previous.uid);
    if (!current || current.version !== previous.version) continue;
    await deleteCachedDigitalCard(user.id, previous.uid, previous.version);
    const remaining = await getCachedDigitalCard(user.id, previous.uid);
    if (!remaining) {
      deleteQrCardImages(previous.uid);
      notifyDigitalCardSync();
    };//if ends
  };//for ends
  return !isSyncPaused && !signal?.aborted;
};//func ends

// Treats connection failures and timeouts as deferred sync while preserving API and database errors.
function isDigitalCardNetworkError(error: unknown): boolean {
  if (isAxiosError(error)) {
    return !error.response && ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error.code ?? "");
  };//if ends
  return error instanceof TypeError && /network request failed|failed to fetch|networkerror/i.test(error.message);
};//func ends

// Applies the two-minute settling window to timezone-aware instants rather than a device's local clock.
function isSettledCard(card: Pick<RemoteCard, "updated_at">, serverTime: number): boolean {
  const updatedAt = getTimestamp(card.updated_at);
  return Number.isFinite(updatedAt) && serverTime - updatedAt >= DIGITAL_CARDS_SETTLE_MS;
};//func ends

// Rejects timestamps without an explicit timezone so device locale cannot change their meaning.
function getTimestamp(value: string): number {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : Number.NaN;
};//func ends

// Tells mounted SQLite-backed screens to reread their cards without showing a sync spinner.
function notifyDigitalCardSync(): void {
  for (const listener of listeners) listener();
};//func ends
