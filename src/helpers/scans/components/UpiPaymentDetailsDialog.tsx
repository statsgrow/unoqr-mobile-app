import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Text } from "react-native-paper";

import { PxButton } from "@/components/elements/PxButton";
import { PxDialog } from "@/components/elements/PxDialog";
import { UpiPaymentIcon } from "@/helpers/scans/components/UpiPaymentIcon";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

export type UpiPaymentDialogDetails = {
  payeeName: string | null;
  payeeVpa: string;
};

type UpiPaymentDetailsDialogProps = {
  details: UpiPaymentDialogDetails | null;
  onClose: () => void;
};

/* ------------------ BREAK ------------------ */

// Shows saved UPI payee details and lets the user copy the UPI ID without opening a payment app.
export function UpiPaymentDetailsDialog({ details, onClose }: UpiPaymentDetailsDialogProps) {
  const [upiIdCopied, setUpiIdCopied] = useState(false);

  // Resets the copy confirmation whenever the dialog opens with different payment details.
  useEffect(() => {
    setUpiIdCopied(false);
  }, [details]);

  // Copies the exact payee UPI ID for manual use in the user's preferred payment app.
  const handleCopyUpiId = async () => {
    if (!details) return;

    await Clipboard.setStringAsync(details.payeeVpa);
    setUpiIdCopied(true);
  };//func ends

  //Default Return
  return (
    <PxDialog
      open={Boolean(details)}
      setOpen={(open) => {
        if (!open) onClose();
      }}
      title="UPI Payment"
      color="secondary"
    >
      {details ? (
        <>
          <View style={styles.payeeHeader}>
            <UpiPaymentIcon size={46} />
            <View style={styles.payeeHeaderText}>
              <Text style={styles.payeeLabel}>Payee</Text>
              <Text style={styles.payeeName}>{details.payeeName || "Name not provided"}</Text>
            </View>
          </View>

          <View style={styles.upiIdCard}>
            <Text style={styles.upiIdLabel}>UPI ID</Text>
            <Text selectable style={styles.upiIdValue}>{details.payeeVpa}</Text>
          </View>

          <PxButton
            fullWidth
            color="secondary"
            startIcon={upiIdCopied ? "check" : "content-copy"}
            onPress={() => void handleCopyUpiId()}
          >
            {upiIdCopied ? "UPI ID copied" : "Copy UPI ID"}
          </PxButton>
        </>
      ) : null}
    </PxDialog>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  payeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radii.lg,
    backgroundColor: colors.cream.main
  },
  payeeHeaderText: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xxs
  },
  payeeLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  payeeName: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1,
    lineHeight: 22
  },
  upiIdCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  upiIdLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  upiIdValue: {
    color: colors.primary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.body2,
    lineHeight: 20
  }
});
