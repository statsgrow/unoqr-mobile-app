// Draws a heavy rounded finder frame with a circular center.
export function frameEye(x: number, y: number, color: string): string {
  const frame = `M${x + 2} ${y}h3a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-3a2 2 0 0 1 -2 -2v-3a2 2 0 0 1 2 -2z`
    + ` M${x + 2} ${y + 1}a1 1 0 0 0 -1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1 -1v-3a1 1 0 0 0 -1 -1z`;

  return `<path fill-rule="evenodd" d="${frame}" fill="${color}"/>`
    + `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${color}"/>`;
};//export ends
