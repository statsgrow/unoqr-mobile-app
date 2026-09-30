import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Text } from "react-native-paper";

import { PxButton } from "@/components/elements/PxButton";
import { PxDialog } from "@/components/elements/PxDialog";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { redirect } from "@/utils/general/Redirect";
import { Toast } from "@/utils/general/Toast";

/* ------------------ BREAK ------------------ */

export type BarcodeScanDetails = {
  id: string;
  kind: string;
  value: string;
};

type BarcodeScanDialogProps = {
  details: BarcodeScanDetails | null;
  onClose: () => void;
};

/* ------------------ BREAK ------------------ */

// Shows a saved barcode with copy, online search, and saved scan actions.
export function BarcodeScanDialog({ details, onClose }: BarcodeScanDialogProps) {
  const [copied, setCopied] = useState(false);
  const [searching, setSearching] = useState(false);

  // Reset the copy confirmation for each newly saved barcode.
  useEffect(() => {
    setCopied(false);
  }, [details?.id]);

  // Copy the exact barcode value, including any leading zeros.
  const handleCopy = async (): Promise<void> => {
    if (!details) return;

    try {
      await Clipboard.setStringAsync(details.value);
      setCopied(true);
    } catch {
      Toast.error({ message: "Unable to copy the barcode. Please try again." });
    };//try-catch ends
  };//func ends

  // Search for the barcode only after the user selects the online search action.
  const handleSearch = async (): Promise<void> => {
    if (!details || searching) return;

    setSearching(true);
    try {
      const query = `${details.kind} ${details.value}`;
      await WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    } catch {
      Toast.error({ message: "Unable to open search. Please try again." });
    } finally {
      setSearching(false);
    };//try-catch-finally ends
  };//func ends

  // Close the result dialog and open the barcode's existing saved scan page.
  const handleViewDetails = (): void => {
    if (!details) return;

    onClose();
    redirect("push", `/scans/${details.id}/view`);
  };//func ends

  //Default Return
  return (
    <PxDialog
      open={Boolean(details)}
      setOpen={(open) => {
        if (!open) onClose();
      }}
      title="Barcode scanned"
      subtitle="This barcode was saved to My Scans."
      color="secondary"
    >
      {details ? (
        <>
          <View style={styles.formatCard}>
            <MaterialCommunityIcons name="barcode-scan" size={30} color={colors.neutral.main} />
            <View style={styles.formatText}>
              <Text style={styles.label}>Format</Text>
              <Text style={styles.format}>{details.kind.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.label}>Barcode value</Text>
            <ScrollView style={styles.valueScroll}>
              <Text selectable style={styles.value}>{details.value}</Text>
            </ScrollView>
          </View>

          <PxButton fullWidth color="secondary" startIcon={copied ? "check" : "content-copy"} onPress={() => void handleCopy()}>
            {copied ? "Copied" : "Copy barcode"}
          </PxButton>
          <PxButton fullWidth mode="outlined" color="primary" startIcon="magnify" loading={searching} disabled={searching} onPress={() => void handleSearch()}>
            Search online
          </PxButton>
          <PxButton fullWidth mode="text" color="primary" startIcon="file-document-outline" onPress={handleViewDetails}>
            View details
          </PxButton>
        </>
      ) : null}
    </PxDialog>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  formatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.cream.main,
    borderRadius: radii.lg
  },
  formatText: { flex: 1, gap: spacing.xxs },
  label: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  format: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  valueCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg
  },
  valueScroll: { maxHeight: 120 },
  value: {
    color: colors.primary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.body1
  }
});
