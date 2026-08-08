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
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif";
import { useFonts } from "expo-font";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "../src/theme/tokens";
import { paperTheme } from "../src/theme/paperTheme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    InstrumentSerif_400Regular
  });

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const doc = (globalThis as { document?: Document }).document;
    const root = doc?.getElementById("root");

    if (doc?.body) {
      doc.body.style.margin = "0";
      doc.body.style.backgroundColor = colors.cream.main;
    }

    if (root) {
      root.style.minHeight = "100dvh";
    }
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const appContent = (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </>
  );

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
}

const styles = StyleSheet.create<{ webViewport: ViewStyle; webMobileFrame: ViewStyle }>({
  webViewport: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    backgroundColor: colors.cream.main,
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