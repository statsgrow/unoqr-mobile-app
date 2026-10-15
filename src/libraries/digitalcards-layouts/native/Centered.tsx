import { StyleSheet, View } from "react-native";
import Svg, { ClipPath, Defs, Path } from "react-native-svg";

import { colors, radii, spacing } from "@/theme/tokens";

import { getPatternColor } from "../core/pattern";

import { CardBody } from "./shared";
import type { DigitalCardLayoutProps } from "./types";

/* ------------------ BREAK ------------------ */

// Renders the centered digital business-card layout for samples and saved profiles.
export default function Centered({ data, primaryColor, onOpenLink, isPreview = false }: DigitalCardLayoutProps) {
  //Default Return
  return <View style={styles.card}>
    <View style={styles.cover}>
      <Svg width="100%" height="100%" viewBox="0 0 600 160" preserveAspectRatio="none">
        <Defs><ClipPath id="centeredCover"><Path d="M0 0H600V120Q300 200 0 120Z" /></ClipPath></Defs>
        <Path d="M0 0H600V120Q300 200 0 120Z" fill={primaryColor} />
        <Path d="M-40 15 C80 100 150 -35 270 35 S450 125 640 25 M-40 50 C80 135 150 0 270 70 S450 160 640 60 M-40 85 C80 170 150 35 270 105 S450 195 640 95" clipPath="url(#centeredCover)" fill="none" stroke={getPatternColor(primaryColor)} strokeWidth={2} opacity={0.65} />
      </Svg>
    </View>
    <CardBody data={data} primaryColor={primaryColor} onOpenLink={isPreview ? undefined : onOpenLink} centered hasCover />
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl + spacing.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.line.main, backgroundColor: colors.white.main },
  cover: { height: 112, width: "120%", marginLeft: "-10%" },
});
