import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PxModal } from "@/components/elements/PxModal";
import { FrameIcon } from "@/helpers/qrcodes/assets/frame/FrameIcon";
import QrColorPicker from "@/helpers/qrcodes/create/QrColorPicker";
import type { FrameStyle } from "@/helpers/qrcodes/modify/frame";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

import { selectedFirst } from "./selectedFirst";

/* ------------------ BREAK ------------------ */

type FrameDialogProps = {
  visible: boolean;
  onClose: () => void;
  frameStyle: FrameStyle;
  frameColor: string;
  onChangeStyle: (style: FrameStyle) => void;
  onChangeColor: (color: string) => void;
};

type FrameOption = {
  style: FrameStyle;
  label: string;
};

/* ------------------ BREAK ------------------ */

const FRAME_OPTIONS: FrameOption[] = [
  { style: "squircle", label: "Squircle" },
  { style: "round", label: "Round" },
  { style: "square", label: "Square" },
  { style: "none", label: "No frame" }
];

/* ------------------ BREAK ------------------ */

// Lets users choose a compact QR frame shape and color.
export default function FrameDialog({ visible, onClose, frameStyle, frameColor, onChangeStyle, onChangeColor }: FrameDialogProps) {
  //Default Return
  return (
    <PxModal visible={visible} onRequestClose={onClose} name="Frame" height="auto" maxHeight={760}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Frame shape</Text>
        <ScrollView key={frameStyle} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
          {selectedFirst(FRAME_OPTIONS, frameStyle).map(({ style, label }) => (
            <Pressable
              key={style}
              accessibilityLabel={style === "none" ? "No frame" : `${label} frame`}
              accessibilityRole="button"
              accessibilityState={{ selected: frameStyle === style }}
              onPress={() => onChangeStyle(style)}
              style={[styles.option, frameStyle === style && styles.selectedOption]}
            >
              <FrameIcon style={style} color={frameColor} />
              <Text style={[styles.optionLabel, frameStyle === style && styles.selectedLabel]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {frameStyle !== "none" ? (
          <QrColorPicker
            name="Frame"
            color={frameColor}
            onChangeColor={onChangeColor}
            hint="The frame uses this color. Decorative dots follow Dot color."
            onReset={() => onChangeColor("")}
          />
        ) : null}
      </View>
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  sectionTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  options: { gap: spacing.sm },
  option: {
    width: 96,
    height: 96,
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
  selectedLabel: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold }
});
