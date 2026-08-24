import type { ScanTypeInit } from "./types";

// Defines the mobile presentation for generic-payment scans.
export const getInit: ScanTypeInit = { label: "Payment", type: "payment", icon: "wallet-outline" };

