let lastTimestamp = 0;

/* ------------------ BREAK ------------------ */

// Assigns distinct local versions even when two QR writes happen in the same millisecond.
export function getQrUpdatedAt(previous?: string | null): string {
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1, (previous ? Date.parse(previous) || 0 : 0) + 1);
  return new Date(lastTimestamp).toISOString();
};//export ends
