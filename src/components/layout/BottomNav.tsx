import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePathname, type Href } from "expo-router";
import { ContactRound, Grip, History, House, ScanLine, type LucideIcon } from "lucide-react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { redirect } from "@/utils/general/Redirect";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type BottomNavProps = { footerAction?: ReactNode; hideMenu?: boolean };

type StandardNavItem = {
  label: string;
  icon: LucideIcon;
  href: Href;
  matchingPath: string;
};

/* ------------------ BREAK ------------------ */

const homeItem: StandardNavItem = {
  label: "Home",
  icon: House,
  href: "/" as Href,
  matchingPath: "/"
};

const scansItem: StandardNavItem = {
  label: "My Scans",
  icon: History,
  href: "/scans/list" as Href,
  matchingPath: "/scans"
};

const cardItem: StandardNavItem = {
  label: "My Cards",
  icon: ContactRound,
  href: "/digital_cards/modify" as Href,
  matchingPath: "/digital_cards"
};

const moreItem: StandardNavItem = {
  label: "More",
  icon: Grip,
  href: "/more" as Href,
  matchingPath: "/more"
};

/* ------------------ BREAK ------------------ */

// Renders the primary app navigation with a prominent central scan action.
export function BottomNav({ footerAction, hideMenu = false }: BottomNavProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  //Default Return
  return (
    <View style={[styles.root, footerAction != null && [styles.actionFooter, { paddingBottom: Math.max(spacing.md, insets.bottom) }]]}>
      {footerAction}
      {!hideMenu ? <View style={styles.container}>
        <NavItem item={homeItem} isActive={pathname === homeItem.matchingPath} />
        <NavItem
          item={cardItem}
          isActive={
            pathname === cardItem.matchingPath
            || pathname.startsWith(`${cardItem.matchingPath}/`)
          }
        />

        <View style={styles.scanSlot}>
          <Pressable
            accessibilityLabel="Scan QR code"
            accessibilityRole="button"
            onPress={() => redirect("push", "/scans/scanner")}
            style={({ pressed }) => [styles.scanButton, pressed && styles.pressedButton]}
          >
            <ScanLine size={30} strokeWidth={1.25} color={colors.white.main} />
          </Pressable>
        </View>

        <NavItem
          item={scansItem}
          isActive={pathname === scansItem.matchingPath || pathname.startsWith(`${scansItem.matchingPath}/`)}
        />
        <NavItem
          item={moreItem}
          isActive={pathname === moreItem.matchingPath || pathname.startsWith("/qrcodes/")}
        />
      </View> : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders a standard supporting destination in the bottom navigation.
function NavItem({ item, isActive }: { item: StandardNavItem; isActive: boolean }) {
  const Icon = item.icon;
  //Default Return
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={() => redirect("push", item.href)}
      style={({ pressed }) => [styles.itemButton, pressed && styles.pressedButton]}
    >
      <Icon size={25} strokeWidth={1.25} color={isActive ? colors.secondary.main : colors.mute.main} />
      <Text numberOfLines={1} style={[styles.label, isActive ? styles.activeLabel : styles.inactiveLabel]}>
        {item.label}
      </Text>
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: {
    width: "100%",
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
    overflow: "visible",
    borderTopWidth: 1,
    borderTopColor: colors.border.main,
    backgroundColor: colors.white.main
  },
  actionFooter: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  container: {
    height: 58,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.xs,
    overflow: "visible"
  },
  itemButton: {
    width: "20%",
    minWidth: 0,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
    borderRadius: radii.lg
  },
  scanSlot: {
    width: "20%",
    minWidth: 0,
    height: 46,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible"
  },
  scanButton: {
    position: "absolute",
    left: "50%",
    marginLeft: -32,
    bottom: 18,
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
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
