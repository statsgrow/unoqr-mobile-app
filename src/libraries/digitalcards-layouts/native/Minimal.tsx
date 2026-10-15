import { StyleSheet, View } from "react-native";

import { colors, radii, spacing } from "@/theme/tokens";

import { CardBody } from "./shared";
import type { DigitalCardLayoutProps } from "./types";

/* ------------------ BREAK ------------------ */

// Renders the minimal digital business-card layout for samples and saved profiles.
export default function Minimal({ data, primaryColor, onOpenLink, isPreview = false }: DigitalCardLayoutProps) {
  //Default Return
  return <View style={styles.card}>
    
    <CardBody data={data} primaryColor={primaryColor} onOpenLink={isPreview ? undefined : onOpenLink} minimal />
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl + spacing.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.line.main, backgroundColor: colors.white.main },
  
});
