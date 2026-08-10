import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import { PxCard } from "@/components/elements/PxCard";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanCategory = {
  label: string;
  count: number;
  percentage: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  backgroundColor: string;
};

type CategoryCardProps = {
  category: ScanCategory;
};

/* ------------------ BREAK ------------------ */

const totalScans = 248;
const patternLines = Array.from({ length: 24 }, (_, index) => index);

const scanCategories: ScanCategory[] = [
  {
    label: "Shopping",
    count: 86,
    percentage: 35,
    icon: "shopping-outline",
    color: colors.secondary.main,
    backgroundColor: colors.secondary.light
  },
  {
    label: "Real Estate",
    count: 64,
    percentage: 26,
    icon: "home-city-outline",
    color: colors.info.main,
    backgroundColor: "#EAF2FF"
  },
  {
    label: "Payments",
    count: 58,
    percentage: 23,
    icon: "credit-card-outline",
    color: colors.success.dark,
    backgroundColor: "#E8F7ED"
  },
  {
    label: "Events",
    count: 40,
    percentage: 16,
    icon: "calendar-star",
    color: colors.warning.dark,
    backgroundColor: "#FFF3DE"
  }
];

/* ------------------ BREAK ------------------ */

// Displays a compact single-screen summary of the user's QR scan activity.
export function HomeAnalytics() {
  //Default Return
  return (
    <View style={styles.root}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>YOUR ACTIVITY</Text>
          <Text style={styles.heading}>Scan overview</Text>
        </View>
        <View style={styles.periodPill}>
          <Text style={styles.periodText}>All time</Text>
        </View>
      </View>

      <PxCard padded={false} style={styles.totalCard} contentStyle={styles.totalCardContent}>
        <ScanCardPattern />

        <View style={styles.totalIconWrap}>
          <MaterialCommunityIcons name="qrcode-scan" size={28} color={colors.white.main} />
        </View>

        <View style={styles.totalCopy}>
          <Text style={styles.totalLabel}>Total scans</Text>
          <Text style={styles.totalValue}>{totalScans}</Text>
        </View>

        <View style={styles.growthPill}>
          <MaterialCommunityIcons name="trending-up" size={15} color={colors.success.dark} />
          <Text style={styles.growthText}>18%</Text>
        </View>
      </PxCard>

      <View style={styles.categoryHeadingRow}>
        <Text style={styles.categoryHeading}>By category</Text>
        <Text style={styles.categoryCaption}>{scanCategories.length} categories</Text>
      </View>

      <View style={styles.categoryGrid}>
        {scanCategories.map((category) => (
          <CategoryCard key={category.label} category={category} />
        ))}
      </View>

      <View style={styles.insightRow}>
        <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.secondary.main} />
        <Text style={styles.insightText}>Shopping is your most-scanned category.</Text>
      </View>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Draws the UnoQR woven lines and soft radial glows behind the scan total.
function ScanCardPattern() {
  //Default Return
  return (
    <View pointerEvents="none" style={styles.totalPattern}>
      <View style={styles.orangeGlowLarge} />
      <View style={styles.orangeGlowSmall} />
      <View style={styles.whiteGlow} />
      {patternLines.map((lineIndex) => (
        <View
          key={`orange-${lineIndex}`}
          style={[styles.patternLine, styles.orangePatternLine, { left: lineIndex * 24 - 180 }]}
        />
      ))}
      {patternLines.map((lineIndex) => (
        <View
          key={`ink-${lineIndex}`}
          style={[styles.patternLine, styles.inkPatternLine, { left: lineIndex * 31 - 180 }]}
        />
      ))}
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Displays one category's scan count and proportional activity.
function CategoryCard({ category }: CategoryCardProps) {
  //Default Return
  return (
    <PxCard padded={false} bordered style={styles.categoryCard} contentStyle={styles.categoryCardContent}>
      <View style={styles.categoryTopRow}>
        <View style={[styles.categoryIconWrap, { backgroundColor: category.backgroundColor }]}>
          <MaterialCommunityIcons name={category.icon} size={20} color={category.color} />
        </View>
        <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
      </View>

      <Text style={styles.categoryValue}>{category.count}</Text>
      <Text numberOfLines={1} style={styles.categoryLabel}>{category.label}</Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${category.percentage}%`, backgroundColor: category.color }
          ]}
        />
      </View>
    </PxCard>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.cream.main
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  headingCopy: {
    gap: spacing.xxs
  },
  eyebrow: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    letterSpacing: 1.5
  },
  heading: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h5,
    lineHeight: 28
  },
  periodPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.white.main
  },
  periodText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  totalCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.neutral.light,
    borderRadius: radii.xl,
    backgroundColor: colors.secondary.light
  },
  totalCardContent: {
    position: "relative",
    width: "100%",
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md
  },
  totalPattern: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden"
  },
  patternLine: {
    position: "absolute",
    top: -150,
    width: 1,
    height: 420
  },
  orangePatternLine: {
    backgroundColor: "rgba(255, 85, 40, 0.09)",
    transform: [{ rotate: "45deg" }]
  },
  inkPatternLine: {
    backgroundColor: "rgba(25, 20, 20, 0.035)",
    transform: [{ rotate: "-45deg" }]
  },
  orangeGlowLarge: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255, 85, 40, 0.09)"
  },
  orangeGlowSmall: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255, 85, 40, 0.08)"
  },
  whiteGlow: {
    position: "absolute",
    bottom: -110,
    left: -70,
    width: 250,
    height: 250,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255, 255, 255, 0.42)"
  },
  totalIconWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.main
  },
  totalCopy: {
    flex: 1
  },
  totalLabel: {
    color: colors.neutral.dark,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.body2
  },
  totalValue: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h3,
    lineHeight: 38
  },
  growthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: "#E8F7ED"
  },
  growthText: {
    color: colors.success.dark,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  categoryHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  categoryHeading: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  categoryCaption: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  categoryCard: {
    width: "48%",
    flexGrow: 1,
    borderRadius: radii.lg
  },
  categoryCardContent: {
    minHeight: 124,
    padding: spacing.md
  },
  categoryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md
  },
  categoryPercentage: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  categoryValue: {
    marginTop: spacing.xs,
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h6,
    lineHeight: 24
  },
  categoryLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  progressTrack: {
    height: 4,
    marginTop: spacing.xs,
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: colors.line.light
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.light
  },
  insightText: {
    flex: 1,
    color: colors.neutral.dark,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  }
});
