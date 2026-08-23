import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text } from "react-native-paper";

import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { getScanById } from "@/helpers/scans/db/getQueries";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

type ScanDetailState = {
  record: ScanRecord | null;
  loading: boolean;
  error: string | null;
};

type DetailSectionProps = {
  children: React.ReactNode;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
};

type DetailRowProps = {
  label: string;
  value: string | number | boolean | null | undefined;
};

/* ------------------ BREAK ------------------ */

// Shows every locally collected field for one saved scan.
export default function ScanDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const scanId = getRouteParam(params.id);
  const [detailState, setDetailState] = useState<ScanDetailState>({
    record: null,
    loading: true,
    error: null
  });

  // Reloads the local scan whenever this detail route receives focus.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      if (!scanId) {
        setDetailState({ record: null, loading: false, error: "This scan ID is invalid." });
        return () => {
          isMounted = false;
        };
      };//if ends

      setDetailState((currentState) => ({ ...currentState, loading: true, error: null }));

      void getScanById(scanId).then((record) => {
        if (!isMounted) return;

        setDetailState({
          record,
          loading: false,
          error: record ? null : "This scan could not be found on this device."
        });
      });

      return () => {
        isMounted = false;
      };
    }, [scanId])
  );

  const { record } = detailState;
  const metadata = record?.metadata ?? null;

  //Default Return
  return (
    <GeneralLayout
      topView={<ScanDetailHeader />}
      hideBottomMenu
      contentContainerStyle={styles.layoutContent}
      bodyStyle={styles.layoutBody}
    >
      {detailState.loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.secondary.main} />
          <Text style={styles.stateText}>Loading collected scan data…</Text>
        </View>
      ) : record ? (
        <View style={styles.screen}>
          <ScanSummary record={record} />

          <DetailSection icon="link-variant" title="Destinations">
            <DetailRow label="Input URL" value={record.input_url} />
            <DetailRow label="Final URL" value={record.final_url} />
            <DetailRow label="Canonical URL" value={metadata?.canonicalUrl} />
          </DetailSection>

          <DetailSection icon="text-box-search-outline" title="Page metadata">
            <DetailRow label="Browser title" value={metadata?.title} />
            <DetailRow label="Description" value={metadata?.description} />
            <DetailRow label="Site name" value={metadata?.siteName} />
            <DetailRow label="Logo URL" value={metadata?.logoUrl} />
            <DetailRow label="Media type" value={metadata?.mediaType} />
            <DetailRow label="Content type" value={metadata?.contentType} />
            <DetailRow label="Metadata status" value={metadata?.metadataStatus} />
          </DetailSection>

          <DetailSection icon="shield-check-outline" title="Security">
            <DetailRow label="Security status" value={metadata?.security.status} />
            <DetailRow label="Secure HTTPS" value={metadata?.security.isSecure} />
            <DetailRow label="Input protocol" value={metadata?.security.inputProtocol} />
            <DetailRow label="Final protocol" value={metadata?.security.finalProtocol} />
          </DetailSection>

          <DetailSection icon="timer-outline" title="Scan timing">
            <DetailRow
              label="Scan to final URL"
              value={formatDuration(metadata?.scan_to_final_duration ?? null)}
            />
            <DetailRow label="Created" value={formatDate(record.created_at)} />
            <DetailRow label="Updated" value={formatDate(record.updated_at)} />
          </DetailSection>

          <DetailSection icon="database-outline" title="Stored record">
            <DetailRow label="Scan ID" value={record.id} />
            <DetailRow label="Type" value={record.type} />
            <DetailRow label="Status" value={record.status} />
            <DetailRow label="Sync status" value={record.sync_status} />
            <DetailRow label="User IP" value={record.user_ip} />
            <DetailRow label="Location" value={formatLocation(record.location)} />
            <DetailRow label="Latitude" value={record.location?.latitude} />
            <DetailRow label="Longitude" value={record.location?.longitude} />
            <DetailRow label="User ID" value={record.user_id} />
            <DetailRow label="Website ID" value={record.website_id} />
            <DetailRow label="Install ID" value={record.install_id} />
          </DetailSection>

          <DetailSection icon="code-json" title="Raw metadata snapshot">
            <Text selectable style={styles.rawMetadata}>
              {formatMetadataJson(record.metadata)}
            </Text>
          </DetailSection>
        </View>
      ) : (
        <View style={styles.centerState}>
          <MaterialCommunityIcons
            name="database-alert-outline"
            size={44}
            color={colors.error.main}
          />
          <Text style={styles.errorTitle}>Scan unavailable</Text>
          <Text style={styles.stateText}>{detailState.error}</Text>
          <Pressable onPress={goToScansList} style={styles.returnButton}>
            <Text style={styles.returnButtonText}>Return to My Scans</Text>
          </Pressable>
        </View>
      )}
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders a dedicated back header for the scan detail route.
function ScanDetailHeader() {
  //Default Return
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Back to My Scans"
        accessibilityRole="button"
        onPress={goToScansList}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary.main} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.eyebrow}>MY SCANS</Text>
        <Text style={styles.headerTitle}>Collected data</Text>
      </View>
    </View>
  );//return ends
};//func ends

