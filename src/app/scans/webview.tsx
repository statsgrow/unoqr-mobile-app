import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView, { type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";

import { LinkCheckOverlay } from "@/helpers/scans/components/LinkCheckOverlay";
import { getScanById } from "@/helpers/scans/db/getQueries";
import { syncCompletedScanToAPI, updateScan } from "@/helpers/scans/db/updateQueries";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type BrowserMetadataMessage = {
  finalUrl: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  canonicalUrl: string | null;
  logoUrl: string | null;
  contentType: string | null;
  isBotChallenge: boolean;
};

type ScanSecurityData = {
  status: "secure" | "insecure";
  isSecure: boolean;
  inputProtocol: "http:" | "https:" | null;
  finalProtocol: "http:" | "https:" | null;
  tlsValid: boolean | null;
  warning: string | null;
};

type ScanPreviewData = {
  id: string;
  inputUrl: string;
  finalUrl: string | null;
  title: string | null;
  description: string | null;
  siteName: string | null;
  canonicalUrl: string | null;
  logoUrl: string | null;
  mediaType: string | null;
  contentType: string | null;
  images: string[];
  favicons: string[];
  metadataSource: {
    title: "browser_page" | null;
    description: "browser_page" | null;
    logo: "browser_page" | null;
  };
  metadataStatus: "pending" | "resolved" | "partial";
  scan_to_final_duration: number | null;
  httpStatus: number | null;
  security: ScanSecurityData;
  error: null;
};

type MetadataBoxProps = {
  data: ScanPreviewData | null;
  emptyMessage: string;
  title: string;
};

/* ------------------ BREAK ------------------ */

const metadataDelay = 800;
const maximumMetadataAttempts = 10;
const maximumResolutionTime = 8_000;

/* ------------------ BREAK ------------------ */

// Resolves a scanned URL behind a loader, saves metadata locally, and hands off to Expo Web Browser.
export default function ScanWebViewScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    startedAt?: string | string[];
    url?: string | string[];
  }>();
  const scanId = getRouteParam(params.id);
  const inputUrl = getRouteParam(params.url);
  const scanStartedAtRef = useRef(getScanStartedAt(getRouteParam(params.startedAt)));
  const webViewRef = useRef<WebView>(null);
  const extractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolutionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extractionAttemptsRef = useRef(0);
  const finalizedRef = useRef(false);
  const automaticOpenRef = useRef(false);
  const currentUrlRef = useRef(inputUrl);
  const [currentUrl, setCurrentUrl] = useState(inputUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [isWebViewActive, setIsWebViewActive] = useState(true);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [initialData, setInitialData] = useState<ScanPreviewData | null>(
    scanId && inputUrl ? createInitialPreviewData(scanId, inputUrl) : null
  );
  const [finalData, setFinalData] = useState<ScanPreviewData | null>(null);

  // Loads the inserted SQLite row for the initial debug snapshot.
  useEffect(() => {
    if (!scanId || !inputUrl) return;

    let isMounted = true;

    void getScanById(scanId).then((storedScan) => {
      if (isMounted && storedScan) {
        setInitialData(createInitialPreviewData(storedScan.id, storedScan.value));
      };//if ends
    });

    return () => {
      isMounted = false;
    };
  }, [inputUrl, scanId]);

  // Clears delayed metadata extraction when the screen unmounts.
  useEffect(() => {
    return () => {
      if (extractionTimerRef.current) clearTimeout(extractionTimerRef.current);
      if (resolutionTimerRef.current) clearTimeout(resolutionTimerRef.current);
    };
  }, []);

  // Returns to the scanner or previous application route.
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    };//if ends

    router.replace("/scan");
  };//func ends

  // Opens the latest top-level destination using the retained Expo Web Browser flow.
  const handleOpenExternal = () => {
    if (!isSafeWebUrl(currentUrl)) return;
    void WebBrowser.openBrowserAsync(currentUrl);
  };//func ends

  // Tracks top-level redirects without persisting every intermediate destination.
  const handleNavigationChange = (navigation: WebViewNavigation) => {
    if (isSafeWebUrl(navigation.url)) {
      currentUrlRef.current = navigation.url;
      setCurrentUrl(navigation.url);
    };//if ends

    setIsLoading(navigation.loading);
  };//func ends

  // Schedules one bounded metadata read while redirects or browser challenges settle.
  const scheduleMetadataExtraction = () => {
    if (finalizedRef.current || extractionAttemptsRef.current >= maximumMetadataAttempts) return;
    if (extractionTimerRef.current) clearTimeout(extractionTimerRef.current);

    extractionAttemptsRef.current += 1;
    extractionTimerRef.current = setTimeout(() => {
      webViewRef.current?.injectJavaScript(buildMetadataExtractionScript());
    }, metadataDelay);
  };//func ends

  // Waits briefly after a load before asking the rendered page for metadata.
  const handleLoadEnd = () => {
    setIsLoading(false);
    scheduleMetadataExtraction();
  };//func ends

  // Opens the resolved destination once and returns to the scanner when the browser closes.
  const openResolvedDestination = async (value: string) => {
    if (automaticOpenRef.current) return;

    automaticOpenRef.current = true;

    try {
      await WebBrowser.openBrowserAsync(isSafeWebUrl(value) ? value : inputUrl);
    } catch (error: unknown) {
      console.error("Unable to open resolved scan in Expo Web Browser:", error);
    } finally {
      setShowLoadingOverlay(false);
      router.dismissTo("/scan");
    };//try-catch-finally ends
  };//func ends

  // Saves one final metadata snapshot and begins the Expo Web Browser handoff.
  const finalizeScan = async (metadata: BrowserMetadataMessage) => {
    if (finalizedRef.current || !scanId || !inputUrl) return;

    finalizedRef.current = true;
    if (extractionTimerRef.current) clearTimeout(extractionTimerRef.current);
    if (resolutionTimerRef.current) clearTimeout(resolutionTimerRef.current);
    webViewRef.current?.stopLoading();
    setIsWebViewActive(false);

    const durationSeconds = getDurationSeconds(scanStartedAtRef.current);
    const resolvedData = createFinalPreviewData(scanId, inputUrl, metadata, durationSeconds);
    const updatedAt = new Date().toISOString();

    await updateScan(scanId, {
      final_url: resolvedData.finalUrl,
      metadata: resolvedData,
      status: "completed",
      sync_status: "processing",
      updated_at: updatedAt
    });

    void syncCompletedScanToAPI(scanId);

    const resolvedUrl = resolvedData.finalUrl || currentUrlRef.current || inputUrl;
    currentUrlRef.current = resolvedUrl;
    setCurrentUrl(resolvedUrl);
    setFinalData(resolvedData);
    console.log("Stored scan after final WebView load:", await getScanById(scanId));
    await openResolvedDestination(resolvedUrl);
  };//func ends

  // Falls back to the latest known URL if WebView resolution does not finish promptly.
  useEffect(() => {
    if (!scanId || !inputUrl || !isSafeWebUrl(inputUrl)) return;

    resolutionTimerRef.current = setTimeout(() => {
      void finalizeScan(createFallbackMetadata(currentUrlRef.current || inputUrl));
    }, maximumResolutionTime);

    return () => {
      if (resolutionTimerRef.current) clearTimeout(resolutionTimerRef.current);
    };
  }, [inputUrl, scanId]);

  // Validates rendered metadata, updates SQLite, and freezes collection at the first landing page.
  const handleMetadataMessage = async (event: WebViewMessageEvent) => {
    if (finalizedRef.current || !scanId || !inputUrl) return;

    const metadata = parseMetadataMessage(event.nativeEvent.data);

    if (!metadata || !isSafeWebUrl(metadata.finalUrl)) return;

    const needsMoreTime = metadata.isBotChallenge || (!metadata.title && !metadata.description);

    if (needsMoreTime && extractionAttemptsRef.current < maximumMetadataAttempts) {
      scheduleMetadataExtraction();
      return;
    };//if ends

    const finalMetadata = metadata.isBotChallenge
      ? createFallbackMetadata(currentUrlRef.current || inputUrl)
      : metadata;

    await finalizeScan(finalMetadata);
  };//func ends

  if (!scanId || !inputUrl || !isSafeWebUrl(inputUrl)) {
    //Default Return
    return (
      <SafeAreaView style={styles.invalidScreen}>
        <StatusBar style="dark" />
        <MaterialCommunityIcons name="alert-circle-outline" size={42} color={colors.error.main} />
        <Text style={styles.invalidTitle}>Unable to open this scan</Text>
        <Text style={styles.invalidBody}>A valid HTTP or HTTPS destination was not provided.</Text>
        <Pressable onPress={handleClose} style={styles.invalidButton}>
          <Text style={styles.invalidButtonText}>Return to scanner</Text>
        </Pressable>
      </SafeAreaView>
    );//return ends
  };//if ends

  //Default Return
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable accessibilityLabel="Close web preview" onPress={handleClose} style={styles.headerButton}>
          <MaterialCommunityIcons name="close" size={24} color={colors.primary.main} />
        </Pressable>
        <View style={styles.addressWrap}>
          <MaterialCommunityIcons
            name={currentUrl.startsWith("https://") ? "lock-outline" : "lock-open-alert-outline"}
            size={16}
            color={currentUrl.startsWith("https://") ? colors.success.main : colors.warning.dark}
          />
          <Text numberOfLines={1} style={styles.addressText}>{getHostname(currentUrl)}</Text>
          {isLoading ? <ActivityIndicator size="small" color={colors.secondary.main} /> : null}
        </View>
        <Pressable
          accessibilityLabel="Open in external browser"
          onPress={handleOpenExternal}
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="open-in-new" size={22} color={colors.secondary.main} />
        </Pressable>
      </View>

      {isWebViewActive ? (
        <WebView
          ref={webViewRef}
          source={{ uri: inputUrl }}
          originWhitelist={["http://*", "https://*"]}
          mixedContentMode="never"
          javaScriptEnabled
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMetadataMessage}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={(request) => isSafeWebUrl(request.url)}
          style={styles.webView}
        />
      ) : (
        <View style={styles.closedPreview}>
          <MaterialCommunityIcons name="shield-check-outline" size={40} color={colors.success.main} />
          <Text style={styles.closedPreviewTitle}>Web preview closed</Text>
          <Text style={styles.closedPreviewBody}>The temporary resolver was removed after collecting metadata.</Text>
        </View>
      )}

      <ScrollView style={styles.debugPanel} contentContainerStyle={styles.debugContent}>
        <MetadataBox
          title="Initial SQLite load"
          data={initialData}
          emptyMessage="Waiting for the initial local row..."
        />
        <MetadataBox
          title="Final WebView load"
          data={finalData}
          emptyMessage="Waiting for the final URL and rendered metadata..."
        />
      </ScrollView>

      {showLoadingOverlay ? (
        <LinkCheckOverlay />
      ) : null}
    </SafeAreaView>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Displays one formatted metadata snapshot for development verification.
