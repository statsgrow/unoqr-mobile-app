import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { type Href } from "expo-router";
import { House, User } from "lucide-react-native";

import { redirect } from "@/utils/general/Redirect";
import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { useSessionRefreshPending } from "@/utils/auth/SessionRefreshContext";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

// Renders the branded app header with home and profile actions.
export function HeaderNav() {
  const isSessionRefreshPending = useSessionRefreshPending();

  // Opens the app home screen.
  const handleHomePress = () => {
    redirect("push", "/" as Href);
  };//func ends

  // Opens the authenticated UNOQR account page.
  const handleProfilePress = () => {
    redirect("push", "/auth/myaccount" as Href);
  };//func ends

  //Default Return
  return (
    <View style={styles.root}>
      <View accessibilityLabel="UnoQR" accessibilityRole="image">
        <UnoQrLogo width={112} color={colors.primary.main} />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Go to home"
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={handleHomePress}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressedButton]}
        >
          <House color={colors.secondary.main} size={24} strokeWidth={1.25} />
        </Pressable>

        <Pressable
          accessibilityLabel={isSessionRefreshPending ? "Checking account" : "Open profile"}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSessionRefreshPending, busy: isSessionRefreshPending }}
          disabled={isSessionRefreshPending}
          hitSlop={spacing.xs}
          onPress={handleProfilePress}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressedButton]}
        >
          {isSessionRefreshPending ? (
            <ActivityIndicator color={colors.secondary.main} size="small" />
          ) : (
            <User color={colors.secondary.main} size={24} strokeWidth={1.25} />
          )}
        </Pressable>
      </View>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
    backgroundColor: colors.background.main
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs
  },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  pressedButton: {
    opacity: 0.62
  }
});
