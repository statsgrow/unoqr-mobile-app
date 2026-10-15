import { Pressable, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { House, User } from "lucide-react-native";

import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { redirect } from "@/utils/general/Redirect";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { useSessionRefreshPending } from "@/utils/auth/SessionRefreshContext";
import { colors } from "@/theme/colors";
import { colors as themeColors, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type HeaderNavProps = {
  showProfile?: boolean;
  showBack?: boolean;
  showHome?: boolean;
};

/* ------------------ BREAK ------------------ */

// Renders the branded app header with home and profile actions.
export function HeaderNav({ showProfile = true, showBack = false, showHome = true }: HeaderNavProps) {
  const router = useRouter();
  const isSessionRefreshPending = useSessionRefreshPending();

  // Returns to the previous page or home when there is no navigation history.
  const handleBackPress = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      redirect("replace", "/" as Href);
    };//if ends
  };//func ends

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
      <View style={styles.actions}>
        {showBack ? (
          <HeaderBackButton onPress={handleBackPress} />
        ) : null}
        <View accessibilityLabel="UnoQR" accessibilityRole="image">
          <UnoQrLogo width={112} color={themeColors.primary.main} />
        </View>
      </View>

      <View style={styles.actions}>
        {showHome ? <Pressable
          accessibilityLabel="Go to home"
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={handleHomePress}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressedButton]}
        >
          <House color={colors.secondary.main} size={24} strokeWidth={1.25} />
        </Pressable> : null}

        {showProfile ? <Pressable
          accessibilityLabel={isSessionRefreshPending ? "Checking account" : "Open profile"}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSessionRefreshPending, busy: isSessionRefreshPending }}
          disabled={isSessionRefreshPending}
          hitSlop={spacing.xs}
          onPress={handleProfilePress}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressedButton]}
        >
          {isSessionRefreshPending ? (
            <PxCircularProgress color={colors.secondary.main} size={20} />
          ) : (
            <User color={colors.secondary.main} size={24} strokeWidth={1.25} />
          )}
        </Pressable> : null}
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
    paddingHorizontal: spacing.sm,
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
