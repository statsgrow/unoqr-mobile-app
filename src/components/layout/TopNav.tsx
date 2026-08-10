import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";

import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { colors, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

// Renders the minimal UnoQR brand header with home and notification actions.
export function TopNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Opens the app home route without adding another history entry.
  const handleHomePress = () => {
    if (!isHome) {
      router.replace("/");
    };//if ends
  };//func ends

  //Default Return
  return (
    <View style={styles.root}>
      <View accessibilityLabel="Uno QR" style={styles.brand}>
        <UnoQrLogo width={104} color={colors.primary.main} />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Home"
          accessibilityRole="button"
          accessibilityState={{ selected: isHome }}
          hitSlop={spacing.xs}
          onPress={handleHomePress}
          style={({ pressed }) => [
            styles.actionButton,
            isHome && styles.actionButtonActive,
            pressed && styles.actionButtonPressed
          ]}
        >
          <MaterialCommunityIcons
            name={isHome ? "home" : "home-outline"}
            size={24}
            color={isHome ? colors.secondary.main : colors.mute.main}
          />
        </Pressable>

        <View
          accessibilityLabel="Notifications"
          accessibilityRole="image"
          style={styles.actionButton}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={24}
            color={colors.mute.main}
          />
        </View>
      </View>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line.main,
    backgroundColor: colors.white.main
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  actionButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill
  },
  actionButtonActive: {
    backgroundColor: colors.secondary.light
  },
  actionButtonPressed: {
    opacity: 0.62
  }
});
