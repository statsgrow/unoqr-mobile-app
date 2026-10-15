import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ContactRound, Globe2, Phone, QrCode as QrCodeIcon, Type, type LucideIcon } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { Text } from "react-native-paper";

import { PxIcon, type PxIconName } from "@/components/elements/PxIcon";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { redirect } from "@/utils/general/Redirect";
import { PxCard } from "@/components/elements/PxCard";
import { UpiPaymentIcon } from "@/helpers/scans/components/UpiPaymentIcon";
import { getAllScans } from "@/helpers/scans/db/getQueries";
import { getAllQrCodes } from "@/helpers/qrcodes/db/getQr";
import type { QrCode } from "@/helpers/qrcodes/db/initQrCodes";
import type { QrContentType } from "@/helpers/qrcodes/create/QrContent";
import { getScanTypeInit, normalizeScanType } from "@/helpers/scans/identifiers";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = Awaited<ReturnType<typeof getAllScans>>[number];
type ActivityTab = "scans" | "qrcodes";
type HomeAnalyticsProps = { topContent?: ReactNode };

type ScanTypeSummary = {
  type: string;
  label: string;
  count: number;
  percentage: number;
  icon: PxIconName;
  color: string;
  backgroundColor: string;
};

type TypeCardProps = {
  summary: ScanTypeSummary;
};

type TypePalette = {
  color: string;
  backgroundColor: string;
};

/* ------------------ BREAK ------------------ */

const patternLines = Array.from({ length: 24 }, (_, index) => index);
const maximumVisibleTypes = 4;
const maximumRecentScans = 10;
const qrActivityTypes: Record<QrContentType, { label: string; Icon: LucideIcon }> = {
  website: { label: "Website", Icon: Globe2 },
  vcard: { label: "vCard", Icon: ContactRound },
  phone: { label: "Phone", Icon: Phone },
  text: { label: "Text", Icon: Type }
};
const typePalettes: TypePalette[] = [
  {
    color: colors.secondary.main,
    backgroundColor: colors.secondary.light
  },
  {
    color: colors.info.main,
    backgroundColor: "#EAF2FF"
  },
  {
    color: colors.success.dark,
    backgroundColor: "#E8F7ED"
  },
  {
    color: colors.warning.dark,
    backgroundColor: "#FFF3DE"
  }
];

/* ------------------ BREAK ------------------ */

