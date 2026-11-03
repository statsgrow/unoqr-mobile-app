import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Check, Pencil } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { getAppPlanCatalogue } from "@/helpers/subscription/plans";
import type { AppPlanCatalogue } from "@/helpers/subscription/types";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { useUser } from "@/utils/auth/AuthUserContext";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

// Compares app plans with pricing determined by the account's saved billing country.
export default function SubscriptionPlansScreen() {
  const user = useUser();
  const country = user.billing_address?.country;
  const [catalogue, setCatalogue] = useState<AppPlanCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const plans = [...(catalogue?.plans ?? [])].sort((first, second) =>
    Number(second.code === "app_pro_plan") - Number(first.code === "app_pro_plan"));

  // Reload prices on focus or currency changes and cancel reads when leaving the page.
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setCatalogue(null);
    if (!country) { setLoading(false); return () => controller.abort(); }
    void getAppPlanCatalogue({ country, provider: "razorpay", signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setCatalogue(data); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Plans could not be loaded." }).message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();//return ends
  }, [country, revision]));

  //Default Return
  return <GeneralLayout edges={[]} fixedHeader topView={<View style={styles.header}><HeaderBackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/subscription")} /><Text style={styles.title}>Available plans</Text></View>} onRefresh={() => setRevision(value => value + 1)} refreshing={loading}>
    <View style={styles.content}>
      <View style={styles.countryRow}>
        <Text style={styles.description}>Country: <Text style={styles.countryValue}>{country || 'Not set'}</Text></Text>
        <PxButton mode="text" size="sm" compact color="secondary" accessibilityLabel={country ? 'Edit billing address' : 'Add billing address'} icon={({ color, size }) => <Pencil color={color} size={size} strokeWidth={1.25} />} onPress={() => router.push("/subscription/billing-address")}>{country ? 'Edit' : 'Add'}</PxButton>
      </View>
      {!country ? null : loading ? <View style={styles.loading}><PxCircularProgress color={colors.secondary.main} size={32} /></View> : error ? <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PxButton onPress={() => setRevision(value => value + 1)}>Try again</PxButton></View> : plans.length ? plans.map(plan => <View key={plan.code} style={[styles.panel, plan.code === "app_pro_plan" && styles.proPanel]}>
        {plan.code === "app_pro_plan" ? <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>Recommended</Text></View> : null}
        <View style={styles.row}><Text style={styles.planName}>{plan.name}</Text>{plan.code === user.subscription.plan.code ? <Text style={styles.currentPlan}>Current plan</Text> : null}</View>
        <Text style={styles.description}>{plan.included_cards} digital business cards</Text>
        <View style={styles.prices}>
          {(['monthly', 'yearly'] as const).map(interval => <View key={interval} style={styles.priceRow}><Text style={styles.description}>{interval === 'monthly' ? 'Monthly' : 'Yearly'}</Text><Text style={[styles.price, plan.code === "app_pro_plan" && styles.proPrice]}>{formatPlanPrice(plan.prices.find(price => price.interval === interval))}</Text></View>)}
        </View>
        {plan.inclusions.map(feature => <View key={feature} style={styles.featureRow}><Check size={18} strokeWidth={1.25} color={colors.success.dark} /><Text style={styles.description}>{feature}</Text></View>)}
      </View>) : <Text style={styles.description}>No plans are available right now.</Text>}
    </View>
  </GeneralLayout>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Formats catalogue minor units as currency without substituting missing prices.
function formatPlanPrice(price: AppPlanCatalogue['plans'][number]['prices'][number] | undefined): string {
  if (!price) return "Not available";
  if (price.rate === 0) return "Free";
  return new Intl.NumberFormat('en', { style: 'currency', currency: price.currency, maximumFractionDigits: 2 }).format(price.rate / 100);
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  title: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle, color: colors.primary.main },
  content: { padding: spacing.md, gap: spacing.md },
  loading: { alignItems: "center", padding: spacing.xl },
  panel: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  countryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingHorizontal: spacing.xs },
  countryValue: { fontFamily: fontFamilies.primarySemiBold, color: colors.primary.main },
  proPanel: { borderColor: colors.secondary.main, borderWidth: 2, backgroundColor: colors.secondary.light },
  proPrice: { color: colors.secondary.dark },
  recommendedBadge: { alignSelf: "flex-start", borderRadius: radii.pill, backgroundColor: colors.secondary.main, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  recommendedText: { fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption, color: colors.white.main },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  planName: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h4, color: colors.primary.main },
  currentPlan: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.body2, color: colors.mute.main },
  description: { flexShrink: 1, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, color: colors.mute.main },
  prices: { gap: spacing.sm, paddingVertical: spacing.sm },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  price: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6, color: colors.primary.main },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  error: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, color: colors.error.dark }
});
