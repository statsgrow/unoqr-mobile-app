import { StyleSheet, View } from "react-native";

import { colors, radii, spacing } from "@/theme/tokens";

import { CardBody } from "./shared";
import type { DigitalCardLayoutProps } from "./types";

/* ------------------ BREAK ------------------ */

// Renders the spotlight digital business-card layout for samples and saved profiles.
export default function Spotlight({ data, primaryColor, onOpenLink, isPreview = false }: DigitalCardLayoutProps) {
  //Default Return
  return <View style={styles.card}>
    <View style={[styles.accent, { backgroundColor: primaryColor }]} />
    <CardBody data={data} primaryColor={primaryColor} onOpenLink={isPreview ? undefined : onOpenLink} dark />
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl + spacing.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.primary.light, backgroundColor: colors.black.main },
  accent: { height: spacing.xs },
});
