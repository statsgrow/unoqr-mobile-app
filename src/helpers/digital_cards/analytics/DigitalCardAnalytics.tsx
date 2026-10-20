import { useEffect, useState } from "react";
import { ContactRound, Download, Eye, MapPin, QrCode, type LucideIcon } from "lucide-react-native";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxSkeleton } from "@/components/elements/PxSkeleton";
import { PxSelect } from "@/components/form/PxSelect";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

import { getDigitalCardAnalytics, type DigitalCardAnalyticsPeriod, type DigitalCardAnalyticsResponse, type DigitalCardAnalyticsSummary } from "./api";

/* ------------------ BREAK ------------------ */

type DigitalCardAnalyticsProps = { uid: string };
type AnalyticsMetric = { key: keyof DigitalCardAnalyticsSummary; label: string; Icon: LucideIcon };

/* ------------------ BREAK ------------------ */

// Displays owner-only public card totals with local date presets and explicit refresh controls.
export default function DigitalCardAnalytics({ uid }: DigitalCardAnalyticsProps) {
  const [period, setPeriod] = useState<DigitalCardAnalyticsPeriod>("30");
  const [analytics, setAnalytics] = useState<DigitalCardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const metrics: AnalyticsMetric[] = [
    { key: "card_views", label: "Card views", Icon: Eye },
    { key: "qr_card_views", label: "QR card views", Icon: QrCode },
    { key: "contact_downloads_started", label: "Card Downloads", Icon: Download },
    { key: "contacts_submitted", label: "Contacts submitted", Icon: ContactRound }
  ];

  // Cancels stale requests when switching cards, date ranges or preview tabs.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setAnalytics(null);
    void getDigitalCardAnalytics({ uid, period, signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setAnalytics(data);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Your card analytics could not be loaded." }).message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();//return ends
  }, [uid, period, refreshKey]);

  // Reloads the selected range without changing the card or preview tab.
  function refreshAnalytics(): void { setRefreshKey(key => key + 1); };//func ends

  // Accepts only the date presets supported by the card analytics request.
  function changePeriod(value: string): void {
    if (value === "7" || value === "30" || value === "all") setPeriod(value);
  };//func ends

  const empty = analytics && metrics.every(metric => analytics.summary[metric.key] === 0);

  //Default Return
  return <ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading && refreshKey > 0} onRefresh={refreshAnalytics} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}>
    <View style={styles.heading}>
      <Text style={styles.title}>Card analytics</Text>
    </View>
    <PxSelect label="Date range" value={period} onValueChange={changePeriod} options={[{ label: "Last 7 days", value: "7" }, { label: "Last 30 days", value: "30" }, { label: "All time", value: "all" }]} />
    {loading ? <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading card analytics" accessibilityState={{ busy: true }} style={styles.loadingContent}>
      <View style={styles.metrics}>
        {metrics.map(({ key }) => <View key={key} style={styles.metricSkeleton}>
          <PxSkeleton width="100%" height={spacing.xl * 3 + spacing.sm} />
        </View>)}
      </View>
      <View style={styles.locations}>
        <View style={styles.locationHeading}><Text style={styles.sectionTitle}>Top 5 locations</Text><Text style={styles.locationCaption}>Visitors</Text></View>
        <View style={styles.locationRow}>
          <PxSkeleton width={20} height={20} type="rounded" />
          <View style={styles.locationDetails}>
            <PxSkeleton width="65%" height={fontSizes.body2} />
            <PxSkeleton width="40%" height={fontSizes.caption} />
          </View>
          <PxSkeleton width={24} height={fontSizes.body2} />
        </View>
      </View>
    </View> : error ? <View style={styles.feedback}>
      <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      <PxButton onPress={refreshAnalytics}>Try again</PxButton>
    </View> : analytics ? <>
      <View style={styles.metrics}>
        {metrics.map(({ key, label, Icon }) => <View key={key} style={styles.metric}>
          <View style={styles.metricHeader}>
            <Text style={styles.total}>{analytics.summary[key].toLocaleString()}</Text>
            <Icon size={22} strokeWidth={1.25} color={colors.secondary.main} />
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>)}
      </View>
      {empty ? <Text style={styles.description}>No activity in this date range. Share your card to start making connections.</Text> : null}
      <View style={styles.locations}>
        <View style={styles.locationHeading}><Text style={styles.sectionTitle}>Top 5 locations</Text><Text style={styles.locationCaption}>Visitors</Text></View>
        {analytics.locations?.length ? analytics.locations.map((location, index) => <View key={`${location.city}-${location.country}`} style={[styles.locationRow, index > 0 && styles.locationDivider]}>
          <MapPin size={20} strokeWidth={1.25} color={colors.mute.main} />
          <View style={styles.locationDetails}><Text style={styles.locationCity}>{location.city}</Text><Text style={styles.locationCaption}>{location.country || "Country unavailable"}</Text></View>
          <Text style={styles.locationCount}>{location.visitors.toLocaleString()}</Text>
        </View>) : <Text style={styles.description}>No location data in this date range.</Text>}
      </View>
    </> : null}
  </ScrollView>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  loadingContent: { gap: spacing.md },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  title: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricSkeleton: { flexGrow: 1, flexBasis: "45%" },
  metric: { flexGrow: 1, flexBasis: "45%", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  metricHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.xs },
  total: { flexShrink: 1, color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h4 },
  label: { color: colors.neutral.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  feedback: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.md },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  locations: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  locationHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  sectionTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  locationDivider: { borderTopWidth: 1, borderTopColor: colors.border.main, paddingTop: spacing.sm },
  locationDetails: { flex: 1, gap: spacing.xxs },
  locationCity: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  locationCaption: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  locationCount: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 }
});
