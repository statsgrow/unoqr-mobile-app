// Draws a rounded finder frame and center within the standard seven-module area.
export function roundedEye(x: number, y: number, color: string): string {
  const frame = `M${x + 1.5} ${y}h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1 -1.5 1.5h-4a1.5 1.5 0 0 1 -1.5 -1.5v-4a1.5 1.5 0 0 1 1.5 -1.5z`
    + ` M${x + 1.5} ${y + 1}a0.5 0.5 0 0 0 -0.5 0.5v4a0.5 0.5 0 0 0 0.5 0.5h4a0.5 0.5 0 0 0 0.5 -0.5v-4a0.5 0.5 0 0 0 -0.5 -0.5z`;

  return `<path fill-rule="evenodd" d="${frame}" fill="${color}"/>`
    + `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.7" fill="${color}"/>`;
};//export ends
