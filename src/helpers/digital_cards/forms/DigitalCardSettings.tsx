import { useEffect } from "react";
import { Check } from "lucide-react-native";
import { Controller, useForm, type FieldPathByValue, type UseFormReturn } from "react-hook-form";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { BottomNav } from "@/components/layout/BottomNav";
import { PxTextArea } from "@/components/form/PxTextArea";
import { PxTextInput } from "@/components/form/PxTextInput";
import type { DigitalCardSettingsValues } from "@/helpers/digital_cards/model";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type DigitalCardSettingsProps = {
  refreshing: boolean;
  onRefresh: () => void;
  settings: DigitalCardSettingsValues;
  onDraftChange: (values: DigitalCardSettingsValues) => void;
  onSave: (settings: DigitalCardSettingsValues) => Promise<void>;
};
type SettingsToggleProps = {
  form: UseFormReturn<DigitalCardSettingsValues>;
  name: FieldPathByValue<DigitalCardSettingsValues, boolean>;
  label: string;
  description: string;
  disabled: boolean;
};

/* ------------------ BREAK ------------------ */

// Edits publication, SEO and contact preferences with RHF while preserving the settings draft.
export default function DigitalCardSettings({ refreshing, onRefresh, settings, onDraftChange, onSave }: DigitalCardSettingsProps) {
  const form = useForm<DigitalCardSettingsValues>({ defaultValues: settings });
  const { errors, isSubmitting, isDirty } = form.formState;

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

  //Default Return
  return (
    <View style={styles.root}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
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
          <PxTextInput RHF={form} name="seoTitle" label="Title" placeholder="John Doe — Product Designer" disabled={isSubmitting} />
          <PxTextArea RHF={form} name="seoDescription" label="Description" placeholder="A short introduction to you and your work" disabled={isSubmitting} />
          <SettingsToggle
            form={form}
            name="allowIndexing"
            label="Show in search engines"
            description="Allow search engines to list your published card."
            disabled={isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact sharing</Text>
          <SettingsToggle
            form={form}
            name="allowSaveContact"
            label="Allow contact download"
            description="Let visitors save your details to their contacts."
            disabled={isSubmitting}
          />
        </View>
      </ScrollView>
      <BottomNav hideMenu={true} footerAction={<View style={styles.footer}>
        {errors.root?.save?.message ? <Text accessibilityRole="alert" style={styles.errorText}>{errors.root.save.message}</Text> : null}
        {isDirty || isSubmitting ? <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          disabled={isSubmitting}
          onPress={() => void form.handleSubmit(handleSaveSettings)()}
          style={({ pressed }) => [styles.saveButton, (pressed || isSubmitting) && styles.disabledButton]}
        >
          {isSubmitting ? <ActivityIndicator color={colors.white.main} /> : null}
          <Text style={styles.saveText}>{isSubmitting ? "Saving…" : "Save Now"}</Text>
        </Pressable> : null}
      </View>} />
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders an RHF-controlled preference with its label and explanation beside the switch.
function SettingsToggle({ form, name, label, description, disabled }: SettingsToggleProps) {
  //Default Return
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <View style={styles.toggleRow}>
          <View style={styles.toggleDetails}>
            <Text style={styles.toggleLabel}>{label}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
          <Switch
            accessibilityLabel={label}
            disabled={disabled}
            value={field.value}
            onValueChange={field.onChange}
            thumbColor={colors.white.main}
            trackColor={{ false: colors.neutral.light, true: colors.secondary.main }}
            ios_backgroundColor={colors.neutral.light}
          />
        </View>
      )}
    />
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main },
  content: { gap: spacing.lg, padding: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption, lineHeight: 18 },
  fieldLabel: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  statusOptions: { flexDirection: "row", gap: spacing.xs },
  statusOption: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingHorizontal: spacing.xs, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.pill, backgroundColor: colors.white.main },
  selectedStatusOption: { borderColor: colors.secondary.main },
  statusText: { color: colors.mute.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  selectedStatusText: { color: colors.secondary.main },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.xs },
  toggleDetails: { flex: 1, gap: spacing.xxs },
  toggleLabel: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  footer: { gap: spacing.xs, padding: spacing.md, backgroundColor: colors.white.main },
  saveButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  disabledButton: { opacity: 0.65 },
  errorText: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
});
