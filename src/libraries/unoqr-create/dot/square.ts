import type { DotShapeInput } from "./types";

// Draws one full square QR data module.
export function squareDot({ x, y, color }: DotShapeInput): string {
  return `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
};//export ends
