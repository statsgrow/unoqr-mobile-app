import type { QrSyncStatus } from "./initQrCodes";

/* ------------------ BREAK ------------------ */

type QrStatusListener = (status: QrSyncStatus | null) => void;
const listeners = new Map<string, Set<QrStatusListener>>();

/* ------------------ BREAK ------------------ */

// Subscribes the editor to committed status changes for its QR without polling SQLite.
export function subscribeQrSaveStatus(id: string, listener: QrStatusListener): () => void {
  const callbacks = listeners.get(id) ?? new Set<QrStatusListener>();
  callbacks.add(listener);
  listeners.set(id, callbacks);
  return () => {
    callbacks.delete(listener);
    if (callbacks.size === 0) listeners.delete(id);
  };//return ends
};//export ends

// Publishes a QR's status only after the associated SQLite write has succeeded.
export function publishQrSaveStatus(id: string, status: QrSyncStatus | null): void {
  listeners.get(id)?.forEach((listener) => listener(status));
};//export ends
