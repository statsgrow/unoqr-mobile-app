import type { ScanTypeInit } from "./types";

// Defines the mobile presentation for authentication scans.
export const getInit: ScanTypeInit = { label: "Authenticator", type: "auth", icon: "shield-key-outline" };

