import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxSkeleton } from "@/components/elements/PxSkeleton";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { useCurrentSubscription } from "@/helpers/subscription/useCurrentSubscription";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

// Displays the account's current paid billing period and provider without starting checkout.
export default function BillingScreen() {
  const { data, loading, error, refresh } = useCurrentSubscription();
  const subscription = data?.subscription;
  const paid = data?.plan.code === "app_pro_plan";
  const providers: Record<string, string> = { razorpay: "Razorpay", paypal: "PayPal", app_store: "Apple App Store", google_play: "Google Play" };
  //Default Return
  return <GeneralLayout edges={[]} fixedHeader topView={<View style={styles.header}><HeaderBackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/more")} /><Text style={styles.title}>Billing</Text></View>} onRefresh={refresh} refreshing={loading && !!data}>
    <View style={styles.content}>
      {loading && !data ? <PxSkeleton width="100%" height={220} /> : error ? <><Text style={styles.error}>{error}</Text><PxButton onPress={refresh}>Try again</PxButton></> : data ? <View style={styles.panel}>
        <Text style={styles.heading}>{data.plan.name} plan</Text>
        {paid && subscription ? <>
          <View style={styles.row}><Text style={styles.label}>Billing cycle</Text><Text style={styles.value}>{subscription.interval === "yearly" ? "Yearly" : "Monthly"}</Text></View>
          {subscription.provider ? <View style={styles.row}><Text style={styles.label}>Payment provider</Text><Text style={styles.value}>{providers[subscription.provider] || subscription.provider}</Text></View> : null}
          <View style={styles.row}><Text style={styles.label}>Period started</Text><Text style={styles.value}>{formatBillingDate(subscription.current_period_start)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{subscription.cancel_at_period_end ? "Access ends" : "Current period ends"}</Text><Text style={styles.value}>{formatBillingDate(subscription.current_period_end)}</Text></View>
          {subscription.cancel_at_period_end ? <Text style={styles.label}>Your subscription is set to cancel at the end of this period.</Text> : null}
        </> : <Text style={styles.label}>You are on the free Basic plan. There is no active paid billing period.</Text>}
      </View> : null}
      <PxButton mode="outlined" fullWidth onPress={() => router.push("/subscription/billing-address")}>Billing address</PxButton>
    </View>
  </GeneralLayout>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Formats API billing dates without displaying invalid or absent timestamps.
function formatBillingDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  title: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle, color: colors.primary.main },
  content: { padding: spacing.md, gap: spacing.md },
  panel: { padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  heading: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h5 },
  label: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, flexShrink: 1 },
  value: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2, flexShrink: 1, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  error: { color: colors.error.dark, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
