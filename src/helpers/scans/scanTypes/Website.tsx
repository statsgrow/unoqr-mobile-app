import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Chip, IconButton, Text } from "react-native-paper";

import { getScanById } from "@/helpers/scans/db/getQueries";
import type { ScanUrlMetadata } from "@/helpers/scans/db/init";
import type { StoredScanReference } from "@/helpers/scans/db/persistScan";
import { getFileTypeLabel } from "@/helpers/scans/identifiers/File";
import { getScanCrawlError } from "@/helpers/scans/status";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

type WebsiteProps = {
  record: ScanRecord;
};

type UrlCardProps = {
  label: string;
  protocol: "http:" | "https:" | null | undefined;
  url: string | null | undefined;
  verificationFailed?: boolean;
};

/* ------------------ BREAK ------------------ */

// Renders URL or file metadata with the collected destination links.
export function Website({ record }: WebsiteProps) {
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const metadata = record.metadata;
  const isFile = record.type === "file";
  const crawlError = getScanCrawlError(record.crawl_status, metadata?.error);
  const finalUrl = record.final_url || getMetadataUrl(metadata?.finalUrl);
  const startUrl = record.input_url || getMetadataUrl(metadata?.inputUrl) || record.value;
  const faviconUrl = getSafeWebUrl(
    getMetadataFavicons(metadata?.finalUrl)[0] || metadata?.favicons?.[0] || metadata?.logoUrl || null
  );
  const title = metadata?.title || getHostname(finalUrl || startUrl);
  const description = metadata?.description || (isFile || crawlError ? null : "No description was collected for this website.");
  const fileType = isFile ? getFileTypeLabel(metadata?.contentType, finalUrl || startUrl) : null;
  const timestamp = formatScanTimestamp(record.created_at);
  const showStartUrl = !areSameWebUrls(startUrl, finalUrl);

  //Default Return
  return (
    <View style={styles.container}>
      <View style={styles.websiteCard}>
        <View style={styles.titleRow}>
          <View style={styles.faviconShell}>
            {!isFile && faviconUrl ? (
              <Image resizeMode="contain" source={{ uri: faviconUrl }} style={styles.favicon} />
            ) : (
              <MaterialCommunityIcons name={isFile ? "file-outline" : "web"} size={22} color={colors.primary.main} />
            )}
          </View>
          <View style={styles.titleContent}>
            <Text numberOfLines={showFullTitle ? undefined : 2} style={styles.title}>
              {title}
            </Text>
            <Pressable onPress={() => setShowFullTitle((currentValue) => !currentValue)}>
              <Text style={styles.moreText}>{showFullTitle ? "Less" : "More"}</Text>
            </Pressable>
          </View>
        </View>

        {isFile ? (
          <View style={styles.fileDetails}>
            <Text style={styles.fileDetailLabel}>File type</Text>
            <Text style={styles.fileDetailValue}>{fileType}</Text>
            {metadata?.contentType ? (
              <Text selectable style={styles.fileMimeType}>{metadata.contentType}</Text>
            ) : null}
          </View>
        ) : description ? (
          <View style={styles.descriptionBlock}>
            <Text numberOfLines={showFullDescription ? undefined : 2} style={styles.description}>
              {description}
            </Text>
            <Pressable onPress={() => setShowFullDescription((currentValue) => !currentValue)}>
              <Text style={styles.moreText}>{showFullDescription ? "Less" : "More"}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.timestampRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.mute.main} />
          <Text style={styles.timestamp}>{timestamp.date}</Text>
          <View style={styles.timestampDot} />
          <Text style={styles.timestamp}>{timestamp.time}</Text>
        </View>
      </View>

      {crawlError ? (
        <View style={styles.crawlErrorCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.error.main} />
          <View style={styles.crawlErrorContent}>
            <Text style={styles.crawlErrorTitle}>Could not collect link details</Text>
            <Text selectable style={styles.crawlErrorMessage}>{crawlError}</Text>
          </View>
        </View>
      ) : null}

      {showStartUrl ? (
        <UrlCard
          label="Start URL"
          protocol={getMetadataProtocol(metadata?.inputUrl) || metadata?.security?.inputProtocol}
          url={startUrl}
          verificationFailed={Boolean(crawlError)}
        />
      ) : null}
      <UrlCard
        label={crawlError ? "Scanned URL" : "Final URL"}
        protocol={getMetadataProtocol(metadata?.finalUrl) || metadata?.security?.finalProtocol}
        url={finalUrl}
        verificationFailed={Boolean(crawlError)}
      />
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Routes an already stored website scan to the crawl-and-browser page with its UUID.
export async function processWebsiteScan(scan: StoredScanReference): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  router.push({
    pathname: "/scans/website",
    params: { id: scan.id, u: scan.value }
  });
};//export ends

/* ------------------ BREAK ------------------ */

// Renders one scanned URL with its own protocol security chip.
function UrlCard({ label, protocol, url, verificationFailed = false }: UrlCardProps) {
  const isSecure = protocol === "https:" || getProtocol(url) === "https:";
  const safeUrl = getSafeWebUrl(url || null);

  //Default Return
  return (
    <View style={styles.urlSection}>
      <Text style={styles.urlLabel}>{label}</Text>
      <View style={[styles.urlCard, !safeUrl && styles.disabledUrlCard]}>
        <Pressable
          accessibilityLabel={`Open ${label}`}
          accessibilityRole="link"
          disabled={!safeUrl}
          onPress={() => void openUrl(safeUrl)}
          style={({ pressed }) => [styles.urlOpenArea, pressed && styles.pressedUrlArea]}
        >
          <Text ellipsizeMode="middle" numberOfLines={1} style={styles.urlValue}>
            {url || "Not collected"}
          </Text>
        </Pressable>
        <IconButton
          accessibilityLabel={`Copy ${label}`}
          disabled={!safeUrl}
          icon="content-copy"
          iconColor={safeUrl ? colors.primary.light : colors.mute.light}
          onPress={() => void copyUrl(safeUrl)}
          size={18}
          style={styles.copyButton}
        />
        <Chip
          compact
          icon={verificationFailed ? "alert-circle-outline" : isSecure ? "lock-outline" : "lock-open-alert-outline"}
          style={[styles.securityChip, isSecure && !verificationFailed ? styles.secureChip : styles.insecureChip]}
          textStyle={[styles.securityChipText, isSecure && !verificationFailed ? styles.secureText : styles.insecureText]}
        >
          {verificationFailed ? "Not verified" : isSecure ? "Secure" : "Not secure"}
        </Chip>
        <Pressable
          accessibilityLabel={`Open ${label}`}
          accessibilityRole="link"
          disabled={!safeUrl}
          onPress={() => void openUrl(safeUrl)}
          style={styles.chevronButton}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={safeUrl ? colors.secondary.main : colors.mute.light}
          />
        </Pressable>
      </View>
    </View>
  );//return ends
};//func ends

// Reads a URL string from legacy metadata or the current structured crawl URL object.
function getMetadataUrl(value: string | ScanUrlMetadata | null | undefined): string | null {
  return typeof value === "string" ? value : value?.url || null;
};//func ends

// Reads the protocol stored with a structured Crawl4AI URL result.
function getMetadataProtocol(
  value: string | ScanUrlMetadata | null | undefined
): "http:" | "https:" | null {
  return typeof value === "object" && value ? value.protocol : null;
};//func ends

// Reads favicons stored on the final structured Crawl4AI URL result.
function getMetadataFavicons(value: string | ScanUrlMetadata | null | undefined): string[] {
  return typeof value === "object" && value ? value.favicons : [];
};//func ends

// Copies one stored URL without opening it or starting scan collection.
async function copyUrl(url: string | null): Promise<void> {
  if (!url) return;
  await Clipboard.setStringAsync(url);
};//func ends

// Reopens one stored URL without starting scan collection or metadata processing.
async function openUrl(url: string | null): Promise<void> {
  if (!url) return;

  try {
    await WebBrowser.openBrowserAsync(url);
  } catch (error: unknown) {
    console.error("Unable to reopen stored scan URL:", error);
  };//try-catch ends
};//func ends

// Returns an HTTP(S) favicon URL that can be passed to React Native Image.
function getSafeWebUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? value : null;
  } catch {
    return null;
  };//try-catch ends
};//func ends

