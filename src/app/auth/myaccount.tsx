import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ActivityIndicator, Text } from "react-native-paper";

import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { getStorageUser } from "@/utils/auth/AuthUser";
import type { UserType } from "@/utils/auth/UserTypes";

/* ------------------ BREAK ------------------ */

type AccountDetailProps = {
  label: string;
  value: string;
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
        router.replace({ pathname: "/auth/login", params: { next: "/auth/myaccount" } });
        return;
      };//if ends

      setUser(storedUser);
      setIsResolved(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  //Default Return
  return (
    <GeneralLayout>
      {!isResolved || !user ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.secondary.main} size="large" />
        </View>
      ) : (
        <View style={styles.content}>
          <PageHeader
            title="My Account"
            description="Your UNOQR profile and account information."
          />

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

          <View style={styles.detailsCard}>
            <AccountDetail label="Full name" value={getUserDisplayName(user)} />
            <View style={styles.divider} />
            <AccountDetail label="Email" value={user.email || "Not added"} />
            <View style={styles.divider} />
            <AccountDetail label="Phone" value={user.phone || "Not added"} />
          </View>
        </View>
      )}
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders one read-only account detail row.
function AccountDetail({ label, value }: AccountDetailProps) {
  //Default Return
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  avatarFallback: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  avatarInitials: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h5
  },
  profileCopy: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xxs
  },
  profileName: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h6
  },
  profileEmail: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2
  },
  detailsCard: {
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  detailRow: {
    gap: spacing.xxs,
    paddingVertical: spacing.md
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
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light
  }
});
