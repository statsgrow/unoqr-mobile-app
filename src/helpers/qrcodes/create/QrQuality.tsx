import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type QrQualityProps = {
  content: string;
  backgroundColor: string;
  foregroundColor: string;
  dotColor: string;
  eyeColor: string;
};

export type ContentLengthResult = {
  length: number;
  score: number;
  message: string;
  canCreate: boolean;
};

export type ColorQualityResult = {
  score: number;
  message: string;
};

/* ------------------ BREAK ------------------ */

export const MAX_QR_CHARACTERS = 500;

/* ------------------ BREAK ------------------ */

// Scores QR density from the number of characters that will be encoded.
export function checkContentLength(content: string): ContentLengthResult {
  const length = Array.from(content.trim()).length;
  if (length === 0) return { length, score: 0, message: "Add content to check QR quality.", canCreate: false };
  if (length <= 120) return { length, score: 100, message: "Very good length for easy scanning.", canCreate: true };
  if (length <= 240) return { length, score: 80, message: "Good length for scanning.", canCreate: true };
  if (length <= 300) return { length, score: 50, message: "Dense QR. Shorten the content if possible.", canCreate: true };
  if (length <= MAX_QR_CHARACTERS) return {
    length,
    score: Math.round(25 * (MAX_QR_CHARACTERS - length) / (MAX_QR_CHARACTERS - 300)),
    message: "Very dense QR. It may be hard to scan.",
    canCreate: true
  };
  return { length, score: 0, message: "Too long. Use 500 characters or fewer.", canCreate: false };
};//export ends

// Scores the contrast of the rendered dots and eyes against the background.
export function checkColors(backgroundColor: string, foregroundColor: string, dotColor: string, eyeColor: string): ColorQualityResult {
  const dotRatio = contrastRatio(backgroundColor, dotColor || foregroundColor);
  const eyeRatio = contrastRatio(backgroundColor, eyeColor || foregroundColor);
  const lowestRatio = Math.min(dotRatio, eyeRatio);

  if (lowestRatio < 3) return { score: 20, message: "Low color contrast. Change the QR or background color." };
  if (lowestRatio < 4.5) return { score: 55, message: "Contrast may be weak. Try darker QR colors." };
  return { score: 100, message: "Colors have good contrast." };
};//export ends

// Shows a compact character count, quality scale, and scanning guidance.
export default function QrQuality({ content, backgroundColor, foregroundColor, dotColor, eyeColor }: QrQualityProps) {
  const lengthResult = checkContentLength(content);
  const colorResult = checkColors(backgroundColor, foregroundColor, dotColor, eyeColor);
  const score = lengthResult.canCreate ? Math.min(lengthResult.score, colorResult.score) : lengthResult.score;
  const isAtLimit = lengthResult.length === MAX_QR_CHARACTERS;
  const markerPosition = Math.max(2, Math.min(98, 100 - score));
  const hasColorIssue = lengthResult.canCreate && colorResult.score < 100;
  const hasLengthIssue = lengthResult.score <= 50 && lengthResult.canCreate;
  const message = !lengthResult.canCreate ? lengthResult.message
    : hasColorIssue && hasLengthIssue ? `${lengthResult.message} ${colorResult.message}`
    : hasColorIssue ? colorResult.message : lengthResult.message;
  const label = !lengthResult.canCreate ? "Not ready"
    : score >= 90 ? "Very good" : score >= 70 ? "Good" : score >= 40 ? "Needs care" : "Hard to scan";

  //Default Return
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.count}>{lengthResult.length} {lengthResult.length === 1 ? "character" : "characters"}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.barArea}>
        <View style={[styles.bar, isAtLimit && styles.fullRedBar]}>
          {!isAtLimit ? <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="quality" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#148B4B" />
                <Stop offset="35%" stopColor="#82B94B" />
                <Stop offset="65%" stopColor="#E9B640" />
                <Stop offset="100%" stopColor="#D94B3B" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#quality)" />
          </Svg> : null}
        </View>
        {lengthResult.length > 0 ? <View style={[styles.marker, { left: `${markerPosition}%` }]} /> : null}
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Returns the visual contrast ratio for two hex colors.
function contrastRatio(first: string, second: string): number {
  const firstLightness = relativeLuminance(first);
  const secondLightness = relativeLuminance(second);
  return (Math.max(firstLightness, secondLightness) + 0.05) / (Math.min(firstLightness, secondLightness) + 0.05);
};//func ends

// Converts a hex color to relative luminance using its red, green, and blue channels.
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  count: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  label: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption },
  barArea: { height: 16, justifyContent: "center" },
  bar: { height: 8, overflow: "hidden", borderRadius: radii.pill },
  fullRedBar: { backgroundColor: "#D94B3B" },
  marker: {
    position: "absolute",
    top: 1,
    width: 14,
    height: 14,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: colors.white.main,
    borderRadius: radii.pill,
    backgroundColor: colors.primary.main
  },
  message: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption }
});
