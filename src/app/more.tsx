import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { Text } from "react-native-paper";

import { PxButton } from "@/components/elements/PxButton";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { installSettings } from "@/settings";
import { insertAppInstall } from "@/utils/auth/AppInstall";
import { getStorageUser, processUserLogout } from "@/utils/auth/AuthUser";
import type { UserType } from "@/utils/auth/UserTypes";
import { getData } from "@/utils/general/Storage";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type InstallInfo = {
  id?: string;
};

type GroupedLinkProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  showDivider?: boolean;
};

/* ------------------ BREAK ------------------ */

// Renders account actions, grouped app links, and device installation information.
export default function MoreScreen() {
  const [installId, setInstallId] = useState<string | null>(null);
  const [installIdCopied, setInstallIdCopied] = useState(false);
  const [authUser, setAuthUser] = useState<UserType | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);

  // Loads the stored installation UUID and creates it when the device has none yet.
  useEffect(() => {
    let isMounted = true;

    void resolveInstallId().then((resolvedInstallId) => {
      if (isMounted) setInstallId(resolvedInstallId);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Loads the locally stored authenticated user for account-aware page actions.
  useEffect(() => {
    let isMounted = true;

    void getStorageUser().then((storedUser) => {
      if (!isMounted) return;
      setAuthUser(storedUser);
      setIsAuthResolved(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Clears local authentication and restores the anonymous More page state.
  const handleLogout = async () => {
    await processUserLogout();
    setAuthUser(null);
  };//func ends

  // Copies the device installation UUID and shows immediate icon feedback.
  const handleCopyInstallId = async () => {
    if (!installId) return;

    await Clipboard.setStringAsync(installId);
    setInstallIdCopied(true);
  };//func ends

  //Default Return
  return (
    <GeneralLayout scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {isAuthResolved && authUser ? (
          <View style={[styles.accountCard, styles.userAccountCard]}>
            {authUser.avatar_url ? (
              <Image source={{ uri: authUser.avatar_url }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarFallback}>
                <Text style={styles.userAvatarInitials}>{getUserInitials(authUser)}</Text>
              </View>
            )}
            <View style={[styles.accountCopy, styles.userAccountCopy]}>
              <Text style={[styles.accountTitle, styles.userAccountTitle]}>
                {getUserDisplayName(authUser)}
              </Text>
              {authUser.email ? (
                <Text style={styles.accountDescription}>{authUser.email}</Text>
              ) : null}
            </View>
          </View>
        ) : isAuthResolved ? (
          <View style={styles.accountCard}>
            <View style={styles.accountIcon}>
              <MaterialCommunityIcons name="cloud-sync-outline" size={28} color={colors.secondary.main} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>Take your scans everywhere</Text>
              <Text style={styles.accountDescription}>Scan once and see it on all your devices.</Text>
            </View>
            <View style={styles.authActions}>
              <View style={styles.loginAction}>
                <PxButton
                  mode="contained"
                  color="primary"
                  fullWidth
                  onPress={() => router.push({ pathname: "/auth/login", params: { next: "/more" } })}
                >
                  Log in
                </PxButton>
              </View>
              <PxButton
                mode="text"
                color="primary"
                onPress={() => router.push({
                  pathname: "/auth/login",
                  params: { mode: "signup", next: "/more" }
                })}
              >
                Sign up
              </PxButton>
            </View>
          </View>
        ) : null}

        <View style={styles.groupedLinks}>
          <GroupedLink
            icon="qrcode-plus"
            label="Create Qr"
            description="Make and download a static QR code"
            onPress={() => router.push("/qrcodes/create")}
            showDivider
          />
          <GroupedLink
            icon="account-circle-outline"
            label="My Account"
            description="Profile and account details"
            onPress={() => authUser
              ? router.push("/auth/myaccount")
              : router.push({ pathname: "/auth/login", params: { next: "/auth/myaccount" } })}
            showDivider
          />
          <GroupedLink
            icon="bell-outline"
            label="Notifications"
            description="Alerts and notification preferences"
            onPress={() => undefined}
          />
        </View>

        {authUser ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleLogout()}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressedButton]}
          >
            <MaterialCommunityIcons name="logout" size={20} color={colors.error.main} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        ) : null}

        <View style={styles.footerInfo}>
          <View style={styles.installIdBlock}>
            <Text style={styles.installIdLabel}>Install ID</Text>
            <View style={styles.installIdValueRow}>
              <Text selectable style={styles.installIdText}>{installId || "Unavailable"}</Text>
              {installId ? (
                <Pressable
                  accessibilityLabel="Copy install ID"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => void handleCopyInstallId()}
                  style={({ pressed }) => [styles.copyInstallIdButton, pressed && styles.pressedButton]}
                >
                  <MaterialCommunityIcons
                    name={installIdCopied ? "check" : "content-copy"}
                    size={15}
                    color={installIdCopied ? colors.success.main : colors.mute.main}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} UNOQR. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders one Android-style row inside the grouped settings card.
function GroupedLink({ icon, label, description, onPress, showDivider = false }: GroupedLinkProps) {
  //Default Return
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.groupedLink, pressed && styles.pressedButton]}
    >
      <View style={styles.groupedLinkIcon}>
        <MaterialCommunityIcons name={icon} size={21} color={colors.primary.light} />
      </View>
      <View style={[styles.groupedLinkCopy, showDivider && styles.groupedLinkDivider]}>
        <View style={styles.groupedLinkText}>
          <Text style={styles.groupedLinkLabel}>{label}</Text>
          <Text style={styles.groupedLinkDescription}>{description}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.mute.light} />
      </View>
    </Pressable>
  );//return ends
};//func ends

// Returns the best available display name for the stored user.
function getUserDisplayName(user: UserType): string {
  return user.full_name
    || [user.first_name, user.last_name].filter(Boolean).join(" ")
    || user.email
    || "UNOQR User";
};//func ends

// Builds short initials for users without a stored avatar image.
function getUserInitials(user: UserType): string {
  const displayName = getUserDisplayName(user);
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
};//func ends

// Resolves the stored installation UUID without requiring the More page to stay mounted.
async function resolveInstallId(): Promise<string | null> {
  const storedInstall = await getData({
    key: installSettings.storageKeys.installInfo.name
  }) as InstallInfo | null;

  if (storedInstall?.id) return storedInstall.id;

  const createdInstall = await insertAppInstall() as InstallInfo | null;
  return createdInstall?.id || null;
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.cream.main
  },
  accountCard: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  userAccountCard: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingVertical: spacing.xs
  },
  accountIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  userAvatarFallback: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  userAvatarInitials: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h6
  },
  accountCopy: {
    alignItems: "center",
    gap: spacing.xs
  },
  userAccountCopy: {
    minWidth: 0,
    flex: 1,
    alignItems: "flex-start"
  },
  accountTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h6,
    textAlign: "center"
  },
  userAccountTitle: {
    textAlign: "left"
  },
  accountDescription: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: 20,
    textAlign: "center"
  },
  authActions: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  loginAction: {
    flex: 1
  },
  groupedLinks: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  groupedLink: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.md
  },
  groupedLinkIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.cream.main
  },
  groupedLinkCopy: {
    minWidth: 0,
    flex: 1,
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.md
  },
  groupedLinkDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light
  },
  groupedLinkText: {
    minWidth: 0,
    flex: 1
  },
  groupedLinkLabel: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body1
  },
  groupedLinkDescription: {
    marginTop: spacing.xxs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  logoutButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error.light,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  logoutText: {
    color: colors.error.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body1
  },
  pressedButton: {
    opacity: 0.68
  },
  footerInfo: {
    alignItems: "center",
    gap: spacing.xs,
    marginTop: "auto",
    paddingTop: spacing.lg
  },
  installIdBlock: {
    alignItems: "center",
    gap: spacing.xxs
  },
  installIdLabel: {
    color: colors.mute.light,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption,
    textAlign: "center"
  },
  installIdValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs
  },
  installIdText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    textAlign: "center"
  },
  copyInstallIdButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill
  },
  copyrightText: {
    color: colors.mute.light,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption,
    textAlign: "center"
  }
});
