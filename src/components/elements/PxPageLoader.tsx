import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type PxPageLoaderProps = {
  visible?: boolean;
  title: string;
  description: string;
};

/* ------------------ BREAK ------------------ */

// Shows a reusable full-page branded loader with configurable title and description text.
export function PxPageLoader({
  visible = true,
  title,
  description
}: PxPageLoaderProps) {
  if (!visible) return null;

  //Default Return
  return (
    <View accessibilityLiveRegion="polite" style={styles.overlay}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.indicatorShell}>
          <ActivityIndicator size="large" color={colors.secondary.main} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <SafeAreaView pointerEvents="none" edges={["bottom"]} style={styles.poweredSafeArea}>
        <View style={styles.poweredBy}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <UnoQrLogo width={78} color={colors.primary.main} />
        </View>
      </SafeAreaView>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.cream.main,
    zIndex: 100
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 72
  },
  indicatorShell: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  title: {
    marginTop: spacing.lg,
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h4,
    textAlign: "center"
  },
  description: {
    maxWidth: 320,
    marginTop: spacing.sm,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body1,
    lineHeight: 24,
    textAlign: "center"
  },
  poweredSafeArea: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0
  },
  poweredBy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingBottom: spacing.md
  },
  poweredByText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  }
});
