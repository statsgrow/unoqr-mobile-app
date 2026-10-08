import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

import { colors, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type HeaderBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

/* ------------------ BREAK ------------------ */

// Renders the shared cream back button for app headers.
export function HeaderBackButton({ onPress, accessibilityLabel = "Go back" }: HeaderBackButtonProps) {
  //Default Return
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" hitSlop={spacing.xs} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ChevronLeft size={24} strokeWidth={1.25} color={colors.primary.main} />
    </Pressable>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  button: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: colors.cream.main },
  pressed: { opacity: 0.62 }
});
