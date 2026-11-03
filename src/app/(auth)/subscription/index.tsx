import { router, type Href } from "expo-router";
import { Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { useCurrentSubscription } from "@/helpers/subscription/useCurrentSubscription";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { useUser } from "@/utils/auth/AuthUserContext";

/* ------------------ BREAK ------------------ */

// Shows the cached app user's effective plan, feature inclusions and live card allowance.
export default function SubscriptionScreen() {
  const user = useUser();
  const { limits, addons } = user.subscription;
  const { data, loading, error, refresh } = useCurrentSubscription();
  const plan = data?.plan || user.subscription.plan;
  //Default Return
  return <GeneralLayout edges={[]} fixedHeader topView={<View style={styles.header}><HeaderBackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/more")} /><Text style={styles.title}>My Subscription</Text></View>} onRefresh={refresh} refreshing={loading}>
    <View style={styles.content}>
      {error ? <View style={styles.panel}><Text style={styles.error}>{error}</Text><PxButton onPress={refresh} loading={loading}>Try again</PxButton></View> : null}
      <View style={styles.panel}><Text style={styles.caption}>Current plan</Text><Text style={styles.plan}>{plan.name}</Text><Text style={styles.description}>{plan.code === "app_basic_plan" ? "Free plan" : "Your paid plan is active"}</Text></View>
      {plan.code === "app_basic_plan" ? <PxButton mode="contained" color="secondary" fullWidth onPress={() => router.push("/subscription/order" as Href)}>Upgrade to Pro</PxButton> : null}
      <View style={styles.panel}><Text style={styles.heading}>Billing address</Text><Text style={styles.description}>{user.billing_address ? `${user.billing_address.name}\n${[user.billing_address.line_1, user.billing_address.line_2, user.billing_address.city, user.billing_address.state, user.billing_address.postal_code, user.billing_address.country].filter(Boolean).join(', ')}` : 'Add your billing address for country-based plan pricing.'}</Text><PxButton mode="outlined" size="sm" onPress={() => router.push("/subscription/billing-address")}>{user.billing_address ? 'Edit billing address' : 'Add billing address'}</PxButton></View>
      <View style={styles.panel}>
        <Text style={styles.heading}>Digital cards</Text>
        <Text style={styles.usage}>{limits.available} {limits.available === 1 ? "card" : "cards"} available</Text>
        <Text style={styles.description}>{limits.used} of {limits.total} used</Text>
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.description}>Included in plan</Text><Text style={styles.value}>{limits.included}</Text></View>
        <View style={styles.row}><Text style={styles.description}>Additional cards</Text><Text style={styles.value}>{limits.additional}</Text></View>
        <View style={styles.row}><Text style={styles.description}>Total card limit</Text><Text style={styles.value}>{limits.total}</Text></View>
        {limits.over_limit > 0 ? <Text style={styles.error}>{limits.over_limit} {limits.over_limit === 1 ? "card" : "cards"} over your current allowance</Text> : null}
      </View>
      <View style={styles.panel}>
        <Text style={styles.heading}>Included in your plan</Text>
        {plan.inclusions.length > 0 ? plan.inclusions.map(feature => <View key={feature} style={styles.featureRow}><Check size={18} strokeWidth={1.25} color={colors.success.dark} /><Text style={styles.description}>{feature}</Text></View>) : <Text style={styles.description}>No inclusions listed.</Text>}
      </View>
      {addons.length > 0 ? <View style={styles.panel}><Text style={styles.heading}>Active add-ons</Text>{addons.map(addon => <View key={addon.id} style={styles.row}><Text style={styles.description}>Extra cards</Text><Text style={styles.value}>{addon.extra_cards}</Text></View>)}</View> : null}
    </View>
  </GeneralLayout>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  title: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle, color: colors.primary.main },
  content: { padding: spacing.md, gap: spacing.md },
  panel: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  caption: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  plan: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h4 },
  heading: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  usage: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h5 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, flexShrink: 1 },
  value: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border.main },
  error: { color: colors.error.dark, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
