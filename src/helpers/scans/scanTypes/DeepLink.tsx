import * as Linking from "expo-linking";

import type { StoredScanReference } from "@/helpers/scans/db/persistScan";

/* ------------------ BREAK ------------------ */

// Hands an already stored custom-scheme deep link to the operating system.
export async function processDeepLinkScan(scan: StoredScanReference): Promise<void> {
  await Linking.openURL(scan.value);
};//export ends
