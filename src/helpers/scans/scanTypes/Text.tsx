import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Text } from "react-native-paper";

import { PxButton } from "@/components/elements/PxButton";
import { PxDialog } from "@/components/elements/PxDialog";
import { getScanById } from "@/helpers/scans/db/getQueries";
import type { StoredScanReference } from "@/helpers/scans/db/persistScan";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type TextScanDialogProps = {
  value: string | null;
  onClose: () => void;
};

type ScanRecord = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

type PlainTextProps = {
  record: ScanRecord;
};

/* ------------------ BREAK ------------------ */

// Renders the stored plain text with a scan summary, timestamp, and copy action.
export function PlainText({ record }: PlainTextProps) {
  const [valueCopied, setValueCopied] = useState(false);
  const timestamp = formatScanTimestamp(record.created_at);

  // Copies the exact stored text without applying formatting or normalization.
  const handleCopyValue = async () => {
    await Clipboard.setStringAsync(record.value);
    setValueCopied(true);
  };//func ends

  //Default Return
  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.titleRow}>
          <View style={styles.textIcon}>
            <MaterialCommunityIcons name="text-box-outline" size={22} color={colors.primary.main} />
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.summaryTitle}>Plain text</Text>
            <Text style={styles.summarySubtitle}>Text content saved from this QR code</Text>
          </View>
        </View>

        <View style={styles.timestampRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.mute.main} />
          <Text style={styles.timestamp}>{timestamp.date}</Text>
          <View style={styles.timestampDot} />
          <Text style={styles.timestamp}>{timestamp.time}</Text>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.sectionLabel}>Scanned text</Text>
        <View style={styles.textCard}>
          <Text selectable style={styles.textValue}>
            {record.value}
          </Text>
          <PxButton
            fullWidth
            mode="outlined"
            color="secondary"
            startIcon={valueCopied ? "check" : "content-copy"}
            onPress={() => void handleCopyValue()}
          >
            {valueCopied ? "Copied" : "Copy text"}
          </PxButton>
        </View>
      </View>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Shows a saved text scan and copies its exact original QR value on request.
export function TextScanDialog({ value, onClose }: TextScanDialogProps) {
  const [valueCopied, setValueCopied] = useState(false);

  // Resets the copy confirmation whenever a different text scan is displayed.
  useEffect(() => {
    setValueCopied(false);
  }, [value]);

  // Copies the raw text without rewriting its content or field syntax.
  const handleCopyValue = async () => {
    if (!value) return;

    await Clipboard.setStringAsync(value);
    setValueCopied(true);
  };//func ends

  //Default Return
  return (
    <PxDialog
      open={Boolean(value)}
      setOpen={(open) => {
        if (!open) onClose();
      }}
      title="Text scanned"
      subtitle="This text was saved to My Scans."
      color="secondary"
    >
      {value ? (
        <>
          <ScrollView style={styles.valueScroll}>
            <Text selectable style={styles.rawValue}>
              {value}
            </Text>
          </ScrollView>
          <PxButton
            fullWidth
            color="secondary"
            startIcon={valueCopied ? "check" : "content-copy"}
            onPress={() => void handleCopyValue()}
          >
            {valueCopied ? "Copied" : "Copy value"}
          </PxButton>
        </>
      ) : null}
    </PxDialog>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Returns an already stored text value unchanged for its result dialog.
export function processTextScan(scan: StoredScanReference): string {
  return scan.value;
};//export ends

/* ------------------ BREAK ------------------ */

// Formats the stored scan timestamp into separate local date and time values.
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
    alignItems: "center",
    gap: spacing.sm
  },
  textIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neutral.light,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  titleContent: {
    minWidth: 0,
    flex: 1
  },
  summaryTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1,
    lineHeight: 22
  },
  summarySubtitle: {
    marginTop: spacing.xxs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: 20
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
  textCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  textValue: {
    color: colors.primary.light,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.body2,
    lineHeight: 21
  },
  valueScroll: {
    maxHeight: 300
  },
  rawValue: {
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.md,
    color: colors.mute.dark,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption,
    lineHeight: 17
  }
});
