import { useCallback, useEffect, useRef } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { colors } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

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
    void runWebsiteFlow(websiteUrl, returnToScanner);
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

// Opens Expo Web Browser without coupling navigation to the recurring crawl process.
async function runWebsiteFlow(url: string, returnToScanner: ReturnToScanner): Promise<void> {
  const flowStartedAt = performance.now();
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
