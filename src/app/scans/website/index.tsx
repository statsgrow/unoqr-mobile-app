import { useCallback, useEffect, useRef } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { waitForInitialScanSync } from "@/helpers/scans/db/insertQueries";
import type { ScanMetadata, ScanUrlMetadata } from "@/helpers/scans/db/init";
import { syncCompletedScanToAPI, updateScan, type UpdateScanInput } from "@/helpers/scans/db/updateQueries";
import { apiSettings } from "@/settings";
import { colors } from "@/theme/tokens";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

type CrawlApiResponse = {
  data?: CrawlData | null;
  error?: unknown;
  message?: string;
};

type CrawlData = ScanMetadata & {
  status: "completed" | "blocked" | "pending";
  inputUrl: ScanUrlMetadata;
  finalUrl: ScanUrlMetadata | null;
};

type ReturnToScanner = () => void;

/* ------------------ BREAK ------------------ */

// Opens Expo Web Browser immediately while crawl collection and persistence continue independently.
export default function WebsiteScanScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; u?: string | string[] }>();
  const scanId = getRouteParam(params.id);
  const rawUrl = getRouteParam(params.u);
  const websiteUrl = getCleanWebsiteUrl(rawUrl);
  const hasStartedRef = useRef(false);
  const hasReturnedRef = useRef(false);

  // Dismisses every intermediate route and lands strictly on the scanner once.
  const returnToScanner = useCallback(() => {
    if (hasReturnedRef.current) return;

    hasReturnedRef.current = true;
    router.dismissTo("/scans/scanner");
  }, []);

  // Starts the website flow once for the supplied URL without waiting on the crawl response.
  useEffect(() => {
    if (hasStartedRef.current) return;

    if (!scanId || !websiteUrl) {
      returnToScanner();
      return;
    };//if ends

    hasStartedRef.current = true;
    void runWebsiteFlow(scanId, websiteUrl, returnToScanner);
  }, [returnToScanner, scanId, websiteUrl]);

  // Sends native hardware-back actions directly to the scanner route.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      returnToScanner();
      return true;
    });

    return () => subscription.remove();
  }, [returnToScanner]);

  //Default Return
  return (
    <View style={styles.screen}>
      <PxPageLoader
        title="Checking this link"
        description="We’re checking the link while opening the website."
      />
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Starts Crawl4AI first, opens Expo Web Browser immediately, and logs independent timings.
async function runWebsiteFlow(scanId: string, url: string, returnToScanner: ReturnToScanner): Promise<void> {
  const flowStartedAt = performance.now();
  const crawlPromise = requestWebsiteCrawl(scanId, url, flowStartedAt);
  const browserRequestedAt = performance.now();
  const browserPromise = WebBrowser.openBrowserAsync(url);
  const browserDispatchedAt = performance.now();

  console.log("Expo Web Browser request dispatched:", {
    url,
    requestStartedAfterMs: getElapsedMilliseconds(flowStartedAt, browserRequestedAt),
    dispatchDurationMs: getElapsedMilliseconds(browserRequestedAt, browserDispatchedAt)
  });

  try {
    const browserResult = await browserPromise;
    console.log("Expo Web Browser closed:", {
      result: browserResult,
      openDurationMs: getElapsedMilliseconds(browserRequestedAt, performance.now()),
      totalElapsedMs: getElapsedMilliseconds(flowStartedAt, performance.now())
    });
  } catch (error: unknown) {
    console.error("Unable to open Expo Web Browser during timing test:", error);
  } finally {
    returnToScanner();
  };//try-catch ends

  await crawlPromise;
};//func ends

// Crawls the URL, completes its existing SQLite row, and synchronizes that UUID.
async function requestWebsiteCrawl(scanId: string, url: string, flowStartedAt: number): Promise<void> {
  const crawlStartedAt = performance.now();

  try {
    const apiUrl = apiSettings.getApiUrl({ path: "/app/scans/crawl_url" });
    const response = await Axios.post<CrawlApiResponse>(apiUrl.href, { url });
    const crawlReceivedAt = performance.now();

    console.log("Crawl4AI response received:", {
      crawlDurationMs: getElapsedMilliseconds(crawlStartedAt, crawlReceivedAt),
      totalElapsedMs: getElapsedMilliseconds(flowStartedAt, crawlReceivedAt),
      response: response.data
    });

    if (!response.data?.data) return;

    await waitForInitialScanSync(scanId);
    const scanUpdate = createWebsiteScanUpdate(url, response.data.data);
    await updateScan(scanId, scanUpdate);
    const didSync = await syncCompletedScanToAPI(scanId);
    console.log("Crawled website scan stored:", { id: scanId, syncStatus: didSync ? "synced" : "incomplete" });
  } catch (error: unknown) {
    console.error("Crawl4AI timing request failed:", {
      crawlDurationMs: getElapsedMilliseconds(crawlStartedAt, performance.now()),
      error
    });
  };//try-catch ends
};//func ends

// Builds the completion fields for the SQLite row created before website processing.
function createWebsiteScanUpdate(scannedUrl: string, crawlData: CrawlData): UpdateScanInput {
  const now = new Date().toISOString();

  return {
    updated_at: now,
    value: scannedUrl,
    input_url: crawlData.inputUrl.url || scannedUrl,
    final_url: crawlData.finalUrl?.url || null,
    type: "url",
    status: crawlData.status === "completed" ? "completed" : "failed",
    sync_status: "pending",
    metadata: crawlData
  };
};//func ends

// Returns one string when Expo Router supplies a scalar or array query value.
function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
};//func ends

// Accepts only absolute HTTP or HTTPS destinations after parsing the route value.
function getCleanWebsiteUrl(value: string): string | null {
  try {
    const parsedUrl = new URL(value.trim());
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? parsedUrl.href : null;
  } catch {
    return null;
  };//try-catch ends
};//func ends

// Calculates a timing duration rounded to two decimal places for readable logs.
function getElapsedMilliseconds(startedAt: number, endedAt: number): number {
  return Number(Math.max(0, endedAt - startedAt).toFixed(2));
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream.main
  }
});
