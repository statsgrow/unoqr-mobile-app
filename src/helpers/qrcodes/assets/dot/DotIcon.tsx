import { SvgXml } from "react-native-svg";

import { buildDot, type DotStyle } from "@/helpers/qrcodes/modify/dot";

/* ------------------ BREAK ------------------ */

export type DotIconProps = {
  color: string;
  size?: number;
};

type DotStyleIconProps = DotIconProps & {
  style: DotStyle;
};

/* ------------------ BREAK ------------------ */

const SAMPLE = ["10101", "11101", "01110", "10111", "11010"];

/* ------------------ BREAK ------------------ */

// Renders a small QR module sample using the same shapes as exported codes.
export function DotIcon({ style, color, size = 38 }: DotStyleIconProps) {
  const hasNeighbor = (col: number, row: number): boolean => SAMPLE[row]?.[col] === "1";
  const dots: string[] = [];

  for (let row = 0; row < SAMPLE.length; row++) {
    for (let col = 0; col < SAMPLE[row].length; col++) {
      if (!hasNeighbor(col, row)) continue;
      dots.push(buildDot(style, { x: col, y: row, col, row, color, hasNeighbor }));
    };//for ends
  };//for ends

  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 5">${dots.join("")}</svg>`;

  //Default Return
  return <SvgXml xml={xml} width={size} height={size} />;
};//export ends
