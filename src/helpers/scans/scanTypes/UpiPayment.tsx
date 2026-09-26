import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Text } from "react-native-paper";

import { PxButton } from "@/components/elements/PxButton";
import { UpiPaymentIcon } from "@/helpers/scans/components/UpiPaymentIcon";
import { getScanById } from "@/helpers/scans/db/getQueries";
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

type EmvTlvField = {
  tag: string;
  value: string;
};

export type UpiPaymentDetails = {
  paymentUrl: string;
  payeeVpa: string;
  payeeName: string | null;
  merchantCategoryCode: string | null;
  transactionRefId: string | null;
  transactionNote: string | null;
  amount: string | null;
  currency: string;
  isMerchant: boolean;
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

const bharatQrPayloadFormat = "01";
const bharatQrStaticPointOfInitiation = "11";
const bharatQrDynamicPointOfInitiation = "12";
const indiaCountryCode = "IN";
const inrNumericCurrencyCode = "356";
const inrUpiCurrencyCode = "INR";
const upiMerchantAccountAid = "A000000524";
const maxUpiPaymentUrlLength = 4_096;
const uniqueUpiParameters = ["pa", "pn", "mc", "tr", "tn", "am", "mam", "cu", "url"] as const;

/* ------------------ BREAK ------------------ */

// Shows a UPI payment summary with the provider inferred from the payee VPA.
export function UpiPayment({ record }: UpiPaymentProps) {
  const [upiIdCopied, setUpiIdCopied] = useState(false);
  const metadata = record.metadata;
  const paymentDetails = getUpiPaymentDetails(record.value);
  const payeeVpa = metadata?.payeeVpa || paymentDetails?.payeeVpa || null;
  const payeeName = metadata?.payeeName || paymentDetails?.payeeName || null;
  const provider = getUpiProvider(payeeVpa);
  const amount = formatAmount(metadata?.amount || paymentDetails?.amount, metadata?.currency || paymentDetails?.currency);
  const transactionNote = metadata?.transactionNote || paymentDetails?.transactionNote || null;
  const transactionRefId = metadata?.transactionRefId || paymentDetails?.transactionRefId || null;
  const isMerchant = metadata?.isMerchant === true
    || paymentDetails?.isMerchant === true
    || hasMerchantUpiIndicator(record.value);
  const hasPayeeData = Boolean(payeeName || payeeVpa);
  const timestamp = formatScanTimestamp(record.created_at);

  // Copies the stored payee UPI ID for manual use in the user's preferred payment app.
  const handleCopyUpiId = async () => {
    if (!payeeVpa) return;

    await Clipboard.setStringAsync(payeeVpa);
    setUpiIdCopied(true);
  };//func ends

  //Default Return
  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.titleRow}>
          <UpiPaymentIcon />
          <View style={styles.titleContent}>
            <Text style={styles.providerName}>{provider.app}</Text>
            <Text numberOfLines={2} style={styles.providerBank}>{provider.bank}</Text>
            {isMerchant ? (
              <View style={styles.merchantChip}>
                <MaterialCommunityIcons name="storefront-outline" size={14} color={colors.primary.contrast} />
                <Text style={styles.merchantChipText}>Merchant</Text>
              </View>
            ) : null}
          </View>
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
            {payeeVpa ? (
              <View style={styles.copyButtonContainer}>
                <PxButton
                  fullWidth
                  size="sm"
                  color="secondary"
                  mode="outlined"
                  startIcon={upiIdCopied ? "check" : "content-copy"}
                  onPress={() => void handleCopyUpiId()}
                >
                  {upiIdCopied ? "UPI ID copied" : "Copy UPI ID"}
                </PxButton>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {amount ? <PaymentDetail label="Amount" value={amount} /> : null}
      {transactionNote ? <PaymentDetail label="Transaction note" value={transactionNote} /> : null}
      {transactionRefId ? <PaymentDetail label="Reference ID" value={transactionRefId} /> : null}

    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Converts a valid BharatQR payload with complete merchant UPI credentials into a guarded payment URL.
export function checkBharatQr(value: string): string | null {
  const payload = value.trim();
  if (!payload.startsWith("000201") || !isAsciiText(payload)) return null;

  const fields = parseEmvTlv(payload);
  if (!fields || !hasValidBharatQrCrc(payload, fields)) return null;
  if (getEmvField(fields, "00") !== bharatQrPayloadFormat) return null;
  const pointOfInitiation = getEmvField(fields, "01");
  if (![bharatQrStaticPointOfInitiation, bharatQrDynamicPointOfInitiation].includes(pointOfInitiation || "")) {
    return null;
  };//if ends
  if (getEmvField(fields, "53") !== inrNumericCurrencyCode) return null;
  if (getEmvField(fields, "58")?.toUpperCase() !== indiaCountryCode) return null;

  const payeeVpa = findBharatQrUpiVpa(fields);
  const payeeName = getEmvField(fields, "59")?.trim() || "";
  const merchantCategoryCode = getEmvField(fields, "52") || "";
  const additionalData = parseOptionalEmvTemplate(fields, "62");
  const transactionRefId = additionalData ? getEmvField(additionalData, "05")?.trim() || "" : "";
  const transactionNote = additionalData ? getEmvField(additionalData, "08")?.trim() || "" : "";

  if (!isValidUpiVpa(payeeVpa)) return null;
  if (!payeeName || !isMerchantCategoryCode(merchantCategoryCode)) return null;
  if (!isValidTransactionRef(transactionRefId)) return null;

  const parameters: Array<[string, string]> = [
    ["pa", payeeVpa],
    ["pn", payeeName],
    ["mc", merchantCategoryCode],
    ["tr", transactionRefId],
    ["cu", inrUpiCurrencyCode]
  ];
  const amount = getEmvField(fields, "54");

  if (amount && isValidUpiAmount(amount)) parameters.push(["am", amount]);
  if (transactionNote && isValidUpiText(transactionNote, 80)) parameters.push(["tn", transactionNote]);

  const encodedParameters = parameters
    .map(([key, parameterValue]) => `${key}=${encodeURIComponent(parameterValue)}`)
    .join("&");

  const paymentUrl = `upi://pay?${encodedParameters}`;
  return getUpiPaymentDetails(paymentUrl)?.paymentUrl || null;
};//export ends

/* ------------------ BREAK ------------------ */

// Parses one complete EMV QR value into its ordered tag-length-value fields.
function parseEmvTlv(value: string): EmvTlvField[] | null {
  const fields: EmvTlvField[] = [];
  let offset = 0;

  while (offset < value.length) {
    if (offset + 4 > value.length) return null;

    const tag = value.slice(offset, offset + 2);
    const lengthText = value.slice(offset + 2, offset + 4);

    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) return null;

    const length = Number(lengthText);
    const valueStart = offset + 4;
    const valueEnd = valueStart + length;

    if (valueEnd > value.length) return null;

    fields.push({ tag, value: value.slice(valueStart, valueEnd) });
    offset = valueEnd;
  }

  return offset === value.length ? fields : null;
};//func ends

// Returns one unique EMV field and rejects ambiguous duplicate tags.
function getEmvField(fields: EmvTlvField[], tag: string): string | null {
  const matches = fields.filter((field) => field.tag === tag);
  return matches.length === 1 ? matches[0].value : null;
};//func ends

// Parses an optional nested EMV template while rejecting malformed or duplicate root fields.
function parseOptionalEmvTemplate(fields: EmvTlvField[], tag: string): EmvTlvField[] | null {
  const templateValue = getEmvField(fields, tag);
  return templateValue ? parseEmvTlv(templateValue) : null;
};//func ends

// Finds the VPA inside the NPCI merchant-account template range.
function findBharatQrUpiVpa(fields: EmvTlvField[]): string | null {
  for (const field of fields) {
    const numericTag = Number(field.tag);
    if (numericTag < 26 || numericTag > 51) continue;

    const merchantFields = parseEmvTlv(field.value);
    if (!merchantFields || getEmvField(merchantFields, "00") !== upiMerchantAccountAid) continue;

    const candidateVpa = getEmvField(merchantFields, "01");
    if (isValidUpiVpa(candidateVpa)) return candidateVpa;
  }

  return null;
};//func ends

// Verifies the terminal EMV CRC field against CRC-16/CCITT-FALSE.
function hasValidBharatQrCrc(payload: string, fields: EmvTlvField[]): boolean {
  const crcField = fields.at(-1);

  if (crcField?.tag !== "63" || !/^[0-9a-f]{4}$/i.test(crcField.value)) return false;

  const crcInput = payload.slice(0, -crcField.value.length);
  return calculateEmvCrc(crcInput) === crcField.value.toUpperCase();
};//func ends

// Calculates the uppercase four-character CRC-16/CCITT-FALSE checksum used by EMV QR.
function calculateEmvCrc(value: string): string {
  let crc = 0xFFFF;

  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0
        ? ((crc << 1) ^ 0x1021) & 0xFFFF
        : (crc << 1) & 0xFFFF;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
};//func ends

// Accepts only a single safe UPI virtual payment address.
function isValidUpiVpa(value: string | null): value is string {
  if (!value || value.length > 255) return false;
  return /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*$/i.test(value);
};//func ends

// Accepts a positive UPI amount with no more than two decimal places.
function isValidUpiAmount(value: string): boolean {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return false;
  return Number(value) > 0;
};//func ends

// Recognizes an assigned-looking MCC while excluding the zero-only placeholder used by individual UPI links.
function isMerchantCategoryCode(value: string | null): value is string {
  return Boolean(value && /^\d{4}$/.test(value) && !/^0+$/.test(value));
};//func ends

// Accepts a merchant transaction reference that can be passed without changing its meaning.
function isValidTransactionRef(value: string): boolean {
  return /^[a-z0-9._-]{1,35}$/i.test(value);
};//func ends

// Accepts bounded printable text without control characters.
function isValidUpiText(value: string, maxLength: number): boolean {
  return value.length > 0 && value.length <= maxLength && !/[\u0000-\u001F\u007F]/.test(value);
};//func ends

// Limits EMV parsing to single-byte printable content so field lengths remain unambiguous.
function isAsciiText(value: string): boolean {
  return /^[\x20-\x7E]+$/.test(value);
};//func ends

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

// Resolves a payment app and partner bank from the exact handle after the VPA at-sign.
function getUpiProvider(payeeVpa: string | null): Omit<UpiHandle, "identifier"> {
  const normalizedHandle = payeeVpa?.split("@").pop()?.trim().toLowerCase() || "";
  const matchedHandle = upiHandles.find(({ identifier }) => identifier.toLowerCase() === normalizedHandle);

  return matchedHandle
    ? { app: matchedHandle.app, bank: matchedHandle.bank }
    : { app: "UPI Payment", bank: "Unknown partner bank" };
};//func ends

// Parses and validates critical UPI parameters while preserving the complete supplied payment URL.
export function getUpiPaymentDetails(value: string): UpiPaymentDetails | null {
  const paymentUrl = value.trim();

  if (!paymentUrl || paymentUrl.length > maxUpiPaymentUrlLength) return null;
  if (/[\u0000-\u001F\u007F]/.test(paymentUrl) || /%(?![0-9a-f]{2})/i.test(paymentUrl)) return null;

  try {
    const parsedUrl = new URL(paymentUrl);
    const hasExpectedDestination = parsedUrl.protocol.toLowerCase() === "upi:"
      && parsedUrl.hostname.toLowerCase() === "pay"
      && (parsedUrl.pathname === "" || parsedUrl.pathname === "/")
      && !parsedUrl.username
      && !parsedUrl.password
      && !parsedUrl.hash;

    if (!hasExpectedDestination || hasDuplicateUpiParameters(parsedUrl.searchParams)) return null;

    const payeeVpa = parsedUrl.searchParams.get("pa")?.trim() || null;
    const payeeName = parsedUrl.searchParams.get("pn")?.trim() || null;
    const merchantCategoryCode = parsedUrl.searchParams.get("mc")?.trim() || null;
    const transactionRefId = parsedUrl.searchParams.get("tr")?.trim() || null;
    const transactionNote = parsedUrl.searchParams.get("tn")?.trim() || null;
    const amount = parsedUrl.searchParams.get("am")?.trim() || null;
    const minimumAmount = parsedUrl.searchParams.get("mam")?.trim() || null;
    const currency = parsedUrl.searchParams.get("cu")?.trim().toUpperCase() || inrUpiCurrencyCode;
    const referenceUrl = parsedUrl.searchParams.get("url")?.trim() || null;

    if (!isValidUpiVpa(payeeVpa)) return null;
    if (payeeName && !isValidUpiText(payeeName, 100)) return null;
    if (merchantCategoryCode && !/^\d{4}$/.test(merchantCategoryCode)) return null;
    if (transactionRefId && !isValidTransactionRef(transactionRefId)) return null;
    if (transactionNote && !isValidUpiText(transactionNote, 80)) return null;
    if (amount && !isValidUpiAmount(amount)) return null;
    if (minimumAmount && !isValidUpiAmount(minimumAmount)) return null;
    if (currency !== inrUpiCurrencyCode) return null;
    if (referenceUrl && !isSafeUpiReferenceUrl(referenceUrl)) return null;

    return {
      paymentUrl,
      payeeVpa,
      payeeName,
      merchantCategoryCode,
      transactionRefId,
      transactionNote,
      amount,
      currency,
      isMerchant: isMerchantCategoryCode(merchantCategoryCode)
    };
  } catch {
    return null;
  };//try-catch ends
};//export ends

// Detects an MCC on legacy saved UPI rows so merchant labeling survives stricter validation.
function hasMerchantUpiIndicator(value: string): boolean {
  try {
    const paymentUrl = new URL(value.trim());
    const merchantCategoryCode = paymentUrl.searchParams.get("mc")?.trim() || "";
    return paymentUrl.protocol.toLowerCase() === "upi:"
      && paymentUrl.hostname.toLowerCase() === "pay"
      && isMerchantCategoryCode(merchantCategoryCode);
  } catch {
    return false;
  };//try-catch ends
};//func ends

// Rejects ambiguous repeated values for parameters used to authorize or describe a payment.
function hasDuplicateUpiParameters(parameters: URLSearchParams): boolean {
  return uniqueUpiParameters.some((parameter) => parameters.getAll(parameter).length > 1);
};//func ends

// Accepts only HTTP(S) transaction-reference URLs included in a UPI request.
function isSafeUpiReferenceUrl(value: string): boolean {
  try {
    const referenceUrl = new URL(value);
    return ["http:", "https:"].includes(referenceUrl.protocol.toLowerCase())
      && Boolean(referenceUrl.hostname)
      && !referenceUrl.username
      && !referenceUrl.password;
  } catch {
    return false;
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
  merchantChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary.main
  },
  merchantChipText: {
    color: colors.primary.contrast,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
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
  copyButtonContainer: {
    marginTop: spacing.sm
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
