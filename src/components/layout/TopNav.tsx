import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { CloudAlert, CloudCheck } from "lucide-react-native";
import { Text } from "react-native-paper";

import { redirect } from "@/utils/general/Redirect";
import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type TopNavProps = {
  title?: string;
  showSyncStatus?: boolean;
  isSyncComplete?: boolean;
  onSyncInfoPress?: () => void;
};

/* ------------------ BREAK ------------------ */

// Renders a titled page header or the default UnoQR brand navigation.
export function TopNav({
  title,
  showSyncStatus = false,
  isSyncComplete = false,
  onSyncInfoPress
}: TopNavProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Returns to the previous app route from a titled page header.
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    };//if ends

    redirect("replace", "/");
  };//func ends

  // Opens the app home route without adding another history entry.
  const handleHomePress = () => {
    if (!isHome) {
      redirect("replace", "/");
    };//if ends
  };//func ends

  if (title) {
    //Default Return
    return (
      <View style={[styles.root, styles.titleRoot]}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={handleBackPress}
          style={({ pressed }) => [styles.backButton, pressed && styles.actionButtonPressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary.main} />
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        {showSyncStatus ? (
          <Pressable
            accessibilityLabel="Show cloud sync information"
            accessibilityRole="button"
            hitSlop={spacing.xs}
            onPress={onSyncInfoPress}
            style={({ pressed }) => [styles.syncStatus, pressed && styles.actionButtonPressed]}
          >
            {isSyncComplete ? (
              <CloudCheck size={19} strokeWidth={1.25} color={colors.primary.main} />
            ) : (
              <CloudAlert size={19} strokeWidth={1.25} color={colors.error.main} />
            )}
          </Pressable>
        ) : null}
      </View>
    );//return ends
  };//if ends

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
  titleRoot: {
    justifyContent: "flex-start",
    gap: spacing.sm
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.cream.main
  },
  title: {
    minWidth: 0,
    flex: 1,
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h6
  },
  syncStatus: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center"
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
