import { Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import { PxModal } from "@/components/elements/PxModal";
import { colors, fontFamilies, fonts, sizes } from "@/theme/themeSettings";

/* ------------------ BREAK ------------------ */

type MoreMenuItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  href?: string;
};

type MoreMenuProps = {
  visible: boolean;
  onClose: () => void;
  onItemPress?: (item: MoreMenuItem) => void;
};

/* ------------------ BREAK ------------------ */

const menuItems: MoreMenuItem[] = [
  { id: "profile", title: "Profile", subtitle: "Update your member details", icon: "account-circle-outline", href: "/member/profile" },
  { id: "notifications", title: "Notifications", subtitle: "Manage app alerts", icon: "bell-outline" },
  { id: "settings", title: "Settings", subtitle: "Language and preferences", icon: "cog-outline" },
  { id: "log-out", title: "Log Out", subtitle: "Sign out of your account", icon: "logout", href: "/auth/logout" }
];

/* ------------------ BREAK ------------------ */

// Displays the existing secondary navigation options in a bottom sheet.
export function MoreMenu({ visible, onClose, onItemPress }: MoreMenuProps) {
  //Default Return
  return (
    <PxModal visible={visible} onRequestClose={onClose} showHandle={false} testID="more-menu-modal">
      <View style={styles.modalContainer} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>More Options</Text>

          <View style={styles.list}>
            {menuItems.map((item) => (
              <Pressable
                key={item.id}
                style={styles.row}
                onPress={() => {
                  onItemPress?.(item);
                  onClose();
                  if (item.href) {
                    router.push(item.href as Href);
                  };//if ends
                }}
              >
                <View style={styles.leadingIconWrap}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={colors.primary} />
                </View>

                <View style={styles.textWrap}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
                </View>

                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.grey[400]} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end"
  },
  sheet: {
    maxHeight: "78%",
    paddingHorizontal: sizes.spacing.lg,
    paddingTop: sizes.spacing.md,
    paddingBottom: sizes.spacing.xl,
    gap: sizes.spacing.md,
    borderTopLeftRadius: sizes.borderRadius["2xl"],
    borderTopRightRadius: sizes.borderRadius["2xl"],
    backgroundColor: colors.white
  },
  handle: {
    width: 48,
    height: 5,
    alignSelf: "center",
    borderRadius: sizes.borderRadius.full,
    backgroundColor: colors.grey[200]
  },
  title: {
    color: colors.black,
    fontFamily: fontFamilies.bold,
    fontSize: fonts.sizes.lg,
    textAlign: "center"
  },
  list: {
    gap: sizes.spacing.sm
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.spacing.md,
    paddingHorizontal: sizes.spacing.sm,
    paddingVertical: sizes.spacing.sm,
    borderRadius: sizes.borderRadius.lg,
    backgroundColor: colors.grey[50]
  },
  leadingIconWrap: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: sizes.borderRadius.full,
    backgroundColor: colors.white
  },
  textWrap: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    color: colors.black,
    fontFamily: fontFamilies.medium,
    fontSize: fonts.sizes.md
  },
  rowSubtitle: {
    color: colors.grey[500],
    fontFamily: fontFamilies.normal,
    fontSize: fonts.sizes.sm
  }
});
