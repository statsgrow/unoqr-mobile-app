import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxModal } from "@/components/elements/PxModal";
import { PxTextArea } from "@/components/form/PxTextArea";
import { PxTextInput } from "@/components/form/PxTextInput";
import { colors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

import { saveGroup } from "../api";
import type { DigitalCardGroup, GroupValues } from "../types";

/* ------------------ BREAK ------------------ */

type Props = { open: boolean; setOpen: (open: boolean) => void; group?: DigitalCardGroup; onSaved: (group: DigitalCardGroup) => void; onDelete?: () => void; deleting?: boolean; deleteError?: string | null };

/* ------------------ BREAK ------------------ */

// Creates or renames an owned group using the shared form fields and modal action footer.
export default function GroupFormDialog({ open, setOpen, group, onSaved, onDelete, deleting = false, deleteError }: Props) {
  const form = useForm<GroupValues>({ defaultValues: { name: "", description: "" } });
  const [error, setError] = useState<string | null>(null);
  const saving = form.formState.isSubmitting;

  // Starts each opening from confirmed group values rather than an older cancelled draft.
  useEffect(() => {
    if (open) { form.reset({ name: group?.name ?? "", description: group?.description ?? "" }); setError(null); };//if ends
  }, [open, group, form.reset]);

  // Commits validated details before notifying the owning page and dismissing the sheet.
  async function submit(values: GroupValues): Promise<void> {
    setError(null);
    try {
      const saved = await saveGroup({ name: values.name.trim(), description: values.description.trim() }, group?.uid);
      onSaved(saved);
      setOpen(false);
    } catch (cause: unknown) {
      setError(GetError({ error: cause, message: "Your group could not be saved." }).message);
    };//try-catch ends
  };//func ends

  //Default Return
  return <PxModal open={open} setOpen={value => { if (!saving && !deleting) setOpen(value); }} name={group ? "Group settings" : "Create group"} footerAction={<View style={styles.actions}>
    {group && onDelete ? <PxButton mode="contained-tonal" color="error" fullWidth loading={deleting} disabled={saving || deleting} onPress={onDelete}>Delete group</PxButton> : null}
    <PxButton mode="contained" color="primary" fullWidth loading={saving} disabled={saving || deleting} onPress={form.handleSubmit(submit)}>{group ? "Save changes" : "Create group"}</PxButton>
  </View>}>
    <View style={styles.body}>
      <Text style={styles.hint}>Organize your business cards by department or team.</Text>
      <PxTextInput RHF={form} name="name" label="Group name" disabled={saving || deleting} placeholder="e.g. Sales" maxLength={120} rules={{ required: "Enter a group name.", validate: value => Boolean(value.trim()) || "Enter a group name." }} />
      <PxTextArea RHF={form} name="description" label="Description" disabled={saving || deleting} placeholder="What is this group for?" maxLength={2000} />
      {error || deleteError ? <Text accessibilityRole="alert" style={styles.error}>{error || deleteError}</Text> : null}
    </View>
  </PxModal>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  body: { gap: spacing.md, paddingHorizontal: spacing.lg },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
