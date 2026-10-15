import type { DotShapeInput } from "./types";

// Draws one QR data module with rounded corners.
export function roundedDot({ x, y, color }: DotShapeInput): string {
  return `<rect x="${x}" y="${y}" width="1" height="1" rx="0.3" fill="${color}"/>`;
};//export ends
