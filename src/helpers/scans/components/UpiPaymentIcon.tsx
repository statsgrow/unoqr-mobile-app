import { StyleSheet, View } from "react-native";

import UpiLogoAsset from "@/assets/svg/upi_logo.svg";
import { colors, radii } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type UpiPaymentIconProps = {
  size?: number;
  backgroundColor?: string;
};

/* ------------------ BREAK ------------------ */

// Renders the official compact UPI mark inside a neutral black-outlined badge.
export function UpiPaymentIcon({ size = 40, backgroundColor = colors.white.main }: UpiPaymentIconProps) {
  const logoWidth = size * 0.76;
  const logoHeight = logoWidth * (35.2 / 130.54);
  const borderRadius = size >= 40 ? radii.lg : radii.sm;

  //Default Return
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius, backgroundColor }]}>
      <UpiLogoAsset width={logoWidth} height={logoHeight} />
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neutral.light,
    backgroundColor: colors.white.main
  }
});
