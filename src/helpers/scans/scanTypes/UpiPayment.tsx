import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Text } from "react-native-paper";

import { getScanById } from "@/helpers/scans/db/getQueries";
import type { StoredScanReference } from "@/helpers/scans/db/persistScan";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

type UpiPaymentProps = {
  record: ScanRecord;
};

type UpiHandle = {
  identifier: string;
  bank: string;
  app: string;
};

type PaymentDetailProps = {
  label: string;
  value: string;
};

type UpiAppDefinition = {
  name: string;
  scheme: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBackground: string;
};

/* ------------------ BREAK ------------------ */

const upiHandles: UpiHandle[] = [
  // Google Pay Handles
  { identifier: "okaxis", bank: "Axis Bank", app: "Google Pay" },
  { identifier: "okicici", bank: "ICICI Bank", app: "Google Pay" },
  { identifier: "oksbi", bank: "State Bank of India", app: "Google Pay" },
  { identifier: "okhdfcbank", bank: "HDFC Bank", app: "Google Pay" },

  // PhonePe Handles
  { identifier: "ybl", bank: "Yes Bank", app: "PhonePe" },
  { identifier: "ibl", bank: "ICICI Bank", app: "PhonePe" },
  { identifier: "axl", bank: "Axis Bank", app: "PhonePe" },

  // Paytm Handles
  { identifier: "ptaxis", bank: "Axis Bank", app: "Paytm" },
  { identifier: "ptyes", bank: "Yes Bank", app: "Paytm" },
  { identifier: "ptsbi", bank: "State Bank of India", app: "Paytm" },
  { identifier: "pthdfc", bank: "HDFC Bank", app: "Paytm" },
  { identifier: "paytm", bank: "Paytm Payments Bank / Partner Bank", app: "Paytm" },

  // Amazon Pay Handles
  { identifier: "apl", bank: "Axis Bank", app: "Amazon Pay" },
  { identifier: "yapl", bank: "Yes Bank", app: "Amazon Pay" },

  // CRED Handles
  { identifier: "axisb", bank: "Axis Bank", app: "CRED" },
  { identifier: "yescred", bank: "Yes Bank", app: "CRED" },

  // WhatsApp Pay Handles
  { identifier: "waicici", bank: "ICICI Bank", app: "WhatsApp" },

  // Native Bank App Handles
  { identifier: "icici", bank: "ICICI Bank", app: "iMobile Pay" },
  { identifier: "sbi", bank: "State Bank of India", app: "BHIM YONO SBI" },
  { identifier: "hdfcbank", bank: "HDFC Bank", app: "HDFC Mobile Banking" },
  { identifier: "pz", bank: "HDFC Bank", app: "PayZapp" },
  { identifier: "barodampay", bank: "Bank of Baroda", app: "bob World" },
  { identifier: "pnb", bank: "Punjab National Bank", app: "PNB One" },
  { identifier: "idbi", bank: "IDBI Bank", app: "Go Mobile+" },
  { identifier: "kotak", bank: "Kotak Mahindra Bank", app: "Kotak Mobile Banking" },
  { identifier: "kotak811", bank: "Kotak Mahindra Bank", app: "Kotak 811" },
  { identifier: "centralbank", bank: "Central Bank of India", app: "Cent UPI" },
  { identifier: "boi", bank: "Bank of India", app: "BHIM BOI" },
  { identifier: "federal", bank: "Federal Bank", app: "FedMobile / Lotza" },

  // Neobanks and Fintech Wallets
  { identifier: "jupiteraxis", bank: "Axis Bank", app: "Jupiter Money" },
  { identifier: "sliceaxis", bank: "Axis Bank", app: "Slice" },
  { identifier: "slicepay", bank: "Sponsor Bank", app: "Slice" },
  { identifier: "fam", bank: "Trio / Sponsor Bank", app: "FamApp" },
  { identifier: "yesfam", bank: "Yes Bank", app: "FamApp" },
  { identifier: "inhdfc", bank: "HDFC Bank", app: "INDmoney" },

  // Government and Standard Handles
  { identifier: "upi", bank: "NPCI Managed", app: "BHIM" }
];

