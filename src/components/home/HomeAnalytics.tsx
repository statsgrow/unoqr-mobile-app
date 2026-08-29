import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, Text } from "react-native-paper";

import { PxCard } from "@/components/elements/PxCard";
import { getAllScans } from "@/helpers/scans/db/getQueries";
import { getScanTypeInit, normalizeScanType } from "@/helpers/scans/identifiers";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = Awaited<ReturnType<typeof getAllScans>>[number];

type ScanTypeSummary = {
  type: string;
  label: string;
  count: number;
  percentage: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
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
const maximumRecentScans = 3;
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
export function HomeAnalytics() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Reloads SQLite activity whenever the home route becomes active.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      setLoading(true);
      void getAllScans()
        .then((storedRecords) => {
          if (!isMounted) return;
          setRecords(storedRecords);
        })
        .catch((error: unknown) => {
          console.error("Unable to load home scan analytics:", error);
          if (isMounted) setRecords([]);
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

  //Default Return
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.root}
    >
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>YOUR ACTIVITY</Text>
          <Text style={styles.heading}>Scan overview</Text>
        </View>
        <View style={styles.periodPill}>
          <Text style={styles.periodText}>All time</Text>
        </View>
      </View>

      <PxCard padded={false} style={styles.totalCard} contentStyle={styles.totalCardContent}>
        <ScanCardPattern />

        <View style={styles.totalIconWrap}>
          <MaterialCommunityIcons name="qrcode-scan" size={28} color={colors.white.main} />
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
          <ActivityIndicator size="small" color={colors.secondary.main} />
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
            <MaterialCommunityIcons name="qrcode-scan" size={28} color={colors.secondary.main} />
          </View>
          <Text style={styles.emptyTitle}>No scans available</Text>
          <Text style={styles.emptyMessage}>Start scanning to see magic</Text>
        </View>
      )}

      <View style={styles.recentSection}>
        <View style={styles.recentHeadingRow}>
          <Text style={styles.recentHeading}>Recent Scans</Text>
          {recentScans.length > 0 ? (
            <Pressable onPress={() => router.push("/scans/list")}>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          ) : null}
        </View>

        {recentScans.length > 0 ? (
          <View style={styles.recentList}>
            {recentScans.map((record) => (
              <RecentScanCard key={record.id} record={record} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyRecentScans}>
            <Text style={styles.emptyMessage}>No recent scans yet</Text>
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

  //Default Return
  return (
    <Pressable
      accessibilityLabel={`Open recent scan ${title}`}
      accessibilityRole="button"
      onPress={() => router.push(`/scans/${record.id}/view`)}
      style={({ pressed }) => [styles.recentCard, pressed && styles.recentCardPressed]}
    >
      <View style={styles.recentIcon}>
        <MaterialCommunityIcons name={typeInit.icon} size={21} color={colors.secondary.main} />
      </View>
      <View style={styles.recentContent}>
        <Text numberOfLines={1} style={styles.recentTitle}>{title}</Text>
        <Text style={styles.recentTimestamp}>{formatRecentScanDate(record.created_at)}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={21} color={colors.mute.light} />
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Selects the newest saved scans for the compact home activity list.
function createRecentScans(records: ScanRecord[]): ScanRecord[] {
  return [...records]
    .sort(
      (firstRecord, secondRecord) =>
        new Date(secondRecord.created_at).getTime() - new Date(firstRecord.created_at).getTime()
    )
    .slice(0, maximumRecentScans);
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
      onPress={() => router.push({ pathname: "/scans/list", params: { type: summary.type } })}
      style={styles.typeCard}
      contentStyle={styles.typeCardContent}
    >
      <View style={styles.typeTopRow}>
        <View style={[styles.typeIconWrap, { backgroundColor: summary.backgroundColor }]}>
          <MaterialCommunityIcons name={summary.icon} size={20} color={summary.color} />
        </View>
        <Text style={styles.typePercentage}>{summary.percentage}%</Text>
      </View>

      <Text style={styles.typeValue}>{summary.count}</Text>
      <Text numberOfLines={1} style={styles.typeLabel}>{summary.label}</Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${summary.percentage}%`, backgroundColor: summary.color }
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
  eyebrow: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    letterSpacing: 1.5
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
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md
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
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.light
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
