import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react-native";
import { Controller, useFieldArray, useForm, type FieldPathByValue, type UseFormReturn } from "react-hook-form";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

import { BottomNav } from "@/components/layout/BottomNav";
import { uploadCardPhoto, deleteCardPhoto } from "@/helpers/digital_cards/api/files";
import PxFileInput from "@/components/form/PxFileInput";
import type { DigitalCardDetails, DigitalCardSocialLink } from "@/helpers/digital_cards/model";
import SocialLinkDialog from "@/helpers/digital_cards/dialogs/SocialLinkDialog";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type DigitalCardFormProps = {
  refreshing: boolean;
  onRefresh: () => void;
  details: DigitalCardDetails;
  onDraftChange: (values: DigitalCardDetails) => void;
  onSave: (details: DigitalCardDetails) => Promise<void>;
};
type CardFieldName = FieldPathByValue<DigitalCardDetails, string>;
type CardFieldProps = {
  form: UseFormReturn<DigitalCardDetails>;
  name: CardFieldName;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  required?: boolean;
  disabled: boolean;
};
type FieldButtonProps = { label: string; onPress: () => void; disabled: boolean };

/* ------------------ BREAK ------------------ */

// Edits the card details with RHF and keeps its draft intact while other sections are shown.
export default function DigitalCardForm({ refreshing, onRefresh, details, onDraftChange, onSave }: DigitalCardFormProps) {
  const [socialLinkIndex, setSocialLinkIndex] = useState<number | null>(null);
  const form = useForm<DigitalCardDetails>({ defaultValues: details, mode: "onBlur" });
  const phones = useFieldArray({ control: form.control, name: "phones", rules: { maxLength: { value: 2, message: "Add up to two phone numbers." } } });
  const emails = useFieldArray({ control: form.control, name: "emails", rules: { maxLength: { value: 2, message: "Add up to two email addresses." } } });
  const socialLinks = useFieldArray({ control: form.control, name: "socialLinks", rules: { maxLength: { value: 4, message: "Add up to four social links." } } });
  const { reset, formState: { errors, isSubmitting, isDirty } } = form;

  // Shares current RHF values with the parent for the Preview tab.
  useEffect(() => {
    const subscription = form.watch(() => onDraftChange(form.getValues()));
    return () => subscription.unsubscribe();
  }, [form, onDraftChange]);

  // Validates Details and saves the uploaded photo and other values through the supplied handler.
  const handleSaveDetails = async (values: DigitalCardDetails): Promise<void> => {
    form.clearErrors("root.save");
    try {
      const details = normalizeCardDetails(values);
      await onSave(details);
      reset(details);
    } catch (saveError: unknown) {
      form.setError("root.save", { type: "manual", message: saveError instanceof Error ? saveError.message : "Your card could not be saved. Try again." });
    };//try-catch ends
  };//func ends

  // Commits the modal's validated draft to the main RHF field array.
  const handleSaveSocialLink = (link: DigitalCardSocialLink): void => {
    if (socialLinkIndex === null) return;
    if (socialLinkIndex >= 0) {
      socialLinks.update(socialLinkIndex, link);
    } else if (form.getValues("socialLinks").length < 4) {
      socialLinks.append(link, { shouldFocus: false });
    };//if ends
    setSocialLinkIndex(null);
  };//func ends

  //Default Return
  return (
    <View style={styles.root}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} enabled={!isSubmitting} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.formContent}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal details</Text>
          <PxFileInput
            RHF={form}
            name="profilePicture"
            label="Profile picture"
            type="image"
            filename="profile-photo"
            placeholder="Add photo"
            onUpload={uploadCardPhoto}
            onRemove={deleteCardPhoto}
            disabled={isSubmitting}
          />
          <CardField form={form} name="fullname" label="Full name *" placeholder="Your full name" required disabled={isSubmitting} />
          <CardField form={form} name="company" label="Company" placeholder="Company name" disabled={isSubmitting} />
          <CardField form={form} name="position" label="Position" placeholder="Job title" disabled={isSubmitting} />
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phone numbers</Text>
            <Text style={styles.sectionCount}>{phones.fields.length}/2</Text>
          </View>
          {phones.fields.map((phone, index) => (
            <View key={phone.id} style={styles.contactRow}>
              <View style={styles.fieldColumn}>
                <CardField form={form} name={"phones." + index + ".value" as CardFieldName} label={"Phone " + (index + 1)} placeholder="+91 98765 43210" keyboardType="phone-pad" disabled={isSubmitting} />
              </View>
              {phones.fields.length > 1 ? <RemoveFieldButton label={"Remove phone " + (index + 1)} onPress={() => phones.remove(index)} disabled={isSubmitting} /> : null}
            </View>
          ))}
          {errors.phones?.root?.message ? <Text accessibilityRole="alert" style={styles.fieldError}>{errors.phones.root.message}</Text> : null}
          {phones.fields.length < 2 ? <AddFieldButton label="Add phone" onPress={() => phones.append({ value: "" })} disabled={isSubmitting} /> : null}
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Email addresses</Text>
            <Text style={styles.sectionCount}>{emails.fields.length}/2</Text>
          </View>
          {emails.fields.map((email, index) => (
            <View key={email.id} style={styles.contactRow}>
              <View style={styles.fieldColumn}>
                <CardField form={form} name={"emails." + index + ".value" as CardFieldName} label={"Email " + (index + 1)} placeholder="you@example.com" keyboardType="email-address" disabled={isSubmitting} />
              </View>
              {emails.fields.length > 1 ? <RemoveFieldButton label={"Remove email " + (index + 1)} onPress={() => emails.remove(index)} disabled={isSubmitting} /> : null}
            </View>
          ))}
          {errors.emails?.root?.message ? <Text accessibilityRole="alert" style={styles.fieldError}>{errors.emails.root.message}</Text> : null}
          {emails.fields.length < 2 ? <AddFieldButton label="Add email" onPress={() => emails.append({ value: "" })} disabled={isSubmitting} /> : null}
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Social links</Text>
            <Text style={styles.sectionCount}>{socialLinks.fields.length}/4</Text>
          </View>
          {socialLinks.fields.map((link, index) => (
            <View key={link.id} style={styles.socialLink}>
              <Pressable accessibilityRole="button" accessibilityLabel={"Edit " + (link.label || "social") + " link"} disabled={isSubmitting} onPress={() => setSocialLinkIndex(index)} style={styles.linkDetails}>
                <View style={styles.linkHeading}>
                  <Text style={styles.linkTitle}>{link.label || "Social link"}</Text>
                  <Pencil size={16} strokeWidth={1.25} color={colors.mute.main} />
                </View>
                <Text numberOfLines={1} style={styles.linkUrl}>{link.url || "Add a profile URL"}</Text>
              </Pressable>
              <RemoveFieldButton label={"Remove social link " + (index + 1)} onPress={() => socialLinks.remove(index)} disabled={isSubmitting} />
            </View>
          ))}
          {errors.socialLinks?.root?.message ? <Text accessibilityRole="alert" style={styles.fieldError}>{errors.socialLinks.root.message}</Text> : null}
          {socialLinks.fields.length < 4 ? <AddFieldButton label="Add social link" onPress={() => setSocialLinkIndex(-1)} disabled={isSubmitting} /> : null}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>About you</Text>
          <CardField form={form} name="bio" label="Bio" placeholder="A little about you and what you do" multiline disabled={isSubmitting} />
          <CardField form={form} name="address" label="Address" placeholder="Office, city, or full address" multiline disabled={isSubmitting} />
        </View>
      </ScrollView>
      <BottomNav hideMenu={true} footerAction={<View style={styles.formFooter}>
        {errors.root?.save?.message ? <Text accessibilityRole="alert" style={styles.fieldError}>{errors.root.save.message}</Text> : null}
        {isDirty || isSubmitting ? <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting || refreshing, busy: isSubmitting }}
          disabled={isSubmitting || refreshing}
          onPress={() => void form.handleSubmit(handleSaveDetails)()}
          style={({ pressed }) => [styles.saveButton, (pressed || isSubmitting) && styles.disabledButton]}
        >
          {isSubmitting ? <ActivityIndicator color={colors.white.main} /> : null}
          <Text style={styles.saveText}>{isSubmitting ? "Saving…" : "Save Now"}</Text>
        </Pressable> : null}
      </View>} />
      {socialLinkIndex !== null ? <SocialLinkDialog link={socialLinkIndex >= 0 ? form.getValues("socialLinks")[socialLinkIndex] : undefined} onClose={() => setSocialLinkIndex(null)} onSave={handleSaveSocialLink} /> : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders an RHF-controlled card field with the appropriate keyboard and inline validation.
function CardField({ form, name, label, placeholder, keyboardType = "default", multiline = false, required = false, disabled }: CardFieldProps) {
  //Default Return
  return (
    <Controller
      control={form.control}
      name={name}
      rules={{ validate: (value) => validateCardField(value, keyboardType, required) }}
      render={({ field, fieldState }) => (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            ref={field.ref}
            accessibilityLabel={label}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            editable={!disabled}
            placeholder={placeholder}
            placeholderTextColor={colors.mute.light}
            selectionColor={colors.secondary.main}
            keyboardType={keyboardType}
            autoCapitalize={keyboardType === "default" ? "sentences" : "none"}
            autoCorrect={false}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            style={[styles.input, multiline && styles.multilineInput, fieldState.invalid && styles.invalidInput]}
          />
          {fieldState.error?.message ? <Text accessibilityRole="alert" style={styles.fieldError}>{fieldState.error.message}</Text> : null}
        </View>
      )}
    />
  );//return ends
};//func ends

// Adds another contact or social profile within the section's visible limit.
function AddFieldButton({ label, onPress, disabled }: FieldButtonProps) {
  //Default Return
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.addButton, (pressed || disabled) && styles.disabledButton]}>
      <Plus size={18} strokeWidth={1.25} color={colors.secondary.main} />
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );//return ends
};//func ends

