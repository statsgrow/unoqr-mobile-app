import type { DotShapeInput } from "./types";

// Alternates opposite rounded corners across QR data modules.
export function classyDot({ x, y, col, row, color }: DotShapeInput): string {
  const radius = 0.5;
  const path = (col + row) % 2 === 0
    ? `M${x + radius} ${y}H${x + 1}V${y + 1 - radius}`
      + `A${radius} ${radius} 0 0 1 ${x + 1 - radius} ${y + 1}`
      + `H${x}V${y + radius}A${radius} ${radius} 0 0 1 ${x + radius} ${y}Z`
    : `M${x} ${y}H${x + 1 - radius}`
      + `A${radius} ${radius} 0 0 1 ${x + 1} ${y + radius}`
      + `V${y + 1}H${x + radius}`
      + `A${radius} ${radius} 0 0 1 ${x} ${y + 1 - radius}Z`;

  return `<path d="${path}" fill="${color}"/>`;
};//export ends
