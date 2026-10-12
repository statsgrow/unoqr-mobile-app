import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PxSelect, type PxSelectOption } from "@/components/form/PxSelect";
import { PxModal } from "@/components/elements/PxModal";
import type { DigitalCardSocialLink } from "@/helpers/digital_cards/model";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type SocialLinkDialogProps = {
  link?: DigitalCardSocialLink;
  onClose: () => void;
  onSave: (link: DigitalCardSocialLink) => void;
};

const SOCIAL_PLATFORMS: PxSelectOption[] = ["LinkedIn", "Instagram", "Facebook", "X", "YouTube", "TikTok", "GitHub", "Threads", "Pinterest", "Telegram", "WhatsApp", "Website"].map((platform) => ({ label: platform, value: platform }));

/* ------------------ BREAK ------------------ */

// Collects a platform and URL in an RHF form before adding or updating the card's social link.
export default function SocialLinkDialog({ link, onClose, onSave }: SocialLinkDialogProps) {
  const form = useForm<DigitalCardSocialLink>({ defaultValues: link ?? { label: "", url: "" }, mode: "onChange" });
  const [platformOpen, setPlatformOpen] = useState(false);
  const { isValid } = form.formState;
  const insets = useSafeAreaInsets();

  // Returns the validated draft to the parent field array only when Save is pressed.
  const handleSave = (values: DigitalCardSocialLink): void => {
    Keyboard.dismiss();
    onSave({ label: values.label, url: values.url.trim() });
  };//func ends

  //Default Return
  return (
    <PxModal
      visible
      onRequestClose={onClose}
      name={link ? "Edit social link" : "Add social link"}
      height="auto"
      maxHeight={720}
      keyboardAvoiding={!platformOpen}
      footer={(
        <View style={{ paddingBottom: Platform.OS === "android" ? insets.bottom : 0 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !isValid }}
            disabled={!isValid}
            onPress={() => void form.handleSubmit(handleSave)()}
            style={({ pressed }) => [styles.saveButton, (!isValid || pressed) && styles.disabledButton]}
          >
            <Text style={styles.saveText}>Save link</Text>
          </Pressable>
        </View>
      )}
    >
      <View style={styles.content}>
        <PxSelect
          RHF={form}
          name="label"
          label="Platform"
          placeholder="Choose a platform"
          options={SOCIAL_PLATFORMS}
          onOpenChange={setPlatformOpen}
          rules={{ required: "Choose a platform." }}
        />
        <Controller
          control={form.control}
          name="url"
          rules={{ validate: validateSocialUrl }}
          render={({ field, fieldState }) => (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Profile URL</Text>
              <TextInput
                ref={field.ref}
                accessibilityLabel="Profile URL"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="https://…"
                placeholderTextColor={colors.mute.light}
                selectionColor={colors.secondary.main}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, fieldState.invalid && styles.invalidInput]}
              />
              {fieldState.error?.message ? <Text accessibilityRole="alert" style={styles.errorText}>{fieldState.error.message}</Text> : null}
            </View>
          )}
        />
      </View>
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Accepts a nonempty HTTP or HTTPS profile URL before the draft can be saved.
function validateSocialUrl(value: string): true | string {
  if (!value.trim()) return "Enter your profile URL.";
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) && Boolean(url.hostname) ? true : "Enter a link starting with https://.";
  } catch {
    return "Enter a link starting with https://.";
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  field: { gap: spacing.xs },
  fieldLabel: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  input: { minHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main, color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  invalidInput: { borderColor: colors.error.main },
  errorText: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  saveButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  disabledButton: { opacity: 0.65 },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
