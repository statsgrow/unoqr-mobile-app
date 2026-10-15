import { useState } from "react";
import { useForm } from "react-hook-form";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

import { PxTextInput } from "@/components/form/PxTextInput";
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

const SOCIAL_PLATFORMS: PxSelectOption[] = [
  "Link", "Website", "Company Website", "LinkedIn", "Instagram", "Calendly", "X", "Facebook", "Threads", "Snapchat",
  "TikTok", "YouTube", "GitHub", "Yelp", "Venmo", "PayPal", "CashApp", "Discord", "Signal", "Skype", "Telegram", "Twitch", "WhatsApp", "Pinterest"
].map((platform) => ({ label: platform, value: platform }));

/* ------------------ BREAK ------------------ */

// Collects a platform and URL in an RHF form before adding or updating the card's social link.
export default function SocialLinkDialog({ link, onClose, onSave }: SocialLinkDialogProps) {
  const form = useForm<DigitalCardSocialLink>({ defaultValues: link ?? { label: "", url: "" }, mode: "onChange" });
  const [platformOpen, setPlatformOpen] = useState(false);
  const { isValid } = form.formState;

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
      footerAction={(
        <View>
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
        <PxTextInput RHF={form} name="url" label="Profile URL" placeholder="https://…" keyboardType="url" autoCapitalize="none" autoCorrect={false} rules={{ validate: validateSocialUrl }} />
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
  saveButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  disabledButton: { opacity: 0.65 },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
