import type { DotShapeInput } from "./types";

// Rounds only the corners of a module that do not touch another dark module.
export function connectedDot({ x, y, col, row, color, hasNeighbor }: DotShapeInput): string {
  const top = hasNeighbor(col, row - 1);
  const right = hasNeighbor(col + 1, row);
  const bottom = hasNeighbor(col, row + 1);
  const left = hasNeighbor(col - 1, row);
  const radius = 0.5;

  let path = !top && !left ? `M${x + radius} ${y}` : `M${x} ${y}`;
  path += !top && !right ? `H${x + 1 - radius}A${radius} ${radius} 0 0 1 ${x + 1} ${y + radius}` : `H${x + 1}`;
  path += !bottom && !right ? `V${y + 1 - radius}A${radius} ${radius} 0 0 1 ${x + 1 - radius} ${y + 1}` : `V${y + 1}`;
  path += !bottom && !left ? `H${x + radius}A${radius} ${radius} 0 0 1 ${x} ${y + 1 - radius}` : `H${x}`;
  path += !top && !left ? `V${y + radius}A${radius} ${radius} 0 0 1 ${x + radius} ${y}` : `V${y}`;

  return `<path d="${path}Z" fill="${color}"/>`;
};//export ends
