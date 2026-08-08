import { SafeAreaView, StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";

import { colors, fontFamilies, fontSizes, radii, spacing } from "../src/theme/tokens";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text variant="headlineLarge" style={styles.eyebrow}>
          UnoQr App
        </Text>
        <Text variant="displaySmall" style={styles.title}>
          Fresh mobile scaffold with UnoQr tokens.
        </Text>
        <Text variant="bodyLarge" style={styles.description}>
          This project keeps only the shared foundation: routing, theme, typography, spacing, and color tokens.
        </Text>

        <Surface style={styles.card} elevation={0}>
          <Text variant="titleLarge" style={styles.cardTitle}>
            Token Preview
          </Text>
          <Text variant="bodyMedium" style={styles.cardBody}>
            Warm cream surfaces, ink typography, orange accents, and the UnoQr spacing rhythm are already wired in.
          </Text>
          <Button mode="contained" contentStyle={styles.buttonContent} style={styles.button}>
            Start Building
          </Button>
        </Surface>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream.main
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.cream.main
  },
  eyebrow: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption,
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  title: {
    color: colors.primary.main,
    maxWidth: 320
  },
  description: {
    color: colors.mute.main,
    maxWidth: 340
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main,
    borderWidth: 1,
    borderColor: colors.border.main
  },
  cardTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold
  },
  cardBody: {
    color: colors.neutral.main
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.main
  },
  buttonContent: {
    height: 52
  }
});