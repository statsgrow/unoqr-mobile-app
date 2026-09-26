import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
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
import { refreshTokensSilently, triggerTokenChecking } from "@/utils/auth/AuthTokens";
import { SessionRefreshContext } from "@/utils/auth/SessionRefreshContext";

/* ------------------ BREAK ------------------ */

// Renders the app shell and shared providers.
export default function RootLayout() {
  const [isSessionRefreshPending, setIsSessionRefreshPending] = useState(true);
  // Loads custom fonts for consistent typography across the app.
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold
  });

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

  // Prevents rendering until fonts are loaded to avoid layout shifts.
  if (!fontsLoaded) {
    return null;
  }

  //App content to be rendered inside the shared providers.
  const appContent = (
    <>
      <SessionRefreshContext.Provider value={isSessionRefreshPending}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="dark" />
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
