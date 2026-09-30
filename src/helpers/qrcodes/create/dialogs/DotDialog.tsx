import type { ComponentType } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PxModal } from "@/components/elements/PxModal";
import ClassyDotIcon from "@/helpers/qrcodes/assets/dot/classy";
import ConnectedDotIcon from "@/helpers/qrcodes/assets/dot/connected";
import type { DotIconProps } from "@/helpers/qrcodes/assets/dot/DotIcon";
import DotsIcon from "@/helpers/qrcodes/assets/dot/dots";
import RoundedDotIcon from "@/helpers/qrcodes/assets/dot/rounded";
import SquareDotIcon from "@/helpers/qrcodes/assets/dot/square";
import QrColorPicker from "@/helpers/qrcodes/create/QrColorPicker";
import type { DotStyle } from "@/helpers/qrcodes/modify/dot";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

import { selectedFirst } from "./selectedFirst";

/* ------------------ BREAK ------------------ */

type DotDialogProps = {
  visible: boolean;
  onClose: () => void;
  dotStyle: DotStyle;
  dotColor: string;
  onChangeStyle: (style: DotStyle) => void;
  onChangeColor: (color: string) => void;
};

type DotOption = {
  style: DotStyle;
  label: string;
  Icon: ComponentType<DotIconProps>;
};

/* ------------------ BREAK ------------------ */

const DOT_OPTIONS: DotOption[] = [
  { style: "square", label: "Square", Icon: SquareDotIcon },
  { style: "rounded", label: "Rounded", Icon: RoundedDotIcon },
  { style: "dots", label: "Dots", Icon: DotsIcon },
  { style: "classy", label: "Classy", Icon: ClassyDotIcon },
  { style: "connected", label: "Connected", Icon: ConnectedDotIcon }
];

/* ------------------ BREAK ------------------ */

// Lets users choose a QR data module shape and color without changing the eyes.
export default function DotDialog({ visible, onClose, dotStyle, dotColor, onChangeStyle, onChangeColor }: DotDialogProps) {
  //Default Return
  return (
    <PxModal visible={visible} onRequestClose={onClose} name="Dot" height="auto" maxHeight={760} keyboardAvoiding>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Dot shape</Text>
        <ScrollView key={dotStyle} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
          {selectedFirst(DOT_OPTIONS, dotStyle).map(({ style, label, Icon }) => (
            <Pressable
              key={style}
              accessibilityLabel={`${label} dots`}
              accessibilityRole="button"
              accessibilityState={{ selected: dotStyle === style }}
              onPress={() => onChangeStyle(style)}
              style={[styles.option, dotStyle === style && styles.selectedOption]}
            >
              <Icon color={dotColor} size={38} />
              <Text style={[styles.optionLabel, dotStyle === style && styles.selectedLabel]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <QrColorPicker name="Dot" color={dotColor} onChangeColor={onChangeColor} onReset={() => onChangeColor("")} />
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
  selectedLabel: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold }
});
