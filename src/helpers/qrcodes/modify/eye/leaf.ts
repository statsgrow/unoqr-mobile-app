// Draws the asymmetric leaf finder frame and center in a seven-module area.
export function leafEye(x: number, y: number, color: string): string {
  const frame = `M${x + 2} ${y}h5v5a2 2 0 0 1 -2 2h-5v-5a2 2 0 0 1 2 -2z`
    + ` M${x + 2} ${y + 1}a1 1 0 0 0 -1 1v4h4a1 1 0 0 0 1 -1v-4z`;
  const center = `M${x + 3} ${y + 2}h2v2a1 1 0 0 1 -1 1h-2v-2a1 1 0 0 1 1 -1z`;

  return `<path fill-rule="evenodd" d="${frame}" fill="${color}"/>`
    + `<path d="${center}" fill="${color}"/>`;
};//export ends
