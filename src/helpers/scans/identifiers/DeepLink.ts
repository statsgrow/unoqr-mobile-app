import type { ScanTypeInit } from "./types";

// Defines the mobile presentation for custom-scheme deep-link scans.
export const getInit: ScanTypeInit = { label: "Deep Link", type: "deep_link", icon: "link-variant" };

