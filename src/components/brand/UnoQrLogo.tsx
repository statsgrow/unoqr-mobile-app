import type { StyleProp, ViewStyle } from "react-native";

import UnoQrIconAsset from "@/assets/svg/unoqr_icon.svg";
import UnoQrLogoAsset from "@/assets/svg/unoqr_logo.svg";
import { colors } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type UnoQrLogoVariant = "icon" | "logo";

type UnoQrLogoProps = {
  variant?: UnoQrLogoVariant;
  width?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/* ------------------ BREAK ------------------ */

// Renders either official UnoQR SVG asset with configurable sizing and color.
export function UnoQrLogo({
  variant = "logo",
  width = variant === "icon" ? 32 : 140,
  color = colors.primary.main,
  style
}: UnoQrLogoProps) {
  const aspectRatio = variant === "icon" ? 433 / 482 : 1427 / 318;
  const height = width / aspectRatio;

  if (variant === "icon") {
    //Default Return
    return <UnoQrIconAsset width={width} height={height} fill={color} style={style} />;
  };//if ends

  //Default Return
  return <UnoQrLogoAsset width={width} height={height} fill={color} style={style} />;
};//export ends
