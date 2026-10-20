import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Rect } from "react-native-svg";

import { colors, radii, spacing } from "@/theme/tokens";

import { getPatternColor } from "../core/pattern";

import { CardBody } from "./shared";
import type { DigitalCardLayoutProps } from "./types";

/* ------------------ BREAK ------------------ */

// Renders the modern digital business-card layout for samples and saved profiles.
export default function Modern({ data, primaryColor, onOpenLink, isPreview = false }: DigitalCardLayoutProps) {
  const patternColor = getPatternColor(primaryColor);

  //Default Return
  return <View style={styles.card}>
    <View style={[styles.cover, Boolean(data.featurePhoto) && styles.featureCover, { backgroundColor: primaryColor }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {data.featurePhoto ? <Image source={data.featurePhoto} resizeMode="cover" style={styles.featureImage} /> : <Svg width="100%" height="100%" viewBox="0 0 600 160" preserveAspectRatio="xMidYMid slice">
        <G transform="rotate(-32 470 60)">
          <Rect x={330} y={-80} width={280} height={280} rx={48} fill={patternColor} opacity={0.16} />
          <Rect x={354} y={-56} width={232} height={232} rx={36} fill="none" stroke={patternColor} strokeWidth={2} opacity={0.65} />
          <Rect x={378} y={-32} width={184} height={184} rx={26} fill="none" stroke={patternColor} strokeWidth={2} opacity={0.45} />
          <Rect x={402} y={-8} width={136} height={136} rx={18} fill={patternColor} opacity={0.12} />
        </G>
        <G fill={patternColor} opacity={0.5}>
          <Circle cx={36} cy={28} r={2} /><Circle cx={52} cy={28} r={2} /><Circle cx={68} cy={28} r={2} />
          <Circle cx={36} cy={44} r={2} /><Circle cx={52} cy={44} r={2} /><Circle cx={68} cy={44} r={2} />
        </G>
      </Svg>}
    </View>
    <CardBody data={data} primaryColor={primaryColor} onOpenLink={isPreview ? undefined : onOpenLink} hasCover />
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl + spacing.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.line.main, backgroundColor: colors.white.main },
  cover: { height: 128, overflow: "hidden" },
  featureCover: { height: undefined, width: "100%", aspectRatio: 2.7 },
  featureImage: { width: "100%", height: "100%" },
});
