import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

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
  onDelete: () => void;
  isDeleting: boolean;
};

/* ------------------ BREAK ------------------ */

// Edits the QR name and built-in logo visibility in the main form.
export default function SettingsDialog({ visible, onClose, name, hideLogo, onChangeName, onChangeHideLogo, onDelete, isDeleting }: SettingsDialogProps) {
  //Default Return
  return (
    <PxModal visible={visible} onRequestClose={onClose} name="Settings" height="auto" maxHeight={440} keyboardAvoiding>
      <View style={styles.content}>
        <View style={styles.nameField}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            accessibilityLabel="QR name"
            onChangeText={onChangeName}
            placeholder="Enter QR name"
            placeholderTextColor={colors.mute.main}
            returnKeyType="done"
            selectionColor={colors.secondary.main}
            style={styles.input}
            value={name}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={[styles.label, styles.toggleLabel]}>Hide Uno QR logo</Text>
          <Switch
            accessibilityLabel="Hide Uno QR logo"
            onValueChange={onChangeHideLogo}
            thumbColor={colors.white.main}
            trackColor={{ false: colors.neutral.light, true: colors.secondary.main }}
            value={hideLogo}
          />
        </View>
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
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  nameField: { gap: spacing.xs },
  label: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body1
  },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  toggleLabel: { flex: 1 },
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