// Displays a compact single-screen summary of the user's QR scan activity.
export function HomeAnalytics({ topContent }: HomeAnalyticsProps) {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [qrRecords, setQrRecords] = useState<QrCode[]>([]);
  const [activityTab, setActivityTab] = useState<ActivityTab>("scans");
  const [loading, setLoading] = useState(true);

  // Reloads SQLite activity whenever the home route becomes active.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      setLoading(true);
      void Promise.all([getAllScans(), getAllQrCodes()])
        .then(([storedRecords, storedQrRecords]) => {
          if (!isMounted) return;
          setRecords(storedRecords);
          setQrRecords(storedQrRecords);
        })
        .catch((error: unknown) => {
          console.error("Unable to load home scan analytics:", error);
          if (isMounted) {
            setRecords([]);
            setQrRecords([]);
          };//if ends
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const typeSummaries = useMemo(() => createTypeSummaries(records), [records]);
  const visibleTypeSummaries = typeSummaries.slice(0, maximumVisibleTypes);
  const totalScans = records.length;
  const recentScans = useMemo(() => createRecentScans(records), [records]);
  const recentQrCodes = useMemo(() => selectRecentActivity(qrRecords), [qrRecords]);
  const hasRecentActivity = activityTab === "scans" ? recentScans.length > 0 : recentQrCodes.length > 0;

  //Default Return
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.root}
    >
      {topContent}
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.heading}>Scan overview</Text>
        </View>
        <View style={styles.periodPill}>
          <Text style={styles.periodText}>All time</Text>
        </View>
      </View>

      <PxCard padded={false} style={styles.totalCard} contentStyle={styles.totalCardContent}>
        <ScanCardPattern />

        <View style={styles.totalIconWrap}>
          <PxIcon name="qrcode-scan" size={28} color={colors.white.main} />
        </View>

        <View style={styles.totalCopy}>
          <Text style={styles.totalLabel}>Total scans</Text>
          <Text style={styles.totalValue}>{totalScans}</Text>
        </View>

      </PxCard>

      <View style={styles.typeHeadingRow}>
        <Text style={styles.typeHeading}>By Type</Text>
        <Text style={styles.typeCaption}>
          {typeSummaries.length} {typeSummaries.length === 1 ? "type" : "types"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingTypes}>
          <PxCircularProgress size={20} color={colors.secondary.main} />
          <Text style={styles.emptyMessage}>Loading scan types…</Text>
        </View>
      ) : visibleTypeSummaries.length > 0 ? (
        <>
          <View style={styles.typeGrid}>
            {visibleTypeSummaries.map((summary) => (
              <TypeCard key={summary.type} summary={summary} />
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyTypes}>
          <View style={styles.emptyIcon}>
            <PxIcon name="qrcode-scan" size={28} color={colors.secondary.main} />
          </View>
          <Text style={styles.emptyTitle}>No scans available</Text>
          <Text style={styles.emptyMessage}>Start scanning to see magic</Text>
        </View>
      )}

      <View style={styles.recentSection}>
        <View style={styles.recentHeadingRow}>
          <Text style={styles.recentHeading}>Recent Activity</Text>
          {hasRecentActivity ? (
            <Pressable onPress={() => redirect("push", activityTab === "scans" ? "/scans/list" : "/qrcodes/list")}>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          ) : null}
        </View>

        <View accessibilityRole="tablist" style={styles.activityTabs}>
          {(["scans", "qrcodes"] as const).map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: activityTab === tab }}
              onPress={() => setActivityTab(tab)}
              style={[styles.activityTab, activityTab === tab && styles.activityTabSelected]}
            >
              <Text style={[styles.activityTabText, activityTab === tab && styles.activityTabTextSelected]}>
                {tab === "scans" ? "Scans" : "Qr Codes"}
              </Text>
            </Pressable>
          ))}
        </View>

        {hasRecentActivity ? (
          <View style={styles.recentList}>
            {activityTab === "scans" ? recentScans.map((record) => (
              <RecentScanCard key={record.id} record={record} />
            )) : recentQrCodes.map((record) => (
              <RecentQrCard key={record.id} record={record} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyRecentScans}>
            <Text style={styles.emptyMessage}>{activityTab === "scans" ? "No recent scans yet" : "No recent QR codes yet"}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Draws the UnoQR woven lines and soft radial glows behind the scan total.
function ScanCardPattern() {
  //Default Return
  return (
    <View pointerEvents="none" style={styles.totalPattern}>
      <View style={styles.orangeGlowLarge} />
      <View style={styles.orangeGlowSmall} />
      <View style={styles.whiteGlow} />
      {patternLines.map((lineIndex) => (
        <View
          key={`orange-${lineIndex}`}
          style={[styles.patternLine, styles.orangePatternLine, { left: lineIndex * 24 - 180 }]}
        />
      ))}
      {patternLines.map((lineIndex) => (
        <View
          key={`ink-${lineIndex}`}
          style={[styles.patternLine, styles.inkPatternLine, { left: lineIndex * 31 - 180 }]}
        />
      ))}
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Renders one recent SQLite scan with its type, title, timestamp, and detail action.
function RecentScanCard({ record }: { record: ScanRecord }) {
  const typeInit = getScanTypeInit(record.type);
  const title = getRecentScanTitle(record, typeInit.label);
  const isUpiPayment = record.type === "upi_payment" || /^upi:\/\/pay(?:\?|$)/i.test(record.value);

  //Default Return
  return (
    <Pressable
      accessibilityLabel={`Open recent scan ${title}`}
      accessibilityRole="button"
      onPress={() => redirect("push", `/scans/${record.id}/view`)}
      style={({ pressed }) => [styles.recentCard, pressed && styles.recentCardPressed]}
    >
      {isUpiPayment ? (
        <UpiPaymentIcon size={42} />
      ) : (
        <View style={styles.recentIcon}>
          <PxIcon name={typeInit.icon} size={21} color={colors.primary.main} />
        </View>
      )}
      <View style={styles.recentContent}>
        <Text numberOfLines={1} style={styles.recentTitle}>{title}</Text>
        <Text style={styles.recentTimestamp}>{formatRecentScanDate(record.updated_at || record.created_at)}</Text>
      </View>
      <PxIcon name="chevron-right" size={21} color={colors.mute.light} />
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Selects the newest saved scans for the compact home activity list.
function createRecentScans(records: ScanRecord[]): ScanRecord[] {
  return selectRecentActivity(records);
};//func ends

// Renders a recently updated QR with its saved name, timestamp and edit action.
function RecentQrCard({ record }: { record: QrCode }) {
  const typeInfo = record.content_type ? qrActivityTypes[record.content_type] : { label: "Draft", Icon: QrCodeIcon };
  const title = record.name || typeInfo.label;
  const Icon = typeInfo.Icon;
  //Default Return
  return (
    <Pressable
      accessibilityLabel={`Edit recent QR ${title}`}
      accessibilityRole="button"
      onPress={() => redirect("push", { pathname: "/qrcodes/create", params: { id: record.id } })}
      style={({ pressed }) => [styles.recentCard, pressed && styles.recentCardPressed]}
    >
      <View style={styles.recentIcon}><Icon size={24} strokeWidth={1.25} color={colors.primary.main} /></View>
      <View style={styles.recentContent}>
        <Text numberOfLines={1} style={styles.recentTitle}>{title}</Text>
        <Text style={styles.recentTimestamp}>{typeInfo.label} · {formatRecentScanDate(record.updated_at || record.created_at)}</Text>
      </View>
      <PxIcon name="chevron-right" size={21} color={colors.mute.light} />
    </Pressable>
  );//return ends
};//func ends

// Selects the ten most recently updated records, using creation time for older rows without updates.
function selectRecentActivity<T extends { created_at: string; updated_at?: string | null }>(records: T[]): T[] {
  return [...records].sort((first, second) =>
    new Date(second.updated_at || second.created_at).getTime() - new Date(first.updated_at || first.created_at).getTime()
  ).slice(0, maximumRecentScans);
};//func ends

// Resolves a readable recent-scan title without exposing the full database row.
function getRecentScanTitle(record: ScanRecord, fallbackLabel: string): string {
  if (record.metadata?.title) return record.metadata.title;

  if (normalizeScanType(record.type) === "url") {
    return getRecentWebsiteTitle(record.final_url || record.input_url || record.value);
  };//if ends

  return fallbackLabel;
};//func ends

// Extracts a compact website host when crawl metadata has no title.
function getRecentWebsiteTitle(value: string): string {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.hostname.replace(/^www\./, "") || value;
  } catch {
    return value;
  };//try-catch ends
};//func ends

// Formats a recent scan timestamp using the device locale.
function formatRecentScanDate(value: string): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(timestamp);
};//func ends

/* ------------------ BREAK ------------------ */

// Displays one SQLite scan type's count and proportional activity.
function TypeCard({ summary }: TypeCardProps) {
  //Default Return
  return (
    <PxCard
      padded={false}
      bordered
      onPress={() => redirect("push", { pathname: "/scans/list", params: { type: summary.type } })}
      style={styles.typeCard}
      contentStyle={styles.typeCardContent}
    >
      <View style={styles.typeTopRow}>
        {summary.type === "upi_payment" ? (
          <UpiPaymentIcon size={46} backgroundColor={colors.cream.main} />
        ) : (
          <View style={styles.typeIconWrap}>
            <PxIcon name={summary.icon} size={24} color={colors.secondary.main} />
          </View>
        )}
        <Text style={styles.typePercentage}>{summary.percentage}%</Text>
      </View>

      <Text style={styles.typeValue}>{summary.count}</Text>
      <Text numberOfLines={1} style={styles.typeLabel}>{summary.label}</Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${summary.percentage}%`, backgroundColor: colors.primary.main }
          ]}
        />
      </View>
    </PxCard>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Groups saved SQLite rows by their normalized scan type and ranks them by count.
function createTypeSummaries(records: ScanRecord[]): ScanTypeSummary[] {
  const countsByType = new Map<string, number>();

  records.forEach((record) => {
    const scanType = normalizeScanType(record.type);
    countsByType.set(scanType, (countsByType.get(scanType) || 0) + 1);
  });

  return [...countsByType.entries()]
    .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])
    .map(([type, count], index) => {
      const typeInit = getScanTypeInit(type);
      const palette = typePalettes[index % typePalettes.length];

      return {
        type,
        label: typeInit.label,
        count,
        percentage: records.length > 0 ? Math.round((count / records.length) * 100) : 0,
        icon: typeInit.icon,
        color: palette.color,
        backgroundColor: palette.backgroundColor
      };
    });
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.cream.main
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  headingCopy: {
    gap: spacing.xxs
  },
  heading: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h5,
    lineHeight: 28
  },
  periodPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.white.main
  },
  periodText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  totalCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.neutral.light,
    borderRadius: radii.xl,
    backgroundColor: colors.secondary.light
  },
  totalCardContent: {
    position: "relative",
    width: "100%",
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md
  },
  totalPattern: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden"
  },
  patternLine: {
    position: "absolute",
    top: -150,
    width: 1,
    height: 420
  },
  orangePatternLine: {
    backgroundColor: "rgba(255, 85, 40, 0.09)",
    transform: [{ rotate: "45deg" }]
  },
  inkPatternLine: {
    backgroundColor: "rgba(25, 20, 20, 0.035)",
    transform: [{ rotate: "-45deg" }]
  },
  orangeGlowLarge: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255, 85, 40, 0.09)"
  },
  orangeGlowSmall: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255, 85, 40, 0.08)"
  },
  whiteGlow: {
    position: "absolute",
    bottom: -110,
    left: -70,
    width: 250,
    height: 250,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255, 255, 255, 0.42)"
  },
  totalIconWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.main
  },
  totalCopy: {
    flex: 1
  },
  totalLabel: {
    color: colors.neutral.dark,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.body2
  },
  totalValue: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h3,
    lineHeight: 38
  },
  typeHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  typeHeading: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  typeCaption: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  typeCard: {
    width: "48%",
    flexGrow: 1,
    borderRadius: radii.lg
  },
  typeCardContent: {
    minHeight: 124,
    padding: spacing.md
  },
  typeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  typeIconWrap: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.light,
    backgroundColor: colors.cream.main
  },
  typePercentage: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  typeValue: {
    marginTop: spacing.xs,
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h6,
    lineHeight: 24
  },
  typeLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  progressTrack: {
    height: 4,
    marginTop: spacing.xs,
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: colors.line.light
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill
  },
  loadingTypes: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  emptyTypes: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border.dark,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  emptyTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  emptyMessage: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    textAlign: "center"
  },
  recentSection: {
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  activityTabs: { flexDirection: "row", gap: spacing.xs },
  activityTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.main,
    backgroundColor: colors.white.main
  },
  activityTabSelected: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
  activityTabText: { fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2, color: colors.mute.main },
  activityTabTextSelected: { color: colors.white.main },
  recentHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  recentHeading: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  viewAllText: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  recentList: {
    gap: spacing.sm
  },
  recentCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  recentCardPressed: {
    opacity: 0.72
  },
  recentIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neutral.light,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  recentContent: {
    minWidth: 0,
    flex: 1
  },
  recentTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body2
  },
  recentTimestamp: {
    marginTop: spacing.xxs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  emptyRecentScans: {
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border.dark,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  }
});
