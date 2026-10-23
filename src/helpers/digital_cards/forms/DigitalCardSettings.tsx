import { useEffect, useRef, useState } from "react";
import { Check, Globe, Pencil, Trash2 } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PxModal } from "@/components/elements/PxModal";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { PxSwitch } from "@/components/form/PxSwitch";
import { PxTextArea } from "@/components/form/PxTextArea";
import { PxTextInput } from "@/components/form/PxTextInput";
import type { DigitalCardSettingsValues } from "@/helpers/digital_cards/model";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type DigitalCardSettingsProps = {
  refreshing: boolean;
  onRefresh: () => void;
  settings: DigitalCardSettingsValues;
  cardUrl: string;
  fullname: string;
  bio: string;
  onDraftChange: (values: DigitalCardSettingsValues) => void;
  onSave: (settings: DigitalCardSettingsValues) => Promise<void>;
  onDelete?: () => Promise<void>;
};
type SeoValues = Pick<DigitalCardSettingsValues, "seoTitle" | "seoDescription" | "allowIndexing">;
type SeoDialogProps = { values: SeoValues; onClose: () => void; onApply: (values: SeoValues) => void };
/* ------------------ BREAK ------------------ */

// Edits publication, SEO and contact preferences with RHF while preserving the settings draft.
export default function DigitalCardSettings({ refreshing, onRefresh, settings, cardUrl, fullname, bio, onDraftChange, onSave, onDelete }: DigitalCardSettingsProps) {
  const [seoOpen, setSeoOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletePending = useRef(false);
  const form = useForm<DigitalCardSettingsValues>({ defaultValues: settings });
  const { errors, isSubmitting, isDirty } = form.formState;
  const seoTitle = form.watch("seoTitle");
  const seoDescription = form.watch("seoDescription");
  const allowIndexing = form.watch("allowIndexing");

  // Reflects confirmed publication while retaining other unsaved settings.
  useEffect(() => {
    form.resetField("status", { defaultValue: settings.status });
  }, [form, settings.status]);

  // Shares current RHF values with the parent for the Preview tab.
  useEffect(() => {
    const subscription = form.watch(() => onDraftChange(form.getValues()));
    return () => subscription.unsubscribe();
  }, [form, onDraftChange]);

  // Saves the settings separately from the card details, layout and QR design.
  const handleSaveSettings = async (values: DigitalCardSettingsValues): Promise<void> => {
    form.clearErrors("root.save");
    try {
      const settings = { ...values, name: values.name.trim(), seoTitle: values.seoTitle.trim(), seoDescription: values.seoDescription.trim() };
      await onSave(settings);
      form.reset(settings);
    } catch (saveError: unknown) {
      form.setError("root.save", { type: "manual", message: saveError instanceof Error ? saveError.message : "Your settings could not be saved. Try again." });
    };//try-catch ends
  };//func ends

  // Opens the deletion warning without changing the settings draft.
  const handleOpenDelete = (): void => {
    setDeleteError(null);
    setDeleteOpen(true);
  };//func ends

  // Keeps the confirmation visible until its deletion request finishes.
  const handleCloseDelete = (): void => {
    if (!deletePending.current) setDeleteOpen(false);
  };//func ends

  // Runs the confirmed deletion and retains the warning with its error when it fails.
  const handleDelete = async (): Promise<void> => {
    if (!onDelete || deletePending.current) return;
    deletePending.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      setDeleteOpen(false);
    } catch (error: unknown) {
      setDeleteError(error instanceof Error ? error.message : "Your digital card could not be deleted. Try again.");
    } finally {
      deletePending.current = false;
      setIsDeleting(false);
    };//try-catch ends
  };//func ends

  //Default Return
  return (
    <GeneralLayout
      topView={null}
      edges={["bottom"]}
      style={styles.root}
      bodyStyle={styles.content}
      onRefresh={onRefresh}
      refreshing={refreshing}
      pullToRefreshEnabled={!isSubmitting && !isDeleting}
      hideBottomViewOnKeyboard
      bottomNav={isDirty || isSubmitting || errors.root?.save?.message ? <View style={styles.footer}>
        {errors.root?.save?.message ? <Text accessibilityRole="alert" style={styles.errorText}>{errors.root.save.message}</Text> : null}
        {isDirty || isSubmitting ? <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting || isDeleting || refreshing, busy: isSubmitting }}
          disabled={isSubmitting || isDeleting || refreshing}
          onPress={() => void form.handleSubmit(handleSaveSettings)()}
          style={({ pressed }) => [styles.saveButton, (pressed || isSubmitting) && styles.disabledButton]}
        >
          {isSubmitting ? <PxCircularProgress color={colors.white.main} /> : null}
          <Text style={styles.saveText}>{isSubmitting ? "Saving…" : "Save Now"}</Text>
        </Pressable> : null}
      </View> : null}
    >
      <View style={styles.section}>
        <PxTextInput RHF={form} name="name" label="Card name *" placeholder="My Card" rules={{ validate: (value) => typeof value === "string" && !!value.trim() || "Enter a card name." }} disabled={isSubmitting} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Publication</Text>
        <Text style={styles.description}>Choose Published or Unpublished, then save to update your card.</Text>
        <Text style={styles.fieldLabel}>Status</Text>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <View style={styles.statusOptions}>
              {(["unpublished", "published"] as const).map((status) => {
                const selected = field.value === status;
                //Default Return
                return (
                  <Pressable
                    key={status}
                    accessibilityRole="radio"
                    accessibilityLabel={status === "published" ? "Published" : "Unpublished"}
                    accessibilityState={{ checked: selected, disabled: isSubmitting }}
                    disabled={isSubmitting}
                    onPress={() => field.onChange(status)}
                    style={({ pressed }) => [styles.statusOption, selected && styles.selectedStatusOption, pressed && styles.disabledButton]}
                  >
                    {selected ? <Check size={16} strokeWidth={1.25} color={colors.secondary.main} /> : null}
                    <Text style={[styles.statusText, selected && styles.selectedStatusText]}>{status === "published" ? "Published" : "Unpublished"}</Text>
                  </Pressable>
                );//return ends
              })}
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SEO</Text>
        <Text style={styles.description}>Choose how your card is described in search results and shared links.</Text>
        <View style={styles.searchCard}>
          <View style={styles.searchHeader}>
            <View style={styles.searchSite}>
              <Globe size={22} strokeWidth={1.25} color={colors.mute.main} />
              <View style={styles.searchSiteCopy}>
                <Text style={styles.searchSiteName}>UNOQR</Text>
                <Text numberOfLines={1} style={styles.searchUrl}>{cardUrl.replace(/^https?:\/\//, "")}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit SEO settings" disabled={isSubmitting} onPress={() => setSeoOpen(true)} style={styles.seoEdit}>
              <Pencil size={20} strokeWidth={1.25} color={colors.primary.main} />
            </Pressable>
          </View>
          <Text numberOfLines={2} style={styles.searchTitle}>{seoTitle.trim() || fullname || settings.name}</Text>
          <Text numberOfLines={3} style={styles.searchDescription}>{seoDescription.trim() || bio || "Add a description of your digital card."}</Text>
          <Text style={styles.description}>{allowIndexing ? "Search visibility enabled" : "Hidden from search engines"}</Text>
        </View>
        {seoOpen ? <SeoDialog values={{ seoTitle, seoDescription, allowIndexing }} onClose={() => setSeoOpen(false)} onApply={(values) => {
          form.setValue("seoTitle", values.seoTitle, { shouldDirty: true });
          form.setValue("seoDescription", values.seoDescription, { shouldDirty: true });
          form.setValue("allowIndexing", values.allowIndexing, { shouldDirty: true });
          setSeoOpen(false);
        }} /> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact sharing</Text>
        <PxSwitch
          RHF={form}
          name="allowSaveContact"
          label="Allow contact download"
          description="Let visitors save your details to their contacts."
          disabled={isSubmitting}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collect Contact</Text>
        <PxSwitch
          RHF={form}
          name="isContactRequired"
          label="Require contact details"
          description="When on, visitors must share their details before downloading your contact. When off, sharing is optional and the download starts immediately."
          disabled={isSubmitting}
        />
      </View>
      {onDelete ? <View style={styles.section}>
        <Text style={styles.deleteTitle}>Delete digital card</Text>
        <Text style={styles.description}>Permanently remove your digital card and its public link.</Text>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting || refreshing || isDeleting}
          onPress={handleOpenDelete}
          style={({ pressed }) => [styles.deleteOutlineButton, pressed && styles.disabledButton]}
        >
          <Trash2 size={18} strokeWidth={1.25} color={colors.error.main} />
          <Text style={styles.deleteOutlineText}>Delete digital card</Text>
        </Pressable>
      </View> : null}
      <PxModal
        visible={deleteOpen}
        name="Delete digital card?"
        height="auto"
        onRequestClose={handleCloseDelete}
        hideCloseButton={isDeleting}
        closeOnBackdropClick={!isDeleting}
        footerAction={<View style={styles.deleteActions}>
          <Pressable accessibilityRole="button" disabled={isDeleting} onPress={handleCloseDelete} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm delete digital card"
            accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
            disabled={isDeleting}
            onPress={() => void handleDelete()}
            style={({ pressed }) => [styles.confirmDeleteButton, (pressed || isDeleting) && styles.disabledButton]}
          >
            {isDeleting ? <PxCircularProgress color={colors.white.main} size={20} /> : <Trash2 size={18} strokeWidth={1.25} color={colors.white.main} />}
            <Text style={styles.saveText}>{isDeleting ? "Deleting…" : "Delete"}</Text>
          </Pressable>
        </View>}
      >
        <View style={styles.deleteWarning}>
          <Text style={styles.warningText}>Your digital card will be permanently deleted. Its link and QR code will no longer open your card. This cannot be undone.</Text>
          {deleteError ? <Text accessibilityRole="alert" style={styles.errorText}>{deleteError}</Text> : null}
        </View>
      </PxModal>
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Edits a local SEO draft and applies it to the page's existing Save Now flow.
function SeoDialog({ values, onClose, onApply }: SeoDialogProps) {
  const form = useForm<SeoValues>({ defaultValues: values });
  //Default Return
  return <PxModal open setOpen={(open) => { if (!open) onClose(); }} name="SEO settings" height="auto" footerAction={<View>
    <Pressable accessibilityRole="button" onPress={() => void form.handleSubmit(onApply)()} style={styles.saveButton}><Text style={styles.saveText}>Done</Text></Pressable>
  </View>}>
    <View style={styles.seoFields}>
      <PxTextInput RHF={form} name="seoTitle" label="Title" placeholder="John Doe — Product Designer" />
      <PxTextArea RHF={form} name="seoDescription" label="Description" placeholder="A short introduction to you and your work" />
      <PxSwitch RHF={form} name="allowIndexing" label="Show in search engines" description="Allow search engines to list your published card." />
    </View>
  </PxModal>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main },
  content: { gap: spacing.lg, padding: spacing.lg },
  section: { gap: spacing.sm },
  searchCard: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white.main, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg },
  searchHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchSite: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchSiteCopy: { flex: 1, gap: spacing.xxs },
  searchSiteName: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  searchUrl: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  seoEdit: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radii.pill },
  searchTitle: { color: colors.info.dark, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.subtitle1 },
  searchDescription: { color: colors.mute.dark, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, lineHeight: 21 },
  seoFields: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sectionTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption, lineHeight: 18 },
  fieldLabel: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  statusOptions: { flexDirection: "row", gap: spacing.xs },
  statusOption: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingHorizontal: spacing.xs, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.pill, backgroundColor: colors.white.main },
  selectedStatusOption: { borderColor: colors.secondary.main },
  statusText: { color: colors.mute.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  selectedStatusText: { color: colors.secondary.main },
  deleteTitle: { color: colors.error.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  deleteOutlineButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderWidth: 1, borderColor: colors.error.main, borderRadius: radii.lg },
  deleteOutlineText: { color: colors.error.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  deleteWarning: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  warningText: { color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, lineHeight: 21 },
  deleteActions: { flexDirection: "row", gap: spacing.sm },
  cancelButton: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main },
  cancelText: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  confirmDeleteButton: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radii.lg, backgroundColor: colors.error.main },
  footer: { gap: spacing.xs },
  saveButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radii.lg, backgroundColor: colors.primary.main },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  disabledButton: { opacity: 0.65 },
  errorText: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
});