function MetadataBox({ data, emptyMessage, title }: MetadataBoxProps) {
  //Default Return
  return (
    <View style={styles.metadataBox}>
      <Text style={styles.metadataTitle}>{title}</Text>
      <Text selectable style={styles.metadataJson}>
        {data ? JSON.stringify(data, null, 2) : emptyMessage}
      </Text>
    </View>
  );//return ends
};//func ends

// Builds the pending API-shaped snapshot shown before the WebView resolves.
function createInitialPreviewData(id: string, inputUrl: string): ScanPreviewData {
  const inputProtocol = getWebProtocol(inputUrl);
  const isSecure = inputProtocol === "https:";

  return {
    id,
    inputUrl,
    finalUrl: null,
    title: null,
    description: null,
    siteName: null,
    canonicalUrl: null,
    logoUrl: null,
    mediaType: null,
    contentType: null,
    images: [],
    favicons: [],
    metadataSource: { title: null, description: null, logo: null },
    metadataStatus: "pending",
    scan_to_final_duration: null,
    httpStatus: null,
    security: {
      status: isSecure ? "secure" : "insecure",
      isSecure,
      inputProtocol,
      finalProtocol: null,
      tlsValid: isSecure ? true : null,
      warning: isSecure ? null : "This website does not use a secure HTTPS connection."
    },
    error: null
  };
};//func ends

