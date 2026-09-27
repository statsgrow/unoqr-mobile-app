// Draws a circular finder ring and center within the standard seven-module area.
export function circleEye(x: number, y: number, color: string): string {
  const cx = x + 3.5;
  const cy = y + 3.5;

  const ring = `M${cx} ${cy}m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0z`
    + ` M${cx} ${cy}m-2.5 0a2.5 2.5 0 1 1 5 0a2.5 2.5 0 1 1 -5 0z`;

  return `<path fill-rule="evenodd" d="${ring}" fill="${color}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="1.5" fill="${color}"/>`;
};//export ends