const upiAppDefinitions: UpiAppDefinition[] = [
  {
    name: "PhonePe",
    scheme: "phonepe://",
    icon: "cellphone-check",
    iconColor: "#5F259F",
    iconBackground: "#F0E8FA"
  },
  {
    name: "Google Pay",
    scheme: "tez://",
    icon: "google",
    iconColor: "#4285F4",
    iconBackground: "#E8F0FE"
  },
  {
    name: "Paytm",
    scheme: "paytmmp://",
    icon: "wallet-outline",
    iconColor: "#00BAF2",
    iconBackground: "#E5F8FD"
  },
  {
    name: "BHIM",
    scheme: "bhim://",
    icon: "bank-outline",
    iconColor: "#F36F21",
    iconBackground: "#FFF0E7"
  },
  {
    name: "Amazon Pay",
    scheme: "amazonpay://",
    icon: "shopping-outline",
    iconColor: "#232F3E",
    iconBackground: "#EEF0F2"
  }
];

/* ------------------ BREAK ------------------ */

// Shows a UPI payment summary with the provider inferred from the payee VPA.
export function UpiPayment({ record }: UpiPaymentProps) {
  const [installedUpiApps, setInstalledUpiApps] = useState<UpiAppDefinition[]>([]);
  const metadata = record.metadata;
  const payeeVpa = metadata?.payeeVpa || null;
  const payeeName = metadata?.payeeName || null;
  const provider = getUpiProvider(payeeVpa);
  const amount = formatAmount(metadata?.amount, metadata?.currency);
  const paymentUrl = getSafeUpiPaymentUrl(record.value);
  const transactionNote = metadata?.transactionNote || null;
  const transactionRefId = metadata?.transactionRefId || null;
  const hasPayeeData = Boolean(payeeName || payeeVpa);
  const timestamp = formatScanTimestamp(record.created_at);

  // Checks supported payment-app schemes and stores only confirmed installed apps.
  useEffect(() => {
    let isMounted = true;

    void findInstalledUpiApps().then((apps) => {
      if (isMounted) setInstalledUpiApps(apps);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  //Default Return
  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.titleRow}>
          <View style={styles.providerIcon}>
            <MaterialCommunityIcons name="bank-transfer" size={22} color={colors.secondary.main} />
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.providerName}>{provider.app}</Text>
            <Text numberOfLines={2} style={styles.providerBank}>{provider.bank}</Text>
          </View>
          <Pressable
            accessibilityLabel={`Open ${provider.app}`}
            accessibilityRole="link"
            disabled={!paymentUrl}
            onPress={() => void openUpiPayment(paymentUrl)}
            style={({ pressed }) => [
              styles.openPaymentButton,
              !paymentUrl && styles.disabledOpenPaymentButton,
              pressed && styles.pressedOpenPaymentButton
            ]}
          >
            <MaterialCommunityIcons
              name="arrow-top-right"
              size={20}
              color={paymentUrl ? colors.secondary.main : colors.mute.light}
            />
          </Pressable>
        </View>

        <View style={styles.timestampRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.mute.main} />
          <Text style={styles.timestamp}>{timestamp.date}</Text>
          <View style={styles.timestampDot} />
          <Text style={styles.timestamp}>{timestamp.time}</Text>
        </View>
      </View>

      {hasPayeeData ? (
        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>Paying to</Text>
          <View style={styles.payeeCard}>
            {payeeName ? <Text style={styles.payeeName}>{payeeName}</Text> : null}
            {payeeVpa ? <Text selectable numberOfLines={1} style={styles.payeeVpa}>{payeeVpa}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.detailSection}>
        <Text style={styles.sectionLabel}>UPI App Installed</Text>
        <View style={styles.upiAppsCard}>
          {installedUpiApps.length > 0 ? installedUpiApps.map((app, index) => (
            <View
              key={app.name}
              style={[
                styles.upiAppRow,
                index < installedUpiApps.length - 1 && styles.upiAppRowDivider
              ]}
            >
              <View style={[styles.upiAppIcon, { backgroundColor: app.iconBackground }]}>
                <MaterialCommunityIcons name={app.icon} size={20} color={app.iconColor} />
              </View>
              <Text style={styles.upiAppName}>{app.name}</Text>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.success.main} />
            </View>
          )) : (
            <View style={styles.noUpiAppsRow}>
              <MaterialCommunityIcons name="cellphone-remove" size={20} color={colors.mute.light} />
              <Text style={styles.noUpiAppsText}>No Apps Found</Text>
            </View>
          )}
        </View>
      </View>

      {amount ? <PaymentDetail label="Amount" value={amount} /> : null}
      {transactionNote ? <PaymentDetail label="Transaction note" value={transactionNote} /> : null}
      {transactionRefId ? <PaymentDetail label="Reference ID" value={transactionRefId} /> : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Opens an already stored UPI payment scan in its payment app chooser.
export async function processUpiPaymentScan(scan: StoredScanReference): Promise<void> {
  await Linking.openURL(scan.value);
};//export ends

/* ------------------ BREAK ------------------ */

// Renders one optional UPI payment detail with a missing-value fallback.
function PaymentDetail({ label, value }: PaymentDetailProps) {
  //Default Return
  return (
    <View style={styles.detailSection}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.detailCard}>
        <Text selectable style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );//return ends
};//func ends

// Finds recognized UPI apps through their registered deep-link schemes.
async function findInstalledUpiApps(): Promise<UpiAppDefinition[]> {
  const availability = await Promise.all(
    upiAppDefinitions.map(async (app) => {
      try {
        return await Linking.canOpenURL(app.scheme) ? app : null;
      } catch (error: unknown) {
        console.warn(`Unable to check the ${app.name} payment intent:`, error);
        return null;
      };//try-catch ends
    })
  );

  return availability.filter((app): app is UpiAppDefinition => app !== null);
};//func ends

// Resolves a payment app and partner bank from the exact handle after the VPA at-sign.
function getUpiProvider(payeeVpa: string | null): Omit<UpiHandle, "identifier"> {
  const normalizedHandle = payeeVpa?.split("@").pop()?.trim().toLowerCase() || "";
  const matchedHandle = upiHandles.find(({ identifier }) => identifier.toLowerCase() === normalizedHandle);

  return matchedHandle
    ? { app: matchedHandle.app, bank: matchedHandle.bank }
    : { app: "UPI Payment", bank: "Unknown partner bank" };
};//func ends

// Accepts only a complete UPI payment URL before handing it to the operating system.
function getSafeUpiPaymentUrl(value: string): string | null {
  const paymentUrl = value.trim();
  return /^upi:\/\/pay(?:\?|$)/i.test(paymentUrl) ? paymentUrl : null;
};//func ends

// Reopens a stored UPI payment request without starting scan collection.
async function openUpiPayment(paymentUrl: string | null): Promise<void> {
  if (!paymentUrl) return;

  try {
    await Linking.openURL(paymentUrl);
  } catch (error: unknown) {
    console.error("Unable to reopen UPI payment request:", error);
  };//try-catch ends
};//func ends

// Formats a stored UPI amount and currency for display.
function formatAmount(amount: string | null | undefined, currency: string | null | undefined): string | null {
  if (!amount) return null;
  return currency ? `${currency} ${amount}` : amount;
};//func ends

// Formats the scan timestamp into separate local date and time values.
function formatScanTimestamp(value: string): { date: string; time: string } {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) return { date: value, time: "" };

  return {
    date: timestamp.toLocaleDateString(),
    time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  summaryCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  providerIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.secondary.light
  },
  titleContent: {
    minWidth: 0,
    flex: 1
  },
  providerName: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1,
    lineHeight: 22
  },
  providerBank: {
    marginTop: spacing.xxs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: 20
  },
  openPaymentButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  disabledOpenPaymentButton: {
    backgroundColor: colors.cream.dark
  },
  pressedOpenPaymentButton: {
    opacity: 0.65
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light
  },
  timestamp: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  timestampDot: {
    width: 3,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.mute.light
  },
  detailSection: {
    gap: spacing.xs
  },
  sectionLabel: {
    paddingHorizontal: spacing.xs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  payeeCard: {
    minHeight: 72,
    justifyContent: "center",
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  payeeName: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1,
    lineHeight: 22
  },
  payeeVpa: {
    color: colors.primary.light,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption,
    lineHeight: 18
  },
  upiAppsCard: {
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  upiAppRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  upiAppRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light
  },
  upiAppIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md
  },
  upiAppName: {
    minWidth: 0,
    flex: 1,
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.body2
  },
  noUpiAppsRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  noUpiAppsText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2
  },
  detailCard: {
    minHeight: 64,
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  detailValue: {
    color: colors.primary.light,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption,
    lineHeight: 18
  }
});
