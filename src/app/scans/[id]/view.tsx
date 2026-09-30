import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text } from "react-native-paper";

import { PxDialog } from "@/components/elements/PxDialog";
import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { TopNav } from "@/components/layout/TopNav";
import { getScanById } from "@/helpers/scans/db/getQueries";
import { getScanTypeInit } from "@/helpers/scans/identifiers";
import { crawlPendingUrlById } from "@/helpers/scans/scanSync";
import { BarcodeScan } from "@/helpers/scans/scanTypes/Barcode";
import { PlainText } from "@/helpers/scans/scanTypes/Text";
import { UpiPayment } from "@/helpers/scans/scanTypes/UpiPayment";
import { Website } from "@/helpers/scans/scanTypes/Website";
import { getScanCrawlError } from "@/helpers/scans/status";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

type ScanDetailState = {
  record: ScanRecord | null;
  loading: boolean;
  crawling: boolean;
  error: string | null;
};

// Shows the complete locally stored scan row as temporary raw output.
export default function ScanDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const scanId = getRouteParam(params.id);
  const [detailState, setDetailState] = useState<ScanDetailState>({
    record: null,
    loading: true,
    crawling: false,
    error: null
  });
  const [isSyncInfoOpen, setIsSyncInfoOpen] = useState(false);

  // Reloads the local scan whenever this detail route receives focus.
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      if (!scanId) {
        setDetailState({ record: null, loading: false, crawling: false, error: "This scan ID is invalid." });
        return () => {
          isMounted = false;
        };
      };//if ends

      setDetailState((currentState) => ({ ...currentState, loading: true, crawling: false, error: null }));

      void loadScanDetail(scanId, () => {
        if (!isMounted) return;

        setDetailState((currentState) => ({ ...currentState, loading: true, crawling: true }));
      }).then((record) => {
        if (!isMounted) return;

        setDetailState({
          record,
          loading: false,
          crawling: false,
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
        <TopNav
          title="Collected data"
          showSyncStatus
          isSyncComplete={record?.sync_status === "synced"}
          onSyncInfoPress={() => setIsSyncInfoOpen(true)}
        />
      )}
      contentContainerStyle={styles.layoutContent}
      bodyStyle={styles.layoutBody}
    >
      {detailState.loading && detailState.crawling ? (
        <PxPageLoader
          title="Collecting website details"
          description="We’re checking this link and preparing the collected data."
        />
      ) : detailState.loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.secondary.main} />
          <Text style={styles.stateText}>Loading collected scan data…</Text>
        </View>
      ) : record ? (
        <View style={styles.screen}>
          <PageHeader
            title={getScanTypeLabel(record)}
            description={getScanTypeDescription(record)}
          />
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
      <PxDialog
        open={isSyncInfoOpen}
        setOpen={setIsSyncInfoOpen}
        title={record?.sync_status === "synced" ? "Saved to cloud" : "Cloud sync is not active"}
        subtitle={record?.sync_status === "synced"
          ? getScanCrawlError(record.crawl_status, record.metadata?.error)
            ? "This scan is saved in the cloud, but link details could not be collected."
            : "This scan is saved in the cloud."
          : "This scan is saved only on this device because you are not logged in. Log in later to access your scans across devices."}
        color={record?.sync_status === "synced" ? "success" : "warning"}
      />
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Loads one scan and completes pending website metadata before returning its refreshed row.
async function loadScanDetail(id: string, onCrawling: () => void): Promise<ScanRecord | null> {
  let record = await getScanById(id);

  if (record?.type === "url" && record.crawl_status === "pending") {
    onCrawling();
    await crawlPendingUrlById(id);
    record = await getScanById(id);
  };//if ends

  return record;
};//func ends

/* ------------------ BREAK ------------------ */

// Selects the dedicated scan detail component for the stored scan type.
function ScanTypeContent({ record }: { record: ScanRecord }) {
  if (record.type === "barcode") return <BarcodeScan key={record.id} record={record} />;
  if (record.type === "url" || record.type === "file") return <Website record={record} />;
  if (record.type === "text") return <PlainText record={record} />;
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

// Resolves the page heading from the stored type while recognizing legacy UPI rows.
function getScanTypeLabel(record: ScanRecord): string {
  const scanType = /^upi:\/\//i.test(record.value) ? "upi_payment" : record.type;
  return getScanTypeInit(scanType).label;
};//func ends

// Provides supporting page copy for scan types that benefit from added context.
function getScanTypeDescription(record: ScanRecord): string | undefined {
  if (record.type === "barcode") return "Copy or search the barcode saved from your scan.";
  if (record.type === "text") return "The exact text collected from this QR code.";

  return /^upi:\/\//i.test(record.value)
    ? "Payment details collected from this UPI QR code."
    : undefined;
};//func ends

// Returns to the existing scan list route or opens it as a fallback.
function goToScansList() {
  router.dismissTo("/scans/list");
};//func ends

// Converts an Expo route parameter into one string value.
function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
};//func ends

// Pretty-prints the complete SQLite scan row for temporary raw inspection.
function formatRawScanRow(record: ScanRecord): string {
  return JSON.stringify(record, null, 2);
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  layoutContent: {
    backgroundColor: colors.cream.main
  },
  layoutBody: {
    flex: 1
  },
  screen: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.cream.main
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
