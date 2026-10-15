import type { ScanTypeInit } from "./types";

/* ------------------ BREAK ------------------ */

export const getInit: ScanTypeInit = { label: "Digital Card", type: "digital-card", icon: "card-account-details-outline" };//export ends

// Extracts a public card UID only from official UnoQR digital-card URLs.
export function getUnoQrDigitalCardUid(value: string): string | null {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) return null;
    if (url.hostname !== "unoqr.com" && url.hostname !== "www.unoqr.com") return null;
    return /^\/dc\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname)?.[1] ?? null;
  } catch {
    return null;
  };//try-catch ends
};//export ends