// Removes one additional contact or social profile from the RHF field array.
function RemoveFieldButton({ label, onPress, disabled }: FieldButtonProps) {
  //Default Return
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.removeButton, (pressed || disabled) && styles.disabledButton]}>
      <Trash2 size={18} strokeWidth={1.25} color={colors.mute.main} />
    </Pressable>
  );//return ends
};//func ends

// Requires a nonempty name and checks optional email addresses.
function validateCardField(value: string, keyboardType: KeyboardTypeOptions, required: boolean): true | string {
  const text = value.trim();
  if (!text) return required ? "This field is required." : true;
  if (keyboardType === "email-address" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Enter a valid email address.";
  return true;
};//func ends

// Trims the submitted details and omits empty optional contact entries from local storage.
function normalizeCardDetails(values: DigitalCardDetails): DigitalCardDetails {
  return {
    profilePicture: values.profilePicture,
    fullname: values.fullname.trim(),
    company: values.company.trim(),
    position: values.position.trim(),
    phones: values.phones.map(({ value }) => ({ value: value.trim() })).filter(({ value }) => value),
    emails: values.emails.map(({ value }) => ({ value: value.trim() })).filter(({ value }) => value),
    socialLinks: values.socialLinks.map(({ label, url }) => ({ label: label.trim(), url: url.trim() })),
    bio: values.bio.trim(),
    address: values.address.trim()
  };
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main },
  formContent: { gap: spacing.lg, padding: spacing.lg },
  formSection: { gap: spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  sectionTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  sectionCount: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  fieldColumn: { flex: 1, minWidth: 0 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  field: { gap: spacing.xxs },
  fieldLabel: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  input: { minHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main, color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  multilineInput: { minHeight: 96 },
  invalidInput: { borderColor: colors.error.main },
  fieldError: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  socialLink: { flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main },
  linkDetails: { flex: 1, gap: spacing.xxs, padding: spacing.xxs },
  linkHeading: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  linkTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  linkUrl: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  addButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
  addText: { color: colors.secondary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  removeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  disabledButton: { opacity: 0.65 },
  formFooter: { gap: spacing.xs, padding: spacing.md, backgroundColor: colors.white.main },
  saveButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
