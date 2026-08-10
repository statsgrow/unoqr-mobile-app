import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
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
import { initScansTable } from "@/helpers/scans/db/init";

/* ------------------ BREAK ------------------ */

// Renders the app shell and shared providers.
export default function RootLayout() {
  // Loads custom fonts for consistent typography across the app.
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold
  });

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

  //Create new tables if not exists
  useEffect(() => {
    //create scans table if not exists
    void initScansTable();
  }, []);

  // Prevents rendering until fonts are loaded to avoid layout shifts.
  if (!fontsLoaded) {
    return null;
  }

  //App content to be rendered inside the shared providers.
  const appContent = (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
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
