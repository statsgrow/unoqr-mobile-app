// Draws a standard seven-module finder frame and three-module center.
export function squareEye(x: number, y: number, color: string): string {
  return `<path fill-rule="evenodd" d="M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}h5v5h-5z" fill="${color}"/>`
    + `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${color}"/>`;
};//export ends
