import { StyleSheet, View } from "react-native";

import { PxModal } from "@/components/elements/PxModal";
import QrColorPicker from "@/helpers/qrcodes/create/QrColorPicker";
import { colors, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ColorDialogProps = {
  visible: boolean;
  name?: string;
  foregroundLabel?: string;
  foregroundHint?: string;
  backgroundHint?: string;
  onReset?: () => void;
  onClose: () => void;
  foregroundColor: string;
  backgroundColor: string;
  onChangeForeground: (color: string) => void;
  onChangeBackground: (color: string) => void;
};

/* ------------------ BREAK ------------------ */

const BACKGROUND_COLORS = [
  colors.white.main, colors.cream.main, "#FFF2E9", "#EAF5EF", "#EAF1FA",
  "#F2EAF6", "#FFF8D8", "#E8F6F3", "#FCEAF0", "#ECEBFA"
];

/* ------------------ BREAK ------------------ */

// Edits the shared QR foreground fallback and the QR background color.
export default function ColorDialog({ visible, onClose, foregroundColor, backgroundColor, onChangeForeground, onChangeBackground, name = "Color", foregroundLabel = "Foreground", foregroundHint = "Used by dots, eyes, and frames unless they have their own color.", backgroundHint = "Choose a light background for reliable scanning.", onReset }: ColorDialogProps) {
  //Default Return
  return (
    <PxModal visible={visible} onRequestClose={onClose} name={name} height="auto" maxHeight={820} keyboardAvoiding>
      <View style={styles.content}>
        <QrColorPicker
          name={foregroundLabel}
          color={foregroundColor}
          onChangeColor={onChangeForeground}
          hint={foregroundHint}
        />
        <QrColorPicker
          name="Background"
          color={backgroundColor}
          onChangeColor={onChangeBackground}
          presets={BACKGROUND_COLORS}
          onReset={onReset ?? (() => {
            onChangeForeground(colors.primary.main);
            onChangeBackground(colors.white.main);
          })}
          hint={backgroundHint}
        />
      </View>
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }
});
