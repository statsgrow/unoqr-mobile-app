import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack, useRootNavigationState } from "expo-router";
import { AppState, Platform, StyleSheet, View, type ViewStyle } from "react-native";
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold
} from "@expo-google-fonts/bricolage-grotesque";
import { useFonts } from "expo-font";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/theme/tokens";
import { paperTheme } from "@/theme/paperTheme";
import {
  checkPendingScans,
  checkUnCrawledUrls,
  startUnCrawledUrlsTrigger
} from "@/helpers/scans/scanSync";
import { checkUnSyncedDigitalCards, DIGITAL_CARDS_SYNC_INTERVAL_MS } from "@/helpers/digital_cards/utils/SyncDigitalCards";
import { refreshTokensSilently, triggerTokenChecking } from "@/utils/auth/AuthTokens";
import { SessionRefreshContext } from "@/utils/auth/SessionRefreshContext";
import { checkPendingQrCodes } from "@/helpers/qrcodes/QrSync";
import { refreshAppInstallMetadata } from "@/utils/auth/AppInstall";
import { AppVersionDialog } from "@/utils/general/AppVersion";
import { startMetaAppEvents } from "@/utils/meta/MetaAppEvents";
import { startNotificationNavigation } from "@/utils/general/PushNotifications";

/* ------------------ BREAK ------------------ */

// Renders the app shell and shared providers.
export default function RootLayout() {
  const navigationState = useRootNavigationState();
  const [isSessionRefreshPending, setIsSessionRefreshPending] = useState(true);
  // Loads custom fonts for consistent typography across the app.
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    "Schibsted Grotesk": require("@/assets/fonts/digital-cards/SchibstedGrotesk.ttf"),
  });

  // Waits for session refresh and the root navigator before handling notification links.
  useEffect(() => {
    if (!fontsLoaded || isSessionRefreshPending || !navigationState?.key) return;
    return startNotificationNavigation();
  }, [fontsLoaded, isSessionRefreshPending, navigationState?.key]);

  // Starts Meta install and activation events after the app content is ready.
  useEffect(() => {
    if (!fontsLoaded) return;
    return startMetaAppEvents();
  }, [fontsLoaded]);

  // Checks installation metadata silently on startup, foreground and every 24 hours while open.
  useEffect(() => {
    void refreshAppInstallMetadata();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refreshAppInstallMetadata();
    }, 24 * 60 * 60 * 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshAppInstallMetadata();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };//return ends
  }, []);

  // Refreshes a stored session in the background while the home screen renders.
  useEffect(() => {
    let isMounted = true;
    let stopTokenChecking: () => void = () => undefined;

    void refreshTokensSilently().finally(() => {
      if (!isMounted) return;

      setIsSessionRefreshPending(false);
      stopTokenChecking = triggerTokenChecking();
    });

    return () => {
      isMounted = false;
      stopTokenChecking();
    };
  }, []);

  // Sets up the web viewport and mobile frame for consistent styling across platforms.
  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const doc = (globalThis as { document?: Document }).document;
    const root = doc?.getElementById("root");

    if (doc?.body) {
      doc.body.style.margin = "0";
      doc.body.style.backgroundColor = colors.white.dark;
    }

    if (root) {
      root.style.minHeight = "100dvh";
    }
  }, []);

  // Initializes scan storage and retries pending rows at startup and on each app foreground.
  useEffect(() => {
    void checkPendingScans();
    const stopUnCrawledUrlsTrigger = startUnCrawledUrlsTrigger();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void checkPendingScans();
        void checkUnCrawledUrls();
        void refreshTokensSilently();
      }
    });

    return () => {
      subscription.remove();
      stopUnCrawledUrlsTrigger();
    };
  }, []);

  // Retries persisted QR work after session refresh and whenever the app returns to the foreground.
  useEffect(() => {
    if (isSessionRefreshPending) return;
    void checkPendingQrCodes().catch((error: unknown) => console.error("Unable to retry pending QRs:", error));
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshTokensSilently().then(() => checkPendingQrCodes()).catch((error: unknown) => console.error("Unable to retry pending QRs:", error));
      };//if ends
    });
    return () => subscription.remove();
  }, [isSessionRefreshPending]);

  // Checks all owned digital cards at startup, on foreground, and every five minutes while active.
  useEffect(() => {
    if (isSessionRefreshPending) return;
    // Runs silently so Home continues displaying its SQLite data during network checks.
    const syncCards = (): void => {
      void checkUnSyncedDigitalCards().catch((error: unknown) => console.error("Unable to sync digital cards:", error));
    };//func ends
    syncCards();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") syncCards();
    }, DIGITAL_CARDS_SYNC_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") syncCards();
    });
    return () => { clearInterval(timer); subscription.remove(); };//return ends
  }, [isSessionRefreshPending]);

  // Prevents rendering until fonts are loaded to avoid layout shifts.
  if (!fontsLoaded) {
    return null;
  }

  //App content to be rendered inside the shared providers.
  const appContent = (
    <>
      <SessionRefreshContext.Provider value={isSessionRefreshPending}>
        <Stack screenOptions={{ headerShown: false, gestureEnabled: false, animation: Platform.OS === "ios" ? "none" : "default", ...(Platform.OS === "ios" ? { animationTypeForReplace: "pop" as const } : {}) }} />
        <StatusBar style="dark" />
        <AppVersionDialog />
      </SessionRefreshContext.Provider>
    </>
  );

  //Default Return
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        {Platform.OS === "web" ? (
          <View style={styles.webViewport}>
            <View style={styles.webMobileFrame}>{appContent}</View>
          </View>
        ) : (
          appContent
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create<{ webViewport: ViewStyle; webMobileFrame: ViewStyle }>({
  webViewport: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    backgroundColor: colors.white.dark,
    alignItems: "center"
  },
  webMobileFrame: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    minHeight: "100%",
    backgroundColor: colors.cream.main
  }
});
