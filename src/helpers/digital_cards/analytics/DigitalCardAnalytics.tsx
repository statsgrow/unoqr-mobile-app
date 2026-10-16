import { useEffect, useState } from "react";
import { ContactRound, Download, Eye, QrCode, type LucideIcon } from "lucide-react-native";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
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
    { key: "contact_downloads_started", label: "Contact downloads started", Icon: Download },
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
    {loading ? <View accessibilityRole="progressbar" accessibilityLabel="Loading card analytics" style={styles.feedback}>
      <PxCircularProgress size={32} color={colors.secondary.main} />
      <Text style={styles.description}>Loading analytics…</Text>
    </View> : error ? <View style={styles.feedback}>
      <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      <PxButton onPress={refreshAnalytics}>Try again</PxButton>
    </View> : analytics ? <>
      <View style={styles.metrics}>
        {metrics.map(({ key, label, Icon }) => <View key={key} style={styles.metric}>
          <Icon size={22} strokeWidth={1.25} color={colors.secondary.main} />
          <Text style={styles.total}>{analytics.summary[key].toLocaleString()}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>)}
      </View>
      {empty ? <Text style={styles.description}>No activity in this date range. Share your card to start making connections.</Text> : null}
      <Text style={styles.note}>QR card views count visitors opening the QR face, once per card opening. Downloads count contact file downloads started. Your previews are excluded. Dates use your local time.</Text>
    </> : null}
  </ScrollView>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  title: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { flexGrow: 1, flexBasis: "45%", padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  total: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h3 },
  label: { color: colors.neutral.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  feedback: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.md },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  note: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption, lineHeight: 18 }
});
