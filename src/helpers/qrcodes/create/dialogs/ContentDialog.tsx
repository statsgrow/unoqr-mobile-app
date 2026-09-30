import { useEffect, useState } from "react";
import { ContactRound, Globe2, Phone, Type } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";

import { PxModal } from "@/components/elements/PxModal";
import { EMPTY_CONTENT_DATA, encodeQrContent, type QrContentData, type QrContentSelection, type QrContentType } from "@/helpers/qrcodes/create/QrContent";
import { MAX_QR_CHARACTERS } from "@/helpers/qrcodes/create/QrQuality";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ContentDialogProps = {
  visible: boolean;
  onClose: () => void;
  selection: QrContentSelection | null;
  onSave: (selection: QrContentSelection, encoded: string) => void;
};

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
};

type ContentValidation = { encoded: string; error: null } | { encoded: null; error: string };

/* ------------------ BREAK ------------------ */

const CONTENT_TYPES = [
  { type: "website", label: "Website", Icon: Globe2 },
  { type: "vcard", label: "vCard", Icon: ContactRound },
  { type: "phone", label: "Phone", Icon: Phone },
  { type: "text", label: "Text", Icon: Type }
] as const;

/* ------------------ BREAK ------------------ */

// Edits one QR content type and saves its encoded value only after validation.
export default function ContentDialog({ visible, onClose, selection, onSave }: ContentDialogProps) {
  const [type, setType] = useState<QrContentType>(selection?.type || "website");
  const [data, setData] = useState<QrContentData>(selection?.data || EMPTY_CONTENT_DATA);
  const [error, setError] = useState("");
  const validation = validateContent({ type, data });
  const canSaveContent = validation.encoded !== null;

  useEffect(() => {
    if (!visible) return;
    setType(selection?.type || "website");
    setData({ ...(selection?.data || EMPTY_CONTENT_DATA) });
    setError("");
  }, [visible]);

  // Updates one field while keeping drafts for other content types.
  function updateField(field: keyof QrContentData, value: string) {
    setData((current) => ({ ...current, [field]: value }));
    setError("");
  };//func ends

  // Encodes the selected fields and enforces the QR's actual character limit.
  function handleSave() {
    const next: QrContentSelection = { type, data };
    // Keep the saved QR unchanged when its dialog draft is empty or invalid.
    if (validation.encoded === null) {
      setError(validation.error);
      return;
    };//if ends
    try {
      onSave(next, validation.encoded);
      onClose();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Please check the content.");
    };//try-catch ends
  };//func ends

  //Default Return
  return (
    <PxModal
      visible={visible}
      onRequestClose={onClose}
      name="Content"
      height={680}
      keyboardAvoiding
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSaveContent }}
          disabled={!canSaveContent}
          onPress={handleSave}
          style={[styles.saveButton, !canSaveContent && styles.disabledSaveButton]}
        >
          <Text style={[styles.saveText, !canSaveContent && styles.disabledSaveText]}>Save content</Text>
        </Pressable>
      }
    >
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Content type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
          {CONTENT_TYPES.map(({ type: option, label, Icon }) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: type === option }}
              onPress={() => { setType(option); setError(""); }}
              style={[styles.option, type === option && styles.selectedOption]}
            >
              <Icon color={colors.primary.main} size={26} strokeWidth={1.5} />
              <Text style={[styles.optionLabel, type === option && styles.selectedOptionLabel]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {type === "website" ? (
          <Field label="Website URL" value={data.website} onChangeText={(value) => updateField("website", value)} placeholder="https://example.com" keyboardType="url" />
        ) : null}
        {type === "phone" ? (
          <Field label="Phone number" value={data.phone} onChangeText={(value) => updateField("phone", value)} placeholder="+1 234 567 890" keyboardType="phone-pad" />
        ) : null}
        {type === "text" ? (
          <Field label="Text" value={data.text} onChangeText={(value) => updateField("text", value)} placeholder="Enter text to share" multiline maxLength={MAX_QR_CHARACTERS} />
        ) : null}
        {type === "vcard" ? (
          <View style={styles.fields}>
            <Field label="Full name" value={data.fullName} onChangeText={(value) => updateField("fullName", value)} placeholder="Jane Doe" />
            <Field label="Organization" value={data.organization} onChangeText={(value) => updateField("organization", value)} placeholder="Company (optional)" />
            <Field label="Phone" value={data.contactPhone} onChangeText={(value) => updateField("contactPhone", value)} placeholder="Phone (optional)" keyboardType="phone-pad" />
            <Field label="Email" value={data.email} onChangeText={(value) => updateField("email", value)} placeholder="Email (optional)" keyboardType="email-address" />
            <Field label="Website" value={data.contactWebsite} onChangeText={(value) => updateField("contactWebsite", value)} placeholder="Website (optional)" keyboardType="url" />
          </View>
        ) : null}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Checks the selected content and its encoded length before enabling Save content.
function validateContent(selection: QrContentSelection): ContentValidation {
  try {
    const encoded = encodeQrContent(selection);
    if (!encoded.trim()) throw new Error("Add content to your QR code.");
    if (Array.from(encoded).length > MAX_QR_CHARACTERS) {
      throw new Error(`Content must be ${MAX_QR_CHARACTERS} characters or fewer after formatting.`);
    };//if ends
    return { encoded, error: null };
  } catch (error: unknown) {
    return { encoded: null, error: error instanceof Error ? error.message : "Please check the content." };
  };//try-catch ends
};//func ends

// Shows one labeled input in the content sheet.
function Field({ label, value, onChangeText, placeholder, keyboardType, multiline = false, maxLength }: FieldProps) {
  //Default Return
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={keyboardType === "email-address" || keyboardType === "url" ? "none" : "sentences"}
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mute.light}
        selectionColor={colors.secondary.main}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
      />
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sectionTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  options: { gap: spacing.sm, paddingRight: spacing.sm },
  option: {
    width: 96,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  selectedOption: { borderWidth: 2, borderColor: colors.secondary.main, backgroundColor: colors.secondary.light },
  optionLabel: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  selectedOptionLabel: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold },
  fields: { gap: spacing.sm },
  field: { gap: spacing.xxs },
  fieldLabel: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main,
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body1
  },
  multilineInput: { minHeight: 112, textAlignVertical: "top" },
  error: { color: colors.secondary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  saveButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  disabledSaveButton: { backgroundColor: colors.neutral.light },
  disabledSaveText: { color: colors.mute.main }
});
