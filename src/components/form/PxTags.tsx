import { useState } from "react";
import { Plus, X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type PxTagsProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

/* ------------------ BREAK ------------------ */

// Edits a string array through a text input and removable tag chips.
export function PxTags({ value, onChange, label, placeholder = "Add a tag", disabled = false }: PxTagsProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  // Adds a trimmed tag once and leaves the input ready for the next tag.
  const addTag = (): void => {
    const tag = draft.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/ +/g, " ").trim();
    if (disabled || !tag) return;
    if (!value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    };//if ends
    setDraft("");
  };//func ends

  //Default Return
  return (
    <View style={[styles.wrapper, disabled && styles.disabled]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputShell, focused && styles.focused]}>
        <TextInput
          accessibilityLabel={label || "Tags"}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addTag}
          submitBehavior="submit"
          returnKeyType="done"
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.mute.main}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Add tag" disabled={disabled || !draft.trim()}
          onPress={addTag} style={styles.addButton}>
          <Plus size={20} strokeWidth={1.25} color={draft.trim() ? colors.secondary.main : colors.mute.light} />
        </Pressable>
      </View>
      {value.length ? (
        <View style={styles.tags}>
          {value.map((tag, index) => (
            <View key={`${tag}-${index}`} style={styles.chip}>
              <Text style={styles.tagText}>{tag}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove tag ${tag}`} disabled={disabled}
                hitSlop={spacing.xxs} onPress={() => onChange(value.filter((_, tagIndex) => tagIndex !== index))}>
                <X size={16} strokeWidth={1.25} color={colors.mute.dark} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { marginLeft: spacing.xxs, color: colors.mute.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  inputShell: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main },
  focused: { borderColor: colors.primary.main },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body1 },
  addButton: { padding: spacing.sm },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { flexDirection: "row", alignItems: "center", flexShrink: 1, gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.pill, backgroundColor: colors.white.main },
  tagText: { flexShrink: 1, color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  disabled: { opacity: 0.7 }
});
