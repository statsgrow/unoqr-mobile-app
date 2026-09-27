import type { BitMatrix } from "qrcode";

import { isEyeModule } from "@/helpers/qrcodes/modify/eye";

import { classyDot } from "./classy";
import { connectedDot } from "./connected";
import { circleDot } from "./dots";
import { roundedDot } from "./rounded";
import { squareDot } from "./square";
import type { DotShapeBuilder, DotShapeInput, DotStyle } from "./types";

export type { DotStyle } from "./types";

/* ------------------ BREAK ------------------ */

const DOT_BUILDERS: Record<DotStyle, DotShapeBuilder> = {
  square: squareDot,
  rounded: roundedDot,
  dots: circleDot,
  classy: classyDot,
  connected: connectedDot
};

/* ------------------ BREAK ------------------ */

// Draws one module with the selected dot style.
export function buildDot(style: DotStyle, input: DotShapeInput): string {
  return DOT_BUILDERS[style](input);
};//export ends

// Draws all dark QR data modules while leaving finder eyes to the eye renderer.
export function buildDots(modules: BitMatrix, margin: number, style: DotStyle, color: string): string {
  const parts: string[] = [];

  // Checks only dark data modules so connected corners stay clear of finder eyes.
  const hasNeighbor = (col: number, row: number): boolean => (
    row >= 0 && row < modules.size && col >= 0 && col < modules.size
    && modules.get(row, col) === 1 && !isEyeModule(row, col, modules.size)
  );//func ends

  for (let row = 0; row < modules.size; row++) {
    if (style === "square") {
      let runStart = -1;

      for (let col = 0; col <= modules.size; col++) {
        const dark = col < modules.size && hasNeighbor(col, row);
        if (dark && runStart < 0) runStart = col;
        if (!dark && runStart >= 0) {
          parts.push(`<rect x="${margin + runStart}" y="${margin + row}" width="${col - runStart}" height="1" fill="${color}"/>`);
          runStart = -1;
        };//if ends
      };//for ends
      continue;
    };//if ends

    for (let col = 0; col < modules.size; col++) {
      if (!hasNeighbor(col, row)) continue;
      parts.push(buildDot(style, { x: margin + col, y: margin + row, col, row, color, hasNeighbor }));
    };//for ends
  };//for ends

  return parts.join("");
};//export ends
