import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Text } from "react-native-paper";

import { PxButton } from "@/components/elements/PxButton";
import type { getScanById } from "@/helpers/scans/db/getQueries";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { Toast } from "@/utils/general/Toast";

/* ------------------ BREAK ------------------ */

type ScanRecord = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

type BarcodeScanProps = {
  record: ScanRecord;
};

/* ------------------ BREAK ------------------ */

// Shows a saved barcode's format, timestamp, and actions in My Scans.
export function BarcodeScan({ record }: BarcodeScanProps) {
  const [copied, setCopied] = useState(false);
  const [searching, setSearching] = useState(false);

  // Copy the stored barcode exactly, preserving leading zeros.
  const handleCopy = async (): Promise<void> => {
    try {
      await Clipboard.setStringAsync(record.value);
      setCopied(true);
    } catch {
      Toast.error({ message: "Unable to copy the barcode. Please try again." });
    };//try-catch ends
  };//func ends

  // Search online for this saved value only when requested by the user.
  const handleSearch = async (): Promise<void> => {
    if (searching) return;

    setSearching(true);
    try {
      const query = `${record.kind || "barcode"} ${record.value}`;
      await WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    } catch {
      Toast.error({ message: "Unable to open search. Please try again." });
    } finally {
      setSearching(false);
    };//try-catch-finally ends
  };//func ends

  //Default Return
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="barcode-scan" size={28} color={colors.neutral.main} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.label}>Barcode format</Text>
            <Text style={styles.format}>{(record.kind || "barcode").toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.timestampRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.mute.main} />
          <Text style={styles.label}>{new Date(record.created_at).toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Barcode value</Text>
        <View style={styles.valueRow}>
          <Text selectable style={styles.value}>{record.value}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copied ? "Barcode copied" : "Copy barcode"}
            onPress={() => void handleCopy()}
            style={styles.copyButton}
          >
            <MaterialCommunityIcons name={copied ? "check" : "content-copy"} size={22} color={colors.neutral.main} />
          </Pressable>
        </View>
        <PxButton fullWidth color="secondary" startIcon="magnify" loading={searching} disabled={searching} onPress={() => void handleSearch()}>
          Search online
        </PxButton>
      </View>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  summaryText: { flex: 1, gap: spacing.xxs },
  icon: {
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.cream.main
  },
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
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light
  },
  value: {
    flex: 1,
    color: colors.primary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.body1
  },
  valueRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  copyButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg
  }
});
