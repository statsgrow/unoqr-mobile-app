import { useEffect, useState } from "react";
import { Stack, usePathname } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { redirect } from "@/utils/general/Redirect";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { insertAppInstall } from "@/utils/auth/AppInstall";
import { refreshTokensSilently } from "@/utils/auth/AuthTokens";
import { getStorageUser } from "@/utils/auth/AuthUser";

/* ------------------ BREAK ------------------ */

type AuthRouteState = "checking" | "ready" | "install-error";

/* ------------------ BREAK ------------------ */

// Checks the app installation and stored session before showing account routes.
export default function AuthLayout() {
  const [routeState, setRouteState] = useState<AuthRouteState>("checking");
  const [checkKey, setCheckKey] = useState(0);
  const pathname = usePathname();

  // Resolves the install and silently refreshes an existing session before rendering.
  useEffect(() => {
    let isMounted = true;

    const checkAccess = async (): Promise<void> => {
      try {
        const [install, refreshResult] = await Promise.all([
          insertAppInstall(),
          refreshTokensSilently()
        ]);
        if (!isMounted) return;

        if (!install?.id) {
          setRouteState("install-error");
          return;
        };//if ends

        const user = refreshResult === "failed" ? null : await getStorageUser();
        if (!isMounted) return;

        if (!user) {
          redirect("replace", { pathname: "/auth/login", params: { next: pathname } });
          return;
        };//if ends

        setRouteState("ready");
      } catch (error: unknown) {
        if (isMounted) {
          console.error("Unable to check protected route access:", error);
          setRouteState("install-error");
        };//if ends
      };//try-catch ends
    };//func ends

    void checkAccess();
    return () => {
      isMounted = false;
    };
  }, [checkKey, pathname]);

  //Default Return
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {routeState === "ready" ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : routeState === "install-error" ? (
        <View style={styles.message}>
          <Text style={styles.messageTitle}>Could not prepare this device</Text>
          <Text style={styles.messageBody}>Check your connection and try again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRouteState("checking");
              setCheckKey((currentKey) => currentKey + 1);
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <View accessibilityLiveRegion="polite" style={styles.message}>
          <ActivityIndicator color={colors.secondary.main} size="large" />
          <Text style={styles.messageBody}>Checking your account...</Text>
        </View>
      )}
    </SafeAreaView>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream.main
  },
  message: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl
  },
  messageTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h5,
    textAlign: "center"
  },
  messageBody: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body1,
    textAlign: "center"
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.main
  },
  retryText: {
    color: colors.white.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.button
  }
});
