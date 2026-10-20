import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Mail, Phone, UserRound, type LucideIcon } from "lucide-react-native";
import { Image, StyleSheet, View } from "react-native";

import { Text } from "react-native-paper";

import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { redirect } from "@/utils/general/Redirect";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { getStorageUser } from "@/utils/auth/AuthUser";
import type { UserType } from "@/utils/auth/UserTypes";

/* ------------------ BREAK ------------------ */

type AccountDetailProps = {
  label: string;
  value: string;
  Icon: LucideIcon;
  showDivider?: boolean;
};

/* ------------------ BREAK ------------------ */

// Displays the locally stored authenticated UNOQR account details.
export default function MyAccountScreen() {
  const [user, setUser] = useState<UserType | null>(null);
  const [isResolved, setIsResolved] = useState(false);

  // Resolves the stored user or sends anonymous visitors to login.
  useEffect(() => {
    let isMounted = true;

    void getStorageUser().then((storedUser) => {
      if (!isMounted) return;

      if (!storedUser) {
        redirect("replace", { pathname: "/auth/login", params: { next: "/auth/myaccount" } });
        return;
      };//if ends

      setUser(storedUser);
      setIsResolved(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Returns to the previous screen or Home when the account page opened directly.
  function goBack(): void {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };//func ends

  //Default Return
  return (
    <GeneralLayout fixedHeader topView={<View style={styles.header}><HeaderBackButton onPress={goBack} /><Text style={styles.headerTitle}>My Account</Text></View>}>
      {!isResolved || !user ? (
        <View style={styles.loader}>
          <PxCircularProgress color={colors.secondary.main} size={40} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.profileCard}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{getUserInitials(user)}</Text>
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{getUserDisplayName(user)}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Account information</Text>
            <View style={styles.detailsCards}>
              <AccountDetail Icon={UserRound} label="Full name" value={getUserDisplayName(user)} showDivider />
              <AccountDetail Icon={Mail} label="Email" value={user.email || "Not added"} showDivider />
              <AccountDetail Icon={Phone} label="Phone" value={user.phone || "Not added"} />
            </View>
          </View>
        </View>
      )}
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Displays an account field in the stacked card with an inset divider between rows.
function AccountDetail({ label, value, Icon, showDivider = false }: AccountDetailProps) {
  //Default Return
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}><Icon size={22} strokeWidth={1.25} color={colors.primary.light} /></View>
      <View style={[styles.detailCopy, showDivider && styles.detailDivider]}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text selectable style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );//return ends
};//func ends

// Returns the best available display name for an authenticated user.
function getUserDisplayName(user: UserType): string {
  return user.full_name
    || [user.first_name, user.last_name].filter(Boolean).join(" ")
    || user.email
    || "UNOQR User";
};//func ends

// Builds initials for accounts without an avatar image.
function getUserInitials(user: UserType): string {
  return getUserDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white.main
  },
  headerTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.navigationTitle
  },
  loader: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.cream.main
  },
  profileCard: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.cream.dark,
    borderRadius: radii.xl + spacing.xs,
    backgroundColor: colors.white.main
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  avatarFallback: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  avatarInitials: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h6
  },
  profileCopy: {
    minWidth: 0,
    flex: 1,
    alignItems: "flex-start",
    gap: spacing.xs
  },
  profileName: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h6
  },
  profileEmail: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: 20,
    textAlign: "center"
  },
  detailsSection: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h6
  },
  detailsCards: {
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main,
    overflow: "hidden"
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.md
  },
  detailIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.cream.main
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    justifyContent: "center",
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
    gap: spacing.xxs
  },
  detailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light
  },
  detailLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  detailValue: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body1
  }
});
