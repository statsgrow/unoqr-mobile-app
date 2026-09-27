import { SvgXml } from "react-native-svg";

import { buildEye, type EyeStyle } from "@/helpers/qrcodes/modify/eye";

/* ------------------ BREAK ------------------ */

export type EyeIconProps = {
  color: string;
  size?: number;
};

type EyeShapeIconProps = EyeIconProps & {
  style: EyeStyle;
};

/* ------------------ BREAK ------------------ */

// Renders the same seven-module eye geometry used in generated QR codes.
export function EyeIcon({ style, color, size = 36 }: EyeShapeIconProps) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7">${buildEye(style, 0, 0, color)}</svg>`;

  //Default Return
  return <SvgXml xml={xml} width={size} height={size} />;
};//export ends
