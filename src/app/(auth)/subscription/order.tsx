import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Check, ChevronDown, ChevronUp, Pencil } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PxAlert } from "@/components/elements/PxAlert";
import { PxButton } from "@/components/elements/PxButton";
import { PxSkeleton } from "@/components/elements/PxSkeleton";
import { PxSelect } from "@/components/form/PxSelect";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import type { AppSubscriptionOrder } from "@/helpers/subscription/orders";
import { getAppPlanCatalogue } from "@/helpers/subscription/plans";
import type { AppPlanCatalogue } from "@/helpers/subscription/types";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { useUser } from "@/utils/auth/AuthUserContext";
import { getUser } from "@/utils/auth/AuthUser";
import GetError from "@/utils/general/Error";
import * as Razorpay from "@/utils/payment_providers/Razorpay";

/* ------------------ BREAK ------------------ */

type BillingInterval = "monthly" | "yearly";
type CataloguePlan = AppPlanCatalogue["plans"][number];

/* ------------------ BREAK ------------------ */

// Reviews billing details and the Pro price before creating a pending account order.
export default function ProOrderScreen() {
  const user = useUser();
  const address = user.billing_address;
  const provider = "razorpay";
  const [plan, setPlan] = useState<CataloguePlan | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [order, setOrder] = useState<AppSubscriptionOrder | null>(null);
  const submitting = useRef(false);
  const price = plan?.prices.find(value => value.interval === interval);
  const currency = order?.currency ?? price?.currency;
  const subtotal = order?.subtotal_amount ?? price?.rate;
  const total = order?.total_amount ?? price?.rate;
  const billing = order?.billing_details ?? (address ? { name: address.name, address } : null);
  const billingCountry = billing?.address.country;

  // Applies only API-confirmed payment state and refreshes the shared account after a paid order.
  const applyOrder = useCallback(async (saved: AppSubscriptionOrder): Promise<void> => {
    setOrder(saved);
    const savedInterval = saved.items?.[0]?.price_snapshot.interval;
    if (savedInterval) setInterval(savedInterval);
    if (saved.status === "paid") {
      await getUser();
    };//if ends
  }, []);

  // Refreshes the catalogue after billing edits and discards outdated country prices while loading.
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setPlan(null); setError(null); setLoading(!!billingCountry);
    if (!billingCountry) return () => controller.abort();
    void getAppPlanCatalogue({ country: billingCountry, provider, signal: controller.signal })
      .then(catalogue => {
        if (controller.signal.aborted) return;
        const pro = catalogue.plans.find(value => value.code === "app_pro_plan");
        if (!pro) throw new Error("The Pro plan is unavailable for your billing country.");
        setPlan(pro);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Pro pricing could not be loaded." }).message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();//return ends
  }, [billingCountry, provider, revision]));

  // Creates a new order and payment for the selected price and verifies the provider response through the API.
  const createOrder = async (): Promise<void> => {
    if (submitting.current || !address || !price?.available || loading) return;
    submitting.current = true;
    setSaving(true); setError(null); setOrder(null);
    try {
      Razorpay.assertCheckoutReady();
      const saved = await Razorpay.createOrder({ priceId: price.id, billingAddress: address, email: user.email });
      setOrder(saved);
      const payment = await Razorpay.createPayment(saved.uid);
      await applyOrder(payment.order);
      if (payment.order.status === "paid") return;
      if (!payment.checkout) throw new Error("Payment checkout is not available for this order. Please retry.");
      const result = await Razorpay.openCheckout(payment.checkout);
      const verified = await Razorpay.verifyPayment(saved.uid, result);
      await applyOrder(verified.order);
      if (verified.order.status !== "paid") setError("Your payment is processing. Use Check payment status to refresh it.");
    } catch (cause: unknown) {
      setOrder(null);
      setError(GetError({ error: cause, message: "Your Pro order could not be created." }).message);
    } finally {
      submitting.current = false;
      setSaving(false);
    };//try-catch ends
  };//func ends

  // Checks provider invoices after an interrupted checkout without opening another payment.
  const checkPayment = async (): Promise<void> => {
    if (!order || submitting.current) return;
    submitting.current = true; setSaving(true); setError(null);
    try {
      const current = await Razorpay.getOrder(order.uid);
      const result = current.order.status === "paid" || !current.checkout ? current : await Razorpay.reconcilePayment(order.uid);
      await applyOrder(result.order);
      if (result.order.status !== "paid") setError("Payment has not been confirmed yet. Please try again.");
    } catch (cause: unknown) {
      setError(GetError({ error: cause, message: "Payment status could not be checked." }).message);
    } finally {
      submitting.current = false; setSaving(false);
    };//try-catch ends
  };//func ends

  //Default Return
  return <GeneralLayout edges={[]} fixedHeader topView={<View style={styles.header}>
    <HeaderBackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/subscription")} />
    <Text style={styles.title}>Upgrade to Pro</Text>
  </View>} bottomNav={<View>
    <PxButton mode="contained" color="secondary" fullWidth loading={saving} disabled={saving || (order?.status !== "paid" && (loading || !address || !price?.available))} onPress={order?.status === "paid" ? () => router.replace("/subscription") : () => void createOrder()}>
      {order?.status === "paid" ? "Done" : `Pay${currency && total !== undefined ? ` ${money(total, currency)}` : ""}`}
    </PxButton>
  </View>}>
    <View style={styles.content}>
      <View style={styles.panel}>
        <View style={styles.row}><Text style={styles.heading}>Billing address</Text>
          {!order ? <PxButton mode="text" size="sm" compact disabled={saving} icon={({ color, size }) => <Pencil color={color} size={size} strokeWidth={1.25} />} onPress={() => router.push("/subscription/billing-address")}>{address ? "Edit" : "Add"}</PxButton> : null}
        </View>
        {billing ? <><Text style={styles.value}>{billing.name}</Text><Text style={styles.description}>{[billing.address.line_1, billing.address.line_2, billing.address.city, billing.address.state, billing.address.postal_code, billing.address.country].filter(Boolean).join(", ")}</Text></> : <Text style={styles.description}>Add your billing address to see pricing and create your order.</Text>}
      </View>
      {error ? <PxAlert color="error" messages={[error]} /> : null}
      {error && !plan && address ? <PxButton mode="text" size="sm" onPress={() => setRevision(value => value + 1)}>Retry</PxButton> : null}
      {order ? <>
        {order.status === "paid" || !error ? <PxAlert color={order.status === "paid" ? "success" : "info"} messages={[order.status === "paid" ? `Payment confirmed for order ${order.number}.` : `Order ${order.number} is awaiting payment.`]} /> : null}
        {order.status === "pending" ? <PxButton mode="text" size="sm" disabled={saving} onPress={() => void checkPayment()}>Check payment status</PxButton> : null}
      </> : null}
      {loading ? <PxSkeleton width="100%" height={300} /> : plan ? <>
        <View style={styles.panel}>
          <Text style={styles.heading}>Order summary</Text>
          <View style={styles.row}><Text style={styles.planName}>Pro</Text><Text style={styles.value}>Quantity: 1</Text></View>
          <Text style={styles.description}>{plan.included_cards} digital business cards</Text>
          {order?.status !== "paid" ? <PxSelect label="Billing cycle" value={interval} disabled={saving} options={[
            { label: "Monthly", value: "monthly" },
            { label: "Yearly", value: "yearly" }
          ]} onValueChange={value => {
            if (value === "monthly" || value === "yearly") { setInterval(value); setOrder(null); setError(null); };//if ends
          }} />
            : <View style={styles.row}><Text style={styles.description}>Billing cycle</Text><Text style={styles.value}>{interval === "monthly" ? "Monthly" : "Yearly"}</Text></View>}
          {currency && subtotal !== undefined ? <View style={styles.row}><Text style={styles.description}>Plan price</Text><Text style={styles.value}>{money(subtotal, currency)}</Text></View> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Benefits" accessibilityState={{ expanded: benefitsOpen }} onPress={() => setBenefitsOpen(open => !open)} style={[styles.row, styles.benefitsToggle]}>
            <Text style={styles.heading}>Benefits</Text>
            {benefitsOpen ? <ChevronUp size={20} color={colors.mute.main} strokeWidth={1.25} /> : <ChevronDown size={20} color={colors.mute.main} strokeWidth={1.25} />}
          </Pressable>
          {benefitsOpen ? plan.inclusions.map(feature => <View key={feature} style={styles.feature}><Check size={18} color={colors.success.dark} strokeWidth={1.25} /><Text style={styles.description}>{feature}</Text></View>) : null}
          {!price?.available && !order ? <Text style={styles.description}>This billing cycle is currently unavailable.</Text> : null}
        </View>
        {currency && subtotal !== undefined && total !== undefined ? <View style={styles.panel}>
          <Text style={styles.heading}>Order totals</Text>
          <View style={styles.row}><Text style={styles.description}>Subtotal</Text><Text style={styles.value}>{money(subtotal, currency)}</Text></View>
          <View style={styles.row}><Text style={styles.description}>Tax</Text><Text style={styles.value}>All Incl.</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.heading}>Total</Text><Text style={styles.total}>{money(total, currency)}</Text></View>
        </View> : null}
      </> : null}
    </View>
  </GeneralLayout>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Formats the API's integer minor units in the selected order currency.
function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100);
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  title: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle, color: colors.primary.main },
  content: { padding: spacing.md, gap: spacing.md },
  panel: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  heading: { fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1, color: colors.primary.main },
  description: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, color: colors.mute.main, flexShrink: 1 },
  value: { fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2, color: colors.primary.main, flexShrink: 1 },
  planName: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h4, color: colors.primary.main },
  total: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h5, color: colors.secondary.dark },
  benefitsToggle: { minHeight: 44 },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border.main }
});