// Builds the resolved API-shaped snapshot from metadata supplied by the rendered page.
function createFinalPreviewData(
  id: string,
  inputUrl: string,
  metadata: BrowserMetadataMessage,
  durationSeconds: number
): ScanPreviewData {
  const inputProtocol = getWebProtocol(inputUrl);
  const finalProtocol = getWebProtocol(metadata.finalUrl);
  const isSecure = finalProtocol === "https:";
  const metadataStatus = metadata.title && metadata.description ? "resolved" : "partial";

  return {
    id,
    inputUrl,
    finalUrl: metadata.finalUrl,
    title: metadata.title,
    description: metadata.description,
    siteName: metadata.siteName,
    canonicalUrl: metadata.canonicalUrl || metadata.finalUrl,
    logoUrl: metadata.logoUrl,
    mediaType: "website",
    contentType: metadata.contentType || "text/html",
    images: metadata.logoUrl ? [metadata.logoUrl] : [],
    favicons: metadata.logoUrl ? [metadata.logoUrl] : [],
    metadataSource: {
      title: metadata.title ? "browser_page" : null,
      description: metadata.description ? "browser_page" : null,
      logo: metadata.logoUrl ? "browser_page" : null
    },
    metadataStatus,
    scan_to_final_duration: durationSeconds,
    httpStatus: null,
    security: {
      status: isSecure ? "secure" : "insecure",
      isSecure,
      inputProtocol,
      finalProtocol,
      tlsValid: isSecure ? true : null,
      warning: isSecure ? null : "This website does not use a secure HTTPS connection."
    },
    error: null
  };
};//func ends

