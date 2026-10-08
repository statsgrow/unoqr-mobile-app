import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pencil, Trash2 } from "lucide-react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useForm } from "react-hook-form";

import { PxDialog } from "@/components/elements/PxDialog";
import { PxButton } from "@/components/elements/PxButton";
import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { PxModal } from "@/components/elements/PxModal";
import { PxTextArea as PxTextarea } from "@/components/form/PxTextArea";
import { PxTags } from "@/components/form/PxTags";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { TopNav } from "@/components/layout/TopNav";
import { getScanById } from "@/helpers/scans/db/getQueries";
import { deleteSavedScan } from "@/helpers/scans/deleteScan";
import { getScanTypeInit } from "@/helpers/scans/identifiers";
import { getPhoneNumber } from "@/helpers/scans/identifiers/PhoneNumber";
import { crawlPendingUrlById, saveScanNotes } from "@/helpers/scans/scanSync";
import { BarcodeScan } from "@/helpers/scans/scanTypes/Barcode";
import { PhoneScan } from "@/helpers/scans/scanTypes/Phone";
import { PlainText } from "@/helpers/scans/scanTypes/Text";
import { UpiPayment } from "@/helpers/scans/scanTypes/UpiPayment";
import { VCardScan } from "@/helpers/scans/scanTypes/VCard";
import { Website } from "@/helpers/scans/scanTypes/Website";
import { getScanCrawlError } from "@/helpers/scans/status";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

type ScanRecord = NonNullable<Awaited<ReturnType<typeof getScanById>>>;

type ScanDetailState = {
  record: ScanRecord | null;
  loading: boolean;
  crawling: boolean;
  error: string | null;
};

