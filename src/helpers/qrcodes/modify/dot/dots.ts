import type { DotShapeInput } from "./types";

// Draws one circular QR data module.
export function circleDot({ x, y, color }: DotShapeInput): string {
  return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.45" fill="${color}"/>`;
};//export ends
