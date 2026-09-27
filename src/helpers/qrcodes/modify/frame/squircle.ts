import type { DotStyle } from "@/helpers/qrcodes/modify/dot";

import { buildFrameDots } from "./dots";

/* ------------------ BREAK ------------------ */

// Sizes the squircle so its curved stroke stays one module away from the QR matrix.
export function getSquircleInset(qrSize: number): number {
  const matrixSize = qrSize - 2;
  const matrixHalf = matrixSize / 2;

  for (let inset = 2; inset <= qrSize; inset++) {
    const frameHalf = (qrSize + inset * 2) / 2 - 0.5;
    let hasGap = true;

    for (let sample = 0; sample <= 128; sample++) {
      const [x, y] = squircleCornerPoint(frameHalf, sample / 128);
      const distance = Math.hypot(Math.max(0, x - matrixHalf), Math.max(0, -matrixHalf - y));
      if (distance < 1.5) {
        hasGap = false;
        break;
      };//if ends
    };//for ends

    if (hasGap) return inset;
  };//for ends

  return qrSize;
};//export ends

// Fills the squircle up to its one-module inner edge without crossing the frame stroke.
export function buildSquircleFrameDots(value: string, outerSize: number, qrSize: number, inset: number, dotStyle: DotStyle, color: string): string {
  const center = outerSize / 2;
  const rowHalfWidths = Array.from({ length: outerSize }, (_, row) => Math.min(
    squircleRowHalfWidth(outerSize, 1, row),
    squircleRowHalfWidth(outerSize, 1, row + 1)
  ));

  return buildFrameDots({
    value,
    outerSize,
    qrSize,
    inset,
    frame: "squircle",
    dotStyle,
    color,
    density: 0.375,
    edgeClearance: 1,
    isInside: (col, row) => col >= center - rowHalfWidths[row] && col + 1 <= center + rowHalfWidths[row]
  });
};//export ends

/* ------------------ BREAK ------------------ */

// Returns a point on the top-right quarter of the squircle's cubic curve.
function squircleCornerPoint(half: number, t: number): [number, number] {
  const remaining = 1 - t;
  const x = half * (3 * remaining * remaining * t * 0.71 + 3 * remaining * t * t + t * t * t);
  const y = -half * (remaining * remaining * remaining + 3 * remaining * remaining * t + 3 * remaining * t * t * 0.71);
  return [x, y];
};//func ends

// Finds the available half-width inside the squircle at one horizontal edge.
function squircleRowHalfWidth(size: number, inset: number, rowEdge: number): number {
  const center = size / 2;
  const half = center - inset;
  const vertical = Math.abs(rowEdge - center);
  if (vertical >= half) return 0;

  let low = 0;
  let high = 1;
  for (let step = 0; step < 16; step++) {
    const middle = (low + high) / 2;
    const [, y] = squircleCornerPoint(half, middle);
    if (-y > vertical) low = middle;
    else high = middle;
  };//for ends

  const [width] = squircleCornerPoint(half, (low + high) / 2);
  return width;
};//func ends
