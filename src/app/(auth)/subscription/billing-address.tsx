import { useState } from "react";
import { getLocales } from "expo-localization";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { billingCountries } from "@/assets/data/billingCountries";
import { PxButton } from "@/components/elements/PxButton";
import { PxSelect } from "@/components/form/PxSelect";
import { PxTextInput } from "@/components/form/PxTextInput";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { saveAppBillingAddress } from "@/helpers/subscription/billingAddress";
import { colors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";
import { useUser } from "@/utils/auth/AuthUserContext";
import type { BillingAddress } from "@/utils/auth/UserTypes";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

// Saves the account billing address used to select app subscription pricing.
export default function BillingAddressScreen() {
  const user = useUser();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<BillingAddress>({ defaultValues: user.billing_address || {
    name: user.full_name || `${user.first_name} ${user.last_name}`.trim(),
    line_1: "", line_2: "", city: "", state: "", postal_code: "", country: getLocales()[0]?.regionCode || ""
  } });
  const saving = form.formState.isSubmitting;

  // Refresh the shared user before returning so prices use the newly saved country.
  const saveAddress = async (address: BillingAddress): Promise<void> => {
    setError(null);
    try {
      await saveAppBillingAddress(address);
      if (router.canGoBack()) router.back(); else router.replace("/subscription");
    } catch (cause: unknown) {
      setError(GetError({ error: cause, message: "Your billing address could not be saved." }).message);
    };//try-catch ends
  };//func ends

  //Default Return
  return <GeneralLayout edges={[]} fixedHeader topView={<View style={styles.header}><HeaderBackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/subscription")} /><Text style={styles.title}>Billing address</Text></View>} bottomNav={<PxButton mode="contained" color="secondary" fullWidth loading={saving} disabled={saving} onPress={form.handleSubmit(saveAddress)}>Save billing address</PxButton>}>
    <View style={styles.content}>
      <Text style={styles.description}>Your billing country determines your plan currency and pricing.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PxTextInput RHF={form} name="name" label="Billing name" disabled={saving} rules={{ required: "Enter your billing name.", maxLength: 200, validate: value => !!value.trim() || "Enter your billing name." }} />
      <PxSelect RHF={form} name="country" label="Country" options={billingCountries} disabled={saving} rules={{ required: "Select your billing country." }} />
      <PxTextInput RHF={form} name="line_1" label="Address line 1" disabled={saving} rules={{ required: "Enter your address.", maxLength: 250, validate: value => !!value.trim() || "Enter your address." }} />
      <PxTextInput RHF={form} name="line_2" label="Address line 2 (optional)" disabled={saving} rules={{ maxLength: 250 }} />
      <PxTextInput RHF={form} name="city" label="City" disabled={saving} rules={{ required: "Enter your city.", maxLength: 100, validate: value => !!value.trim() || "Enter your city." }} />
      <PxTextInput RHF={form} name="state" label="State / region" disabled={saving} rules={{ required: "Enter your state or region.", maxLength: 100, validate: value => !!value.trim() || "Enter your state or region." }} />
      <PxTextInput RHF={form} name="postal_code" label="Postal code" autoCapitalize="characters" disabled={saving} rules={{ required: "Enter your postal code.", maxLength: 30, validate: value => !!value.trim() || "Enter your postal code." }} />
    </View>
  </GeneralLayout>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  title: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle, color: colors.primary.main },
  content: { padding: spacing.md, gap: spacing.md },
  description: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, color: colors.mute.main },
  error: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, color: colors.error.dark }
});
