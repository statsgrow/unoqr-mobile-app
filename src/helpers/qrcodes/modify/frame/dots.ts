import { buildDot, type DotStyle } from "@/helpers/qrcodes/modify/dot";

/* ------------------ BREAK ------------------ */

export type FrameDotOptions = {
  value: string;
  outerSize: number;
  qrSize: number;
  inset: number;
  frame: "squircle" | "round" | "square";
  dotStyle: DotStyle;
  color: string;
  density: number;
  edgeClearance: number;
  isInside?: (col: number, row: number) => boolean;
};

/* ------------------ BREAK ------------------ */

// Draws seeded dummy dots outside the QR bounds using the chosen module shape and color.
export function buildFrameDots({ value, outerSize, qrSize, inset, frame, dotStyle, color, density, edgeClearance, isInside }: FrameDotOptions): string {
  const eligible: Array<[number, number]> = [];
  const center = outerSize / 2;
  const radius = center - 1.5;

  for (let row = edgeClearance; row < outerSize - edgeClearance; row++) {
    for (let col = edgeClearance; col < outerSize - edgeClearance; col++) {
      if (col >= inset && col < inset + qrSize && row >= inset && row < inset + qrSize) continue;
      if (isInside && !isInside(col, row)) continue;
      const corners = [[col, row], [col + 1, row], [col, row + 1], [col + 1, row + 1]];
      if (frame === "round" && corners.some(([x, y]) => Math.hypot(x - center, y - center) > radius)) continue;
      eligible.push([col, row]);
    };//for ends
  };//for ends

  const random = seededRandom(hashValue(value));
  for (let index = eligible.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [eligible[index], eligible[other]] = [eligible[other], eligible[index]];
  };//for ends

  const selected = eligible.slice(0, Math.floor(eligible.length * density));
  const positions = new Set(selected.map(([col, row]) => `${col},${row}`));
  const hasNeighbor = (col: number, row: number): boolean => positions.has(`${col},${row}`);

  return selected.map(([col, row]) => buildDot(dotStyle, { x: col, y: row, col, row, color, hasNeighbor })).join("");
};//export ends

// Hashes QR content to keep decorative dots stable while styling changes.
export function hashValue(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  };//for ends
  return hash >>> 0;
};//export ends

// Returns a reproducible pseudo-random number for frame dot placement.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};//func ends
