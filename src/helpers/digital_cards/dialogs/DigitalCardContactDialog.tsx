import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Keyboard, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxModal } from "@/components/elements/PxModal";
import { PxPhoneInput } from "@/components/form/PxPhoneInput";
import { PxTextInput } from "@/components/form/PxTextInput";
import { submitDigitalCardContact, type DigitalCardContactSubmission } from "@/helpers/digital_cards/contacts/api";
import { digitalCardContactSchema } from "@/helpers/digital_cards/contacts/validations";
import { colors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

type DigitalCardContactDialogProps = {
  uid: string;
  fullname: string;
  required: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  onCollected: () => void;
  onSkip: () => void;
  onDismiss: () => void;
};

/* ------------------ BREAK ------------------ */

// Collects visitor details before native downloads, allowing skips only when collection is optional.
export default function DigitalCardContactDialog({ uid, fullname, required, open, setOpen, onCollected, onSkip, onDismiss }: DigitalCardContactDialogProps) {
  const RHF = useForm<DigitalCardContactSubmission>({ resolver: yupResolver(digitalCardContactSchema), defaultValues: { first_name: "", last_name: "", email: "", mobile: "" } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  // Cancels submission requests when leaving this scanned card.
  useEffect(() => () => request.current?.abort(), []);

  // Closes the sheet only when no visitor submission is in flight.
  function changeOpen(value: boolean): void {
    if (request.current) return;
    setError(null);
    Keyboard.dismiss();
    setOpen(value);
  };//func ends

  // Opens the native download only after the API confirms that details were stored.
  async function submitContact(contact: DigitalCardContactSubmission): Promise<void> {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    Keyboard.dismiss();
    try {
      await submitDigitalCardContact({ uid, contact, signal: controller.signal });
      if (!controller.signal.aborted) {
        // Clears submitted details before the contact sheet can reopen.
        RHF.reset();
        onCollected();
      };//if ends
    } catch (cause: unknown) {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Your details could not be shared. Please try again." }).message);
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      };//if ends
    };//try-catch ends
  };//func ends

  // Starts an optional download without creating a submitted-contact record.
  function skipCollection(): void {
    if (required || request.current) return;
    Keyboard.dismiss();
    onSkip();
  };//func ends

  //Default Return
  return <PxModal open={open} setOpen={changeOpen} onDismiss={onDismiss} name="Share your contact" closeOnBackdropClick={!busy} hideCloseButton={busy} hideFooterOnKeyboard footerAction={<View style={styles.actions}>
    {!required ? <View style={styles.skipAction}><PxButton fullWidth compact mode="outlined" color="default" disabled={busy} onPress={skipCollection}>Skip</PxButton></View> : null}
    <View style={styles.downloadAction}><PxButton fullWidth mode="contained" color="primary" loading={busy} onPress={RHF.handleSubmit(submitContact)}>Download</PxButton></View>
  </View>}>
    <View style={styles.body}>
      <Text style={styles.description}>{required ? `Share your details with ${fullname} to download this contact.` : `Share your details with ${fullname}, or skip and download the contact.`}</Text>
      <PxTextInput RHF={RHF} name="first_name" label="First name" autoComplete="given-name" maxLength={100} disabled={busy} />
      <PxTextInput RHF={RHF} name="last_name" label="Last name" autoComplete="family-name" maxLength={100} disabled={busy} />
      <PxTextInput RHF={RHF} name="email" label="Email" type="email" autoComplete="email" maxLength={254} disabled={busy} />
      <PxPhoneInput RHF={RHF} name="mobile" label="Mobile" placeholder="9876543210" disabled={busy} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  </PxModal>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  actions: { flexDirection: "row", gap: spacing.xs },
  skipAction: { flex: 3 },
  downloadAction: { flex: 7 },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
