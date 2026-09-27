import type { DotStyle } from "@/helpers/qrcodes/modify/dot";

import { buildFrameDots } from "./dots";

/* ------------------ BREAK ------------------ */

// Fills the circular frame with extra dummy dots in the selected dot shape and color.
export function buildCircleFrameDots(value: string, outerSize: number, qrSize: number, inset: number, dotStyle: DotStyle, color: string): string {
  return buildFrameDots({
    value,
    outerSize,
    qrSize,
    inset,
    frame: "round",
    dotStyle,
    color,
    density: 0.55,
    edgeClearance: 1
  });
};//export ends
