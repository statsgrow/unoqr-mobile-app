import type { ScanTypeInit } from "./types";

// Defines the mobile presentation for UPI-payment scans.
export const getInit: ScanTypeInit = { label: "UPI Payment", type: "upi_payment", icon: "bank-transfer" };

