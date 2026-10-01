import type { ScanTypeInit } from "./types";

// Defines the mobile presentation for phone-number scans.
export const getInit: ScanTypeInit = { label: "Phone Number", type: "phone", icon: "phone-outline" };

/* ------------------ BREAK ------------------ */

// Extracts a dialable number from a tel URI while keeping its international prefix.
export function getPhoneNumber(value: string): string | null {
  if (!/^tel:/i.test(value.trim())) return null;
  const number = value.trim().slice(4).replace(/[\s().-]/g, "");
  return /^\+?\d{3,15}$/.test(number) ? number : null;
};//export ends