// Builds a partial landing result when resolution reaches its bounded wait limit.
function createFallbackMetadata(finalUrl: string): BrowserMetadataMessage {
  return {
    finalUrl,
    title: null,
    description: null,
    siteName: null,
    canonicalUrl: null,
    logoUrl: null,
    contentType: null,
    isBotChallenge: false
  };
};//func ends

// Creates the page script that posts browser-first metadata to React Native.
function buildMetadataExtractionScript() {
  return `
    (() => {
      const readContent = (selector) => document.querySelector(selector)?.getAttribute("content")?.trim() || null;
      const readHref = (selector) => document.querySelector(selector)?.href || null;
      const title = document.title?.trim() || readContent('meta[property="og:title"]');
      const description = readContent('meta[name="description" i]') || readContent('meta[property="og:description"]');
      const normalizedTitle = (title || "").toLowerCase();
      const challengeTitles = ["just a moment...", "checking your browser...", "attention required!", "access denied"];
      const payload = {
        finalUrl: window.location.href,
        title,
        description,
        siteName: readContent('meta[property="og:site_name"]'),
        canonicalUrl: readHref('link[rel="canonical"]'),
        logoUrl: readHref('link[rel~="icon"]') || readHref('link[rel="apple-touch-icon"]'),
        contentType: document.contentType || "text/html",
        isBotChallenge: challengeTitles.includes(normalizedTitle)
          || Boolean(document.querySelector('#challenge-running, #challenge-stage, form#challenge-form, .cf-challenge-running'))
      };

      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    })();
    true;
  `;
};//func ends

// Parses and bounds an untrusted metadata message from the current web page.
function parseMetadataMessage(value: string): BrowserMetadataMessage | null {
  try {
    const parsed = JSON.parse(value) as Partial<BrowserMetadataMessage>;

    if (typeof parsed.finalUrl !== "string") return null;

    return {
      finalUrl: parsed.finalUrl.slice(0, 4096),
      title: normalizeMetadataText(parsed.title, 500),
      description: normalizeMetadataText(parsed.description, 2000),
      siteName: normalizeMetadataText(parsed.siteName, 500),
      canonicalUrl: normalizeMetadataUrl(parsed.canonicalUrl),
      logoUrl: normalizeMetadataUrl(parsed.logoUrl),
      contentType: normalizeMetadataText(parsed.contentType, 200),
      isBotChallenge: parsed.isBotChallenge === true
    };
  } catch {
    return null;
  };//try-catch ends
};//func ends

// Normalizes a nullable metadata string and enforces a storage limit.
function normalizeMetadataText(value: unknown, maximumLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maximumLength) : null;
};//func ends

// Keeps only safe HTTP and HTTPS URLs received from page metadata.
function normalizeMetadataUrl(value: unknown): string | null {
  return typeof value === "string" && isSafeWebUrl(value) ? value.slice(0, 4096) : null;
};//func ends

// Returns the first route value when Expo Router supplies an array parameter.
function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
};//func ends

// Parses the QR detection timestamp supplied by the scanner route.
function getScanStartedAt(value: string): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : Date.now();
};//func ends

// Returns elapsed scan-to-final time rounded to three decimal places.
function getDurationSeconds(scanStartedAt: number): number {
  return Number((Math.max(0, Date.now() - scanStartedAt) / 1_000).toFixed(3));
};//func ends

// Returns whether a value is an absolute HTTP or HTTPS URL.
function isSafeWebUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  };//try-catch ends
};//func ends

// Reads a supported web protocol without throwing for malformed values.
function getWebProtocol(value: string): "http:" | "https:" | null {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" ? protocol : null;
  } catch {
    return null;
  };//try-catch ends
};//func ends

// Returns a compact host label for the native address bar.
function getHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream.main
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
    backgroundColor: colors.white.main
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.cream.main
  },
  addressWrap: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  addressText: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body2
  },
  webView: {
    flex: 1,
    backgroundColor: colors.white.main
  },
  closedPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.xl,
    backgroundColor: colors.white.main
  },
  closedPreviewTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h6,
    textAlign: "center"
  },
  closedPreviewBody: {
    maxWidth: 300,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    textAlign: "center"
  },
  debugPanel: {
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: colors.border.main,
    backgroundColor: colors.cream.main
  },
  debugContent: {
    gap: spacing.sm,
    padding: spacing.sm
  },
  metadataBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  metadataTitle: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle2
  },
  metadataJson: {
    color: colors.primary.main,
    fontFamily: fontFamilies.mono,
    fontSize: 11,
    lineHeight: 16
  },
  invalidScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.cream.main
  },
  invalidTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h6
  },
  invalidBody: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    textAlign: "center"
  },
  invalidButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.main
  },
  invalidButtonText: {
    color: colors.white.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.button
  }
});

/* ------------------ BREAK ------------------ */
