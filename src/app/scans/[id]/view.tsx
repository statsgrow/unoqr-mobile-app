import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, IconButton, Text } from "react-native-paper";

import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { getScanById } from "@/helpers/scans/db/getQueries";
import { UpiPayment } from "@/helpers/scans/scanTypes/UpiPayment";
import { Website } from "@/helpers/scans/scanTypes/Website";
import { getScanStatusColor, getScanStatusLabel } from "@/helpers/scans/status";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

type ScanDetailState = {
  record: ScanRecord | null;
  loading: boolean;
  error: string | null;
};

type ScanDetailHeaderProps = {
  finalUrl: string | null;
  status: string | null;
};

/* ------------------ BREAK ------------------ */

// Shows the complete locally stored scan row as temporary raw output.
export default function ScanDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const scanId = getRouteParam(params.id);
  const [detailState, setDetailState] = useState<ScanDetailState>({
    record: null,
    loading: true,
    error: null
  });

  // Reloads the local scan whenever this detail route receives focus.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      if (!scanId) {
        setDetailState({ record: null, loading: false, error: "This scan ID is invalid." });
        return () => {
          isMounted = false;
        };
      };//if ends

      setDetailState((currentState) => ({ ...currentState, loading: true, error: null }));

      void getScanById(scanId).then((record) => {
        if (!isMounted) return;

        setDetailState({
          record,
          loading: false,
          error: record ? null : "This scan could not be found on this device."
        });
      });

      return () => {
        isMounted = false;
      };
    }, [scanId])
  );

  const { record } = detailState;

  //Default Return
  return (
    <GeneralLayout
      topView={(
        <ScanDetailHeader
          finalUrl={record?.final_url ?? null}
          status={record?.status ?? null}
        />
      )}
      hideBottomMenu
      contentContainerStyle={styles.layoutContent}
      bodyStyle={styles.layoutBody}
    >
      {detailState.loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.secondary.main} />
          <Text style={styles.stateText}>Loading collected scan data…</Text>
        </View>
      ) : record ? (
        <View style={styles.screen}>
          <ScanTypeContent record={record} />
        </View>
      ) : (
        <View style={styles.centerState}>
          <MaterialCommunityIcons
            name="database-alert-outline"
            size={44}
            color={colors.error.main}
          />
          <Text style={styles.errorTitle}>Scan unavailable</Text>
          <Text style={styles.stateText}>{detailState.error}</Text>
          <Pressable onPress={goToScansList} style={styles.returnButton}>
            <Text style={styles.returnButtonText}>Return to My Scans</Text>
          </Pressable>
        </View>
      )}
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Selects the dedicated scan detail component for the stored scan type.
function ScanTypeContent({ record }: { record: ScanRecord }) {
  if (record.type === "url") return <Website record={record} />;
  if (record.type === "upi_payment" || /^upi:\/\//i.test(record.value)) {
    return <UpiPayment record={record} />;
  };//if ends

  //Default Return
  return (
    <View style={styles.rawOutputCard}>
      <Text selectable style={styles.rawOutput}>
        {formatRawScanRow(record)}
      </Text>
    </View>
  );//return ends
};//func ends

// Renders the detail heading, back control, and optional final-URL link button.
function ScanDetailHeader({ finalUrl, status }: ScanDetailHeaderProps) {
  const safeFinalUrl = getSafeWebUrl(finalUrl);
  const statusColor = getScanStatusColor(status);

  //Default Return
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Back to My Scans"
        accessibilityRole="button"
        onPress={goToScansList}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary.main} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.eyebrow}>MY SCANS</Text>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Collected data</Text>
          {status ? (
            <View
              accessible
              accessibilityLabel={`Status: ${getScanStatusLabel(status)}`}
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
          ) : null}
        </View>
      </View>
      <IconButton
        accessibilityLabel="Open final URL"
        disabled={!safeFinalUrl}
        icon="link-variant"
        iconColor={safeFinalUrl ? colors.secondary.main : colors.mute.light}
        onPress={() => void openFinalUrl(safeFinalUrl)}
        style={styles.linkButton}
      />
    </View>
  );//return ends
};//func ends

// Returns to the existing scan list route or opens it as a fallback.
function goToScansList() {
  router.dismissTo("/scans/list");
};//func ends

// Opens a validated final HTTP(S) destination in Expo Web Browser.
async function openFinalUrl(finalUrl: string | null): Promise<void> {
  if (!finalUrl) return;

  try {
    await WebBrowser.openBrowserAsync(finalUrl);
  } catch (error: unknown) {
    console.error("Unable to reopen final scan URL:", error);
  };//try-catch ends
};//func ends

// Converts an Expo route parameter into one string value.
function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
};//func ends

// Accepts only a complete HTTP or HTTPS final URL.
function getSafeWebUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? value : null;
  } catch {
    return null;
  };//try-catch ends
};//func ends

// Pretty-prints the complete SQLite scan row for temporary raw inspection.
function formatRawScanRow(record: ScanRecord): string {
  return JSON.stringify(record, null, 2);
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  layoutContent: {
    backgroundColor: colors.white.main
  },
  layoutBody: {
    flex: 1
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
    backgroundColor: colors.white.main
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.cream.main
  },
  pressed: {
    opacity: 0.65
  },
  headerText: {
    flex: 1
  },
  eyebrow: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    letterSpacing: 1.5
  },
  headerTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h6
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: radii.pill
  },
  linkButton: {
    margin: 0,
    backgroundColor: colors.cream.main
  },
  screen: {
    padding: spacing.lg
  },
  rawOutputCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  rawOutput: {
    color: colors.primary.light,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption
  },
  centerState: {
    minHeight: 440,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl
  },
  stateText: {
    maxWidth: 300,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    textAlign: "center"
  },
  errorTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h6
  },
  returnButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.main
  },
  returnButtonText: {
    color: colors.secondary.contrast,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.button
  }
});
