import { useEffect, useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react-native";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

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

// Opens a custom color editor from the first palette swatch and applies it with the arrow.
export default function QrColorPicker({
  name, color, onChangeColor, hint = "Use a dark color for reliable scanning.",
  onReset, presets = PRESET_COLORS
}: QrColorPickerProps) {
  const [hexValue, setHexValue] = useState(color);
  const [draftColor, setDraftColor] = useState(color);
  const [pickerOpen, setPickerOpen] = useState(false);
  const validHex = HEX_COLOR.test(hexValue);
  const customColor = !presets.some((preset) => preset.toUpperCase() === color.toUpperCase());

  useEffect(() => {
    setHexValue(color);
    setDraftColor(color);
    setPickerOpen(false);
  }, [color]);

  // Keeps partial hex input editable and updates the draft when it is complete.
  function handleHexChange(value: string): void {
    const hex = value.startsWith("#") ? value : `#${value}`;
    setHexValue(hex);
    if (HEX_COLOR.test(hex)) setDraftColor(hex.toUpperCase());
  };//func ends

  // Opens the editor with the currently selected color.
  function openPicker(): void {
    setDraftColor(color);
    setHexValue(color);
    setPickerOpen(true);
  };//func ends

  // Synchronizes the draft swatch and hex field when the visual picker changes.
  function handleDraftChange(value: string): void {
    setDraftColor(value);
    setHexValue(value);
  };//func ends

  // Applies the completed custom color and returns to the palette.
  function applyCustomColor(): void {
    if (!validHex) return;
    onChangeColor(hexValue.toUpperCase());
    Keyboard.dismiss();
    setPickerOpen(false);
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
      {pickerOpen ? (
        <View style={styles.customEditor}>
          <QrVisualColorPicker color={draftColor} onChangeColor={handleDraftChange} />
          <View style={styles.hexRow}>
            <View style={styles.hexField}>
              <View style={[styles.inputSwatch, { backgroundColor: draftColor }]} />
              <TextInput
                accessibilityLabel={`Custom ${name.toLowerCase()} hex color`}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                onChangeText={handleHexChange}
                onSubmitEditing={applyCustomColor}
                placeholder="#191414"
                returnKeyType="done"
                selectionColor={colors.secondary.main}
                style={styles.hexInput}
                value={hexValue}
              />
            </View>
            <Pressable
              accessibilityLabel={`Apply custom ${name.toLowerCase()} color`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !validHex }}
              disabled={!validHex}
              onPress={applyCustomColor}
              style={[styles.applyButton, !validHex && styles.disabledButton]}
            >
              <ArrowRight color={colors.white.main} size={24} />
            </Pressable>
          </View>
          {!validHex ? <Text style={styles.colorHint}>Enter a six-digit hex color, such as #FF5528.</Text> : null}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorsHorizontal}>
          <Pressable accessibilityLabel={`Custom ${name.toLowerCase()} color`} accessibilityRole="button" onPress={openPicker} style={styles.colorOption}>
            <Svg width={42} height={42} viewBox="0 0 42 42" style={styles.rainbowRing}>
              <Defs>
                <LinearGradient id="customColorRainbow" x1="0%" y1="0%" x2="100%" y2="100%">
                  {["#FF0000", "#FF00FF", "#0000FF", "#00FFFF", "#00FF00", "#FFFF00", "#FF0000"].map((stopColor, index) => (
                    <Stop key={`${stopColor}-${index}`} offset={`${index * 100 / 6}%`} stopColor={stopColor} />
                  ))}
                </LinearGradient>
              </Defs>
              <Circle cx={21} cy={21} r={17} stroke="url(#customColorRainbow)" strokeWidth={8} fill={colors.white.main} />
            </Svg>
            <Plus color={colors.primary.main} size={24} strokeWidth={2} />
          </Pressable>
          {customColor ? (
            <Pressable accessibilityLabel={`Selected custom ${name.toLowerCase()} color ${color}`} accessibilityRole="button" accessibilityState={{ selected: true }} onPress={openPicker} style={[styles.colorOption, styles.selectedColorOption]}>
              <View style={[styles.colorSwatch, { backgroundColor: color }]} />
            </Pressable>
          ) : null}
          {swatches}
        </ScrollView>
      )}
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
  rainbowRing: { position: "absolute" },
  customEditor: { gap: spacing.md },
  hexRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hexField: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl },
  inputSwatch: { width: 30, height: 30, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border.main },
  applyButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.xl, backgroundColor: colors.secondary.main },
  disabledButton: { opacity: 0.4 },
  hexInput: {
    flex: 1,
    height: 48,
    color: colors.primary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.body1
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