type ScanNotesForm = {
  comment: string;
  tags: string[];
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const notesForm = useForm<ScanNotesForm>({ defaultValues: { comment: "", tags: [] } });
  const notesScanId = useRef<string | null>(null);

  // Saves the current notes to SQLite and retries their cloud upload before resetting the form.
  const handleSaveNotes = notesForm.handleSubmit(async (values): Promise<void> => {
    if (!scanId || isSavingNotes) return;
    setIsSavingNotes(true);
    setNotesError(null);
    try {
      const notes = await saveScanNotes(scanId, { comment: values.comment, tags: values.tags });
      notesForm.reset({ comment: notes.comment ?? "", tags: notes.tags });
      const saved = await getScanById(scanId);
      setDetailState((current) => ({ ...current, record: saved }));
      setIsNotesOpen(false);
    } catch (error: unknown) {
      setNotesError(GetError({ error }).message);
    } finally {
      setIsSavingNotes(false);
    };//try-catch ends
  });

  // Deletes the cloud scan first, then its local row, and reports errors without leaving the page.
  const handleDeleteScan = async (): Promise<void> => {
    if (!scanId || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSavedScan({ id: scanId });
      setIsDeleteDialogOpen(false);
      goToScansList();
    } catch (error: unknown) {
      setDeleteError(GetError({ error }).message);
    } finally {
      setIsDeleting(false);
    };//try-catch ends
  };//func ends

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
        if (notesScanId.current !== scanId || !notesForm.formState.isDirty) {
          notesForm.reset({ comment: record?.comment ?? "", tags: record?.tags ?? [] });
          notesScanId.current = scanId;
        };//if ends

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
          isSyncComplete={record?.sync_status === "synced" && !record.notes_pending}
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
            rightAction={(
              <Pressable accessibilityLabel="Delete scan" accessibilityRole="button" disabled={isDeleting} hitSlop={spacing.xs}
                onPress={() => { setDeleteError(null); setIsDeleteDialogOpen(true); }} style={styles.deleteButton}>
                <Trash2 size={24} strokeWidth={1.25} color={colors.error.main} />
              </Pressable>
            )}
          />
          <ScanTypeContent record={record} />
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesTitle}>Comments &amp; Tags</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Edit comments and tags" hitSlop={spacing.xs}
                onPress={() => { setNotesError(null); setIsNotesOpen(true); }} style={styles.notesEditButton}>
                <Pencil size={20} strokeWidth={1.25} color={colors.primary.main} />
              </Pressable>
            </View>
            {record.comment ? <Text numberOfLines={3} style={styles.notesComment}>{record.comment}</Text> : null}
            {record.tags.length ? (
              <View style={styles.notesTags}>
                {record.tags.map((tag) => <View key={tag} style={styles.notesTag}><Text style={styles.notesTagText}>{tag}</Text></View>)}
              </View>
            ) : null}
            {!record.comment && !record.tags.length ? <Text style={styles.notesComment}>Add a comment or tags to organize this scan.</Text> : null}
          </View>
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
      <PxModal visible={isNotesOpen} onRequestClose={() => { if (!isSavingNotes) setIsNotesOpen(false); }}
        name="Comments & Tags" height="auto" maxHeight={760} keyboardAvoiding hideCloseButton={isSavingNotes} closeOnBackdropClick={!isSavingNotes}
        footer={(
          <View style={styles.notesFooter}>
            {notesError ? <Text style={styles.deleteError}>{notesError}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Save scan notes" accessibilityState={{ disabled: isSavingNotes }}
              disabled={isSavingNotes} onPress={() => void handleSaveNotes()} style={[styles.saveNotesButton, isSavingNotes && styles.saveNotesButtonDisabled]}>
              {isSavingNotes ? <ActivityIndicator size="small" color={colors.white.main} /> : <Text style={styles.saveNotesText}>Save Now</Text>}
            </Pressable>
          </View>
        )}>
        <View style={styles.notesInputs}>
          <PxTextarea name="comment" RHF={notesForm} label="Comment" placeholder="Add a comment about this scan" disabled={isSavingNotes} />
          <PxTags value={notesForm.watch("tags")} onChange={(tags) => notesForm.setValue("tags", tags, { shouldDirty: true })}
            label="Tags" placeholder="Type a tag and tap +" disabled={isSavingNotes} />
        </View>
      </PxModal>
      <PxDialog open={isDeleteDialogOpen} setOpen={(open) => { if (!isDeleting) setIsDeleteDialogOpen(open); }}
        title="Delete scan?" subtitle="This removes the scan from your cloud history and this device." disableBackdropClick={isDeleting} hideCloseButton={isDeleting}>
        <View style={styles.deleteDialog}>
          {deleteError ? <Text accessibilityRole="alert" style={styles.deleteError}>{deleteError}</Text> : null}
          <PxButton disabled={isDeleting} loading={isDeleting} onPress={() => void handleDeleteScan()}>Delete scan</PxButton>
        </View>
      </PxDialog>
      <PxDialog
        open={isSyncInfoOpen}
        setOpen={setIsSyncInfoOpen}
        title={record?.notes_pending ? "Notes saved on this device" : record?.sync_status === "synced" ? "Saved to cloud" : "Cloud sync is not active"}
        subtitle={record?.notes_pending ? "Your comment and tags are saved locally and waiting to sync to the cloud."
          : record?.sync_status === "synced"
          ? getScanCrawlError(record.crawl_status, record.metadata?.error)
            ? "This scan is saved in the cloud, but link details could not be collected."
            : "This scan is saved in the cloud."
          : "This scan is saved only on this device because you are not logged in. Log in later to access your scans across devices."}
        color={record?.sync_status === "synced" && !record.notes_pending ? "success" : "warning"}
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
  if (record.type !== "barcode" && getPhoneNumber(record.value)) return <PhoneScan key={record.id} value={record.value} createdAt={record.created_at} />;
  if (/^BEGIN:VCARD(?:\r?\n|\r)/i.test(record.value)) return <VCardScan key={record.id} value={record.value} createdAt={record.created_at} />;
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
  if (record.type !== "barcode" && getPhoneNumber(record.value)) return "Phone Number";
  if (/^BEGIN:VCARD(?:\r?\n|\r)/i.test(record.value)) return "vCard";
  const scanType = /^upi:\/\//i.test(record.value) ? "upi_payment" : record.type;
  return getScanTypeInit(scanType).label;
};//func ends

// Provides supporting page copy for scan types that benefit from added context.
function getScanTypeDescription(record: ScanRecord): string | undefined {
  if (record.type !== "barcode" && getPhoneNumber(record.value)) return "Call the phone number saved from your scan.";
  if (/^BEGIN:VCARD(?:\r?\n|\r)/i.test(record.value)) return "View or download the contact saved from your scan.";
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
  notesFooter: { width: "100%", gap: spacing.xs },
  saveNotesButton: { width: "100%", minHeight: 56, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  saveNotesButtonDisabled: { opacity: 0.45 },
  saveNotesText: { color: colors.white.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.body1 },
  notesInputs: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  notesCard: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  notesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  notesTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  notesEditButton: { padding: spacing.xs },
  notesComment: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, lineHeight: 20 },
  notesTags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  notesTag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.cream.main },
  notesTagText: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  deleteButton: { padding: spacing.xs },
  deleteDialog: { gap: spacing.sm },
  deleteError: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
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
