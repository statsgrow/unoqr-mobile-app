import { useEffect, useState } from "react";
import { Check, Eye } from "lucide-react-native";
import { useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { PxModal } from "@/components/elements/PxModal";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { digitalCardLayoutOptions, getDigitalCardLayout } from "@/libraries/digitalcards-layouts";
import { sampleLayoutData, sampleLayoutPortraits } from "@/libraries/digitalcards-layouts/sampleLayoutData";
import type { DigitalCardLayoutType } from "@/helpers/digital_cards/model";
import QrColorPicker from "@/helpers/qrcodes/create/QrColorPicker";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type DigitalCardLayoutProps = {
  refreshing: boolean;
  onRefresh: () => void;
  layout: DigitalCardLayoutType;
  primaryColor: string;
  onDraftChange: (layout: DigitalCardLayoutType, primaryColor: string) => void;
  onSave: (layout: DigitalCardLayoutType, primaryColor: string) => Promise<void>;
};
type LayoutFormValues = { layout: DigitalCardLayoutType; primaryColor: string };
type LayoutThumbnailProps = { layout: DigitalCardLayoutType; primaryColor: string; width: number };
const PREVIEW_WIDTH = 360;
const PRIMARY_COLORS = [colors.secondary.main, "#315E9C", "#214D3A", "#5B2A69", "#C04A74", "#953B24", "#D68A16"];

/* ------------------ BREAK ------------------ */

// Shows the current frontend card designs and saves the chosen layout and primary color.
export default function DigitalCardLayout({ refreshing, onRefresh, layout, primaryColor, onDraftChange, onSave }: DigitalCardLayoutProps) {
  const form = useForm<LayoutFormValues>({ defaultValues: { layout, primaryColor } });
  const [previewLayout, setPreviewLayout] = useState<DigitalCardLayoutType | null>(null);
  const selectedLayout = form.watch("layout");
  const selectedColor = form.watch("primaryColor");
  const { errors, isSubmitting, isDirty } = form.formState;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const optionWidth = (width - insets.left - insets.right - spacing.md * 2 - spacing.sm) / 2;
  const PreviewLayout = previewLayout ? getDigitalCardLayout(previewLayout) : null;
  const previewLabel = digitalCardLayoutOptions.find((option) => option.value === previewLayout)?.label;

  // Shares unsaved appearance choices with the parent Preview action.
  useEffect(() => {
    const subscription = form.watch(() => { const values = form.getValues(); onDraftChange(values.layout, values.primaryColor); });
    return () => subscription.unsubscribe();
  }, [form, onDraftChange]);

  // Saves the layout and primary color without changing any of the dummy preview content.
  const handleSave = async (values: LayoutFormValues): Promise<void> => {
    form.clearErrors("root.save");
    try {
      await onSave(values.layout, values.primaryColor);
      form.reset(values);
    } catch (saveError: unknown) {
      form.setError("root.save", { type: "manual", message: saveError instanceof Error ? saveError.message : "Your card appearance could not be saved. Try again." });
    };//try-catch ends
  };//func ends

  // Updates the draft layout immediately without saving it.
  const handleSelect = (nextLayout: DigitalCardLayoutType): void => {
    form.setValue("layout", nextLayout, { shouldDirty: true });
  };//func ends

  // Applies the draft primary color to every sample preview.
  const handleColorChange = (nextColor: string): void => {
    form.setValue("primaryColor", nextColor, { shouldDirty: true });
  };//func ends

  //Default Return
  return (
    <GeneralLayout
      topView={null}
      edges={["bottom"]}
      style={styles.root}
      bodyStyle={styles.content}
      onRefresh={onRefresh}
      refreshing={refreshing}
      pullToRefreshEnabled={!isSubmitting}
      hideBottomViewOnKeyboard
      bottomNav={isDirty || isSubmitting || errors.root?.save?.message ? <View style={styles.footer}>
        {errors.root?.save?.message ? <Text accessibilityRole="alert" style={styles.errorText}>{errors.root.save.message}</Text> : null}
        {isDirty || isSubmitting ? <Pressable accessibilityRole="button" disabled={isSubmitting || refreshing} onPress={() => void form.handleSubmit(handleSave)()} style={styles.saveButton}>
          {isSubmitting ? <PxCircularProgress color={colors.white.main} /> : null}
          <Text style={styles.saveText}>{isSubmitting ? "Saving…" : "Save Now"}</Text>
        </Pressable> : null}
      </View> : null}
    >
      <View pointerEvents={isSubmitting ? "none" : "auto"}>
        <QrColorPicker
          name="Primary"
          color={selectedColor}
          onChangeColor={handleColorChange}
          presets={PRIMARY_COLORS}
          hint="Black, white and grey stay fixed."
        />
      </View>
      <View style={styles.grid}>
        {digitalCardLayoutOptions.map((option) => {
          const selected = option.value === selectedLayout;
          //Default Return
          return (
            <View
              key={option.value}
              style={[styles.option, { width: optionWidth }, selected && styles.selectedOption]}
            >
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={option.label + " card layout"}
                accessibilityState={{ checked: selected, disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={() => handleSelect(option.value)}
                style={({ pressed }) => pressed && styles.pressedOption}
              >
                <LayoutThumbnail layout={option.value} primaryColor={selectedColor} width={optionWidth - 4} />
                <View style={[styles.optionFooter, selected && styles.selectedOptionFooter]}>
                  <Text numberOfLines={1} style={[styles.optionLabel, selected && styles.selectedOptionLabel]}>{option.label}</Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Preview ${option.label} layout`}
                onPress={() => setPreviewLayout(option.value)}
                style={({ pressed }) => [styles.previewButton, pressed && styles.pressedOption]}
              >
                <Eye size={20} strokeWidth={1.25} color={selected ? colors.white.main : colors.primary.main} />
              </Pressable>
              {selected ? (
                <View pointerEvents="none" style={styles.selectedBadge}>
                  <Check size={14} strokeWidth={1.25} color={colors.white.main} />
                </View>
              ) : null}
            </View>
          );//return ends
        })}
      </View>

      {previewLayout && PreviewLayout ? <PxModal
        visible
        name={`${previewLabel} layout`}
        height="full"
        onRequestClose={() => setPreviewLayout(null)}
      >
        <View pointerEvents="none" style={styles.sampleCard}>
          <PreviewLayout data={{ ...sampleLayoutData, photo: sampleLayoutPortraits[previewLayout] }} primaryColor={selectedColor} isPreview />
        </View>
      </PxModal> : null}
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Crops the shared native layout to a compact identity thumbnail for the picker.
function LayoutThumbnail({ layout, primaryColor, width }: LayoutThumbnailProps) {
  const Layout = getDigitalCardLayout(layout);
  const scale = width / PREVIEW_WIDTH;
  //Default Return
  return <View pointerEvents="none" style={[styles.preview, { height: width }]}>
    <View style={[styles.previewCanvas, { transform: [{ scale }] }]}>
      <View style={styles.sampleCard}><Layout data={{ ...sampleLayoutData, photo: sampleLayoutPortraits[layout] }} primaryColor={primaryColor} isPreview /></View>
    </View>
  </View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "flex-start" },
  option: { borderRadius: radii.xl, borderWidth: 2, borderColor: colors.line.main, overflow: "hidden", backgroundColor: colors.cream.main },
  selectedOption: { borderColor: colors.secondary.main },
  pressedOption: { opacity: 0.85 },
  preview: { overflow: "hidden" },
  previewCanvas: { position: "absolute", top: 0, left: 0, width: PREVIEW_WIDTH, backgroundColor: colors.cream.main, transformOrigin: "top left" },
  sampleCard: { padding: spacing.md },
  optionFooter: { minHeight: 48, paddingVertical: spacing.sm, paddingLeft: spacing.sm, paddingRight: 44, justifyContent: "center", backgroundColor: colors.white.main },
  selectedOptionFooter: { backgroundColor: colors.secondary.main },
  optionLabel: { fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2, color: colors.primary.main },
  selectedOptionLabel: { color: colors.white.main },
  previewButton: { position: "absolute", bottom: 0, right: 0, width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  selectedBadge: { position: "absolute", top: spacing.xs, right: spacing.xs, padding: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.secondary.main },
  footer: { gap: spacing.xs },
  errorText: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, color: colors.error.main, textAlign: "center" },
  saveButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: colors.secondary.main, borderRadius: radii.lg },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
