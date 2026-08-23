import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type LinkCheckOverlayProps = {
  onClose?: () => void;
};

/* ------------------ BREAK ------------------ */

// Shows a calm branded message while the scanned destination is checked in the background.
export function LinkCheckOverlay({ onClose }: LinkCheckOverlayProps) {
  //Default Return
  return (
    <View style={styles.overlay}>
      <StatusBar style="dark" />
      {onClose ? (
        <SafeAreaView edges={["top"]} style={styles.closeSafeArea}>
          <Pressable
            accessibilityLabel="Close link check preview"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.primary.main} />
          </Pressable>
        </SafeAreaView>
      ) : null}

      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.secondary.main} />
        <Text style={styles.title}>Checking this link</Text>
        <Text style={styles.body}>
          We’re checking the link before redirecting you to the website.
        </Text>
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
  closeSafeArea: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 2,
    paddingTop: spacing.xs,
    paddingRight: spacing.md
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.pill,
    backgroundColor: colors.white.main
  },
  pressed: {
    opacity: 0.65
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: 72
  },
  title: {
    marginTop: spacing.lg,
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h4,
    textAlign: "center"
  },
  body: {
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
