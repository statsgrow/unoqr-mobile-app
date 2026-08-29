import { Pressable, StyleSheet, View } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type StandardNavItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: Href;
  matchingPath: string;
};

/* ------------------ BREAK ------------------ */

const scansItem: StandardNavItem = {
  label: "My Scans",
  icon: "history",
  activeIcon: "history",
  href: "/scans/list" as Href,
  matchingPath: "/scans"
};

const moreItem: StandardNavItem = {
  label: "More",
  icon: "apps",
  activeIcon: "apps",
  href: "/more" as Href,
  matchingPath: "/more"
};

/* ------------------ BREAK ------------------ */

// Renders the primary app navigation with a prominent central scan action.
export function BottomNav() {
  const pathname = usePathname();

  //Default Return
  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <NavItem
          item={scansItem}
          isActive={
            pathname === scansItem.matchingPath
            || pathname.startsWith(`${scansItem.matchingPath}/`)
          }
        />

        <View style={styles.scanSlot}>
          <Pressable
            accessibilityLabel="Scan QR code"
            accessibilityRole="button"
            onPress={() => router.push("/scans/scanner")}
            style={({ pressed }) => [styles.scanButton, pressed && styles.pressedButton]}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={36} color={colors.white.main} />
          </Pressable>
        </View>

        <NavItem
          item={moreItem}
          isActive={pathname === moreItem.matchingPath}
        />
      </View>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders a standard supporting destination in the bottom navigation.
function NavItem({ item, isActive }: { item: StandardNavItem; isActive: boolean }) {
  //Default Return
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={() => router.push(item.href)}
      style={({ pressed }) => [styles.itemButton, pressed && styles.pressedButton]}
    >
      <MaterialCommunityIcons
        name={isActive ? item.activeIcon : item.icon}
        size={25}
        color={isActive ? colors.secondary.main : colors.mute.main}
      />
      <Text style={[styles.label, isActive ? styles.activeLabel : styles.inactiveLabel]}>
        {item.label}
      </Text>
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
    overflow: "visible",
    borderTopWidth: 1,
    borderTopColor: colors.border.main,
    backgroundColor: colors.white.main
  },
  container: {
    height: 50,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: spacing.lg,
    overflow: "visible"
  },
  itemButton: {
    width: 96,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
    borderRadius: radii.lg
  },
  scanSlot: {
    width: 96,
    height: 46,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible"
  },
  scanButton: {
    position: "absolute",
    bottom: 0,
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: colors.cream.main,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.main,
    shadowColor: colors.secondary.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 10
  },
  pressedButton: {
    opacity: 0.72
  },
  label: {
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption,
    lineHeight: 16,
    textAlign: "center"
  },
  activeLabel: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primarySemiBold
  },
  inactiveLabel: {
    color: colors.mute.main
  }
});