// Renders the scan identity, logo, completion state, and security state.
function ScanSummary({ record }: { record: ScanRecord }) {
  const metadata = record.metadata;
  const logoUrl = getSafeWebUrl(metadata?.logoUrl ?? null);
  const isSecure = metadata?.security.isSecure === true;

  //Default Return
  return (
    <View style={styles.summaryCard}>
      <View style={styles.logoShell}>
        {logoUrl ? (
          <Image resizeMode="contain" source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <MaterialCommunityIcons name="web" size={34} color={colors.secondary.main} />
        )}
      </View>
      <View style={styles.summaryContent}>
        <Text numberOfLines={2} style={styles.summaryTitle}>
          {metadata?.title || getHostname(metadata?.finalUrl || record.value)}
        </Text>
        <Text numberOfLines={1} style={styles.summarySite}>
          {metadata?.siteName || getHostname(metadata?.finalUrl || record.value)}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{formatStatus(record.status || "pending")}</Text>
          </View>
          <View style={[styles.securityBadge, !isSecure && styles.insecureBadge]}>
            <MaterialCommunityIcons
              name={isSecure ? "lock-outline" : "lock-open-alert-outline"}
              size={14}
              color={isSecure ? colors.success.dark : colors.warning.dark}
            />
            <Text style={[styles.securityBadgeText, !isSecure && styles.insecureBadgeText]}>
              {isSecure ? "Secure HTTPS" : "Not secure"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );//return ends
};//func ends

// Groups related collected scan fields inside one card.
function DetailSection({ children, icon, title }: DetailSectionProps) {
  //Default Return
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeading}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.secondary.main} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );//return ends
};//func ends

// Displays one collected field with a consistent missing-value fallback.
function DetailRow({ label, value }: DetailRowProps) {
  //Default Return
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{formatDetailValue(value)}</Text>
    </View>
  );//return ends
};//func ends

// Returns to the existing scan list route or opens it as a fallback.
function goToScansList() {
  router.dismissTo("/scans/list");
};//func ends

// Converts an Expo route parameter into one string value.
function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
};//func ends

// Formats any supported stored value while distinguishing false and zero from missing data.
function formatDetailValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not collected";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};//func ends

// Formats scan duration in seconds for a human-readable field.
function formatDuration(value: number | null): string {
  return value === null ? "Not collected" : `${value.toFixed(3)} seconds`;
};//func ends

// Formats a stored ISO timestamp using the device locale.
function formatDate(value: string | null): string {
  if (!value) return "Not collected";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};//func ends

// Pretty-prints the stored API-shaped metadata snapshot when valid JSON is available.
function formatMetadataJson(value: ScanRecord["metadata"]): string {
  if (!value) return "Not collected";
  return JSON.stringify(value, null, 2);
};//func ends

// Produces a readable host from a stored destination.
function getHostname(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "") || value;
  } catch {
    return value;
  };//try-catch ends
};//func ends

// Combines structured location fields into a readable value.
function formatLocation(location: ScanRecord["location"]): string | null {
  if (!location) return null;

  const parts = [location.city, location.state, location.country, location.pincode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
};//func ends

// Accepts only HTTP and HTTPS image URLs before passing them to React Native Image.
function getSafeWebUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? value : null;
  } catch {
    return null;
  };//try-catch ends
};//func ends

// Converts a stored status value into a readable label.
function formatStatus(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  layoutContent: {
    backgroundColor: colors.cream.main
  },
  layoutBody: {
    flex: 1
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
    backgroundColor: colors.white.main
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.cream.main
  },
  pressed: {
    opacity: 0.65
  },
  headerText: {
    flex: 1
  },
  eyebrow: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    letterSpacing: 1.5
  },
  headerTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h6
  },
  screen: {
    gap: spacing.md,
    padding: spacing.lg
  },
  centerState: {
    minHeight: 440,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl
  },
  stateText: {
    maxWidth: 300,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    textAlign: "center"
  },
  errorTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h6
  },
  returnButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.main
  },
  returnButtonText: {
    color: colors.secondary.contrast,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.button
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  logoShell: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.light
  },
  logo: {
    width: 54,
    height: 54
  },
  summaryContent: {
    minWidth: 0,
    flex: 1
  },
  summaryTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  summarySite: {
    marginTop: spacing.xxs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm
  },
  statusBadge: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  statusBadgeText: {
    color: colors.secondary.dark,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: `${colors.success.main}18`
  },
  insecureBadge: {
    backgroundColor: `${colors.warning.main}1F`
  },
  securityBadgeText: {
    color: colors.success.dark,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  insecureBadgeText: {
    color: colors.warning.dark
  },
  sectionCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.cream.main
  },
  sectionTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  sectionBody: {
    paddingHorizontal: spacing.md
  },
  detailRow: {
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light
  },
  detailLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  detailValue: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2
  },
  rawMetadata: {
    paddingVertical: spacing.md,
    color: colors.primary.light,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption
  }
});
