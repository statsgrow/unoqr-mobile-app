import { useEffect, useState } from "react";
import { Check } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

import QrVisualColorPicker from "./QrVisualColorPicker";

/* ------------------ BREAK ------------------ */

type QrColorPickerProps = {
  name: string;
  color: string;
  onChangeColor: (color: string) => void;
  hint?: string;
  onReset?: () => void;
  presets?: string[];
};

/* ------------------ BREAK ------------------ */

const PRESET_COLORS = [
  colors.primary.main, "#17324D", "#214D3A", "#5B2A69", "#953B24",
  colors.secondary.main, "#D68A16", "#315E9C", "#C04A74", "#5B6652"
];
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/* ------------------ BREAK ------------------ */

// Shows scrollable swatches, a visual color picker, and a custom hex field.
export default function QrColorPicker({
  name, color, onChangeColor, hint = "Use a dark color for reliable scanning.",
  onReset, presets = PRESET_COLORS
}: QrColorPickerProps) {
  const [hexValue, setHexValue] = useState(color);

  useEffect(() => {
    setHexValue(color);
  }, [color]);

  // Applies a complete hex value while preserving partial input during editing.
  function handleHexChange(value: string) {
    setHexValue(value);
    if (HEX_COLOR.test(value)) onChangeColor(value.toUpperCase());
  };//func ends

  const swatches = presets.map((preset) => {
    const selected = color.toUpperCase() === preset.toUpperCase();

    return (
      <Pressable
        key={preset}
        accessibilityLabel={`${name} color ${preset}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChangeColor(preset)}
        style={[styles.colorOption, selected && styles.selectedColorOption]}
      >
        <View style={[styles.colorSwatch, { backgroundColor: preset }]}>
          {selected ? <Check color={preset === colors.white.main || preset === colors.cream.main ? colors.primary.main : colors.white.main} size={20} strokeWidth={2.5} /> : null}
        </View>
      </Pressable>
    );//return ends
  });

  //Default Return
  return (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>{name} color</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorsHorizontal}>{swatches}</ScrollView>

      <QrVisualColorPicker color={color} onChangeColor={onChangeColor} />

      <View style={styles.hexRow}>
        <Text style={styles.hexLabel}>Custom color</Text>
        <TextInput
          accessibilityLabel={`Custom ${name.toLowerCase()} hex color`}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          onBlur={() => setHexValue(color)}
          onChangeText={handleHexChange}
          placeholder="#191414"
          selectionColor={colors.secondary.main}
          style={styles.hexInput}
          value={hexValue}
        />
      </View>
      {onReset ? (
        <Pressable accessibilityLabel={`Reset ${name.toLowerCase()} color`} accessibilityRole="button" onPress={onReset} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      ) : null}
      <Text style={styles.colorHint}>{hint}</Text>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  sectionTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  colorsHorizontal: { gap: spacing.sm, paddingRight: spacing.sm },
  colorOption: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: radii.pill },
  selectedColorOption: { borderWidth: 2, borderColor: colors.secondary.main },
  colorSwatch: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.pill },
  hexRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  hexLabel: { color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  hexInput: {
    width: 116,
    height: 42,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.md,
    color: colors.primary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.body2,
    textAlign: "center"
  },
  colorHint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  resetButton: {
    alignSelf: "center",
    minWidth: 104,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.pill,
    backgroundColor: colors.white.main
  },
  resetText: { color: colors.secondary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 }
});