// Returns the HTTP(S) protocol from one stored URL.
function getProtocol(value: string | null | undefined): "http:" | "https:" | null {
  if (!value) return null;

  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" ? protocol : null;
  } catch {
    return null;
  };//try-catch ends
};//func ends

// Compares normalized web destinations so identical start/final cards are not repeated.
function areSameWebUrls(firstUrl: string | null, secondUrl: string | null): boolean {
  if (!firstUrl || !secondUrl) return false;

  try {
    return new URL(firstUrl).href === new URL(secondUrl).href;
  } catch {
    return firstUrl.trim() === secondUrl.trim();
  };//try-catch ends
};//func ends

// Produces a readable hostname fallback when a website title is unavailable.
function getHostname(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "") || value;
  } catch {
    return value;
  };//try-catch ends
};//func ends

// Formats the scan timestamp into separate local date and time values.
function formatScanTimestamp(value: string): { date: string; time: string } {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) return { date: value, time: "" };

  return {
    date: timestamp.toLocaleDateString(),
    time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  websiteCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  faviconShell: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.neutral.light,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  favicon: {
    width: 26,
    height: 26
  },
  titleContent: {
    minWidth: 0,
    flex: 1
  },
  title: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1,
    lineHeight: 22
  },
  descriptionBlock: {
    gap: spacing.xxs
  },
  crawlErrorCard: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  crawlErrorContent: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xxs
  },
  crawlErrorTitle: {
    color: colors.error.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body2
  },
  crawlErrorMessage: {
    color: colors.primary.light,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2
  },
  fileDetails: {
    gap: spacing.xxs
  },
  fileDetailLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  fileDetailValue: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body2
  },
  fileMimeType: {
    color: colors.mute.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption
  },
  description: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: 20
  },
  moreText: {
    alignSelf: "flex-start",
    color: colors.secondary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light
  },
  timestamp: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  timestampDot: {
    width: 3,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.mute.light
  },
  urlSection: {
    gap: spacing.xs
  },
  urlLabel: {
    paddingHorizontal: spacing.xs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  urlCard: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  urlOpenArea: {
    minWidth: 0,
    flex: 1,
    justifyContent: "center"
  },
  pressedUrlArea: {
    opacity: 0.65
  },
  copyButton: {
    margin: 0
  },
  securityChip: {
    minHeight: 30,
    alignSelf: "center"
  },
  secureChip: {
    backgroundColor: `${colors.success.main}18`
  },
  insecureChip: {
    backgroundColor: `${colors.warning.main}1F`
  },
  securityChipText: {
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  secureText: {
    color: colors.success.dark
  },
  insecureText: {
    color: colors.warning.dark
  },
  urlValue: {
    minWidth: 0,
    color: colors.primary.light,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption,
    lineHeight: 18
  },
  chevronButton: {
    width: 28,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  disabledUrlCard: {
    opacity: 0.6
  }
});
