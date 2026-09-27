import type { DotStyle } from "@/helpers/qrcodes/modify/dot";

import { buildFrameDots } from "./dots";

/* ------------------ BREAK ------------------ */

// Fills the square frame with extra dummy dots in the selected dot shape and color.
export function buildSquareFrameDots(value: string, outerSize: number, qrSize: number, inset: number, dotStyle: DotStyle, color: string): string {
  return buildFrameDots({
    value,
    outerSize,
    qrSize,
    inset,
    frame: "square",
    dotStyle,
    color,
    density: 0.55,
    edgeClearance: 2
  });
};//export ends
