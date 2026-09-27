import { circleEye } from "./circle";
import { frameEye } from "./frame";
import { leafEye } from "./leaf";
import { roundedEye } from "./rounded";
import { squareEye } from "./square";
import type { EyeShapeBuilder, EyeStyle } from "./types";

export type { EyeStyle } from "./types";

/* ------------------ BREAK ------------------ */

const EYE_BUILDERS: Record<EyeStyle, EyeShapeBuilder> = {
  square: squareEye,
  rounded: roundedEye,
  circle: circleEye,
  leaf: leafEye,
  frame: frameEye
};

/* ------------------ BREAK ------------------ */

// Draws one eye style at the given module position for previews and exports.
export function buildEye(style: EyeStyle, x: number, y: number, color: string): string {
  return EYE_BUILDERS[style](x, y, color);
};//export ends

// Identifies the three seven-module finder areas in a QR matrix.
export function isEyeModule(row: number, col: number, size: number): boolean {
  const farEdge = size - 7;
  return (row < 7 && col < 7)
    || (row < 7 && col >= farEdge)
    || (row >= farEdge && col < 7);
};//export ends
