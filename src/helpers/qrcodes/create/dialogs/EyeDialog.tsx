import type { ComponentType } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PxModal } from "@/components/elements/PxModal";
import QrColorPicker from "@/helpers/qrcodes/create/QrColorPicker";
import CircleEyeIcon from "@/helpers/qrcodes/assets/eye/circle";
import type { EyeIconProps } from "@/helpers/qrcodes/assets/eye/EyeIcon";
import FrameEyeIcon from "@/helpers/qrcodes/assets/eye/frame";
import LeafEyeIcon from "@/helpers/qrcodes/assets/eye/leaf";
import RoundedEyeIcon from "@/helpers/qrcodes/assets/eye/rounded";
import SquareEyeIcon from "@/helpers/qrcodes/assets/eye/square";
import type { EyeStyle } from "@/helpers/qrcodes/modify/eye";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

import { selectedFirst } from "./selectedFirst";

/* ------------------ BREAK ------------------ */

type EyeDialogProps = {
  visible: boolean;
  onClose: () => void;
  eyeStyle: EyeStyle;
  eyeColor: string;
  onChangeStyle: (style: EyeStyle) => void;
  onChangeColor: (color: string) => void;
};

type EyeOption = {
  style: EyeStyle;
  label: string;
  Icon: ComponentType<EyeIconProps>;
};

/* ------------------ BREAK ------------------ */

const EYE_OPTIONS: EyeOption[] = [
  { style: "square", label: "Square", Icon: SquareEyeIcon },
  { style: "rounded", label: "Rounded", Icon: RoundedEyeIcon },
  { style: "circle", label: "Circle", Icon: CircleEyeIcon },
  { style: "leaf", label: "Leaf", Icon: LeafEyeIcon },
  { style: "frame", label: "Frame", Icon: FrameEyeIcon }
];

/* ------------------ BREAK ------------------ */

// Lets users choose a finder eye shape and color for the QR preview and exports.
export default function EyeDialog({ visible, onClose, eyeStyle, eyeColor, onChangeStyle, onChangeColor }: EyeDialogProps) {
  //Default Return
  return (
    <PxModal visible={visible} onRequestClose={onClose} name="Eye" height="auto" maxHeight={760}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Eye shape</Text>
        <ScrollView key={eyeStyle} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
          {selectedFirst(EYE_OPTIONS, eyeStyle).map(({ style, label, Icon }) => (
            <Pressable
              key={style}
              accessibilityLabel={`${label} eye`}
              accessibilityRole="button"
              accessibilityState={{ selected: eyeStyle === style }}
              onPress={() => onChangeStyle(style)}
              style={[styles.option, eyeStyle === style && styles.selectedOption]}
            >
              <Icon color={eyeColor} size={38} />
              <Text style={[styles.optionLabel, eyeStyle === style && styles.selectedLabel]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <QrColorPicker name="Eye" color={eyeColor} onChangeColor={onChangeColor} onReset={() => onChangeColor("")} />
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
    width: 108,
    minHeight: 90,
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
  selectedLabel: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold },
});
