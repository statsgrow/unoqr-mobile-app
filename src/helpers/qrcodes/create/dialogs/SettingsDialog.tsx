import { Pressable, StyleSheet, Text, View } from "react-native";

import { PxSwitch } from "@/components/form/PxSwitch";
import { PxTextInput } from "@/components/form/PxTextInput";
import { PxModal } from "@/components/elements/PxModal";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type SettingsDialogProps = {
  visible: boolean;
  onClose: () => void;
  name: string;
  hideLogo: boolean;
  onChangeName: (name: string) => void;
  onChangeHideLogo: (hide: boolean) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
};

/* ------------------ BREAK ------------------ */

// Edits the QR name and built-in logo visibility in the main form.
export default function SettingsDialog({ visible, onClose, name, hideLogo, onChangeName, onChangeHideLogo, onDelete, isDeleting = false }: SettingsDialogProps) {
  //Default Return
  return (
    <PxModal
      visible={visible} onRequestClose={onClose} name="Settings" height="auto" maxHeight={440} keyboardAvoiding
      footerAction={onDelete ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDeleting }}
            disabled={isDeleting}
            onPress={onDelete}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>{isDeleting ? "Deleting..." : "Delete"}</Text>
          </Pressable>
        </View>
      ) : null}
    >
      <View style={styles.content}>
        <PxTextInput value={name} onChangeText={onChangeName} label="Name" accessibilityLabel="QR name" placeholder="Enter QR name" returnKeyType="done" />
        <PxSwitch value={hideLogo} onValueChange={onChangeHideLogo} label="Hide Uno QR logo" />
      </View>
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  deleteButton: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: `${colors.error.main}1A`
  },
  deleteText: { color: colors.error.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
