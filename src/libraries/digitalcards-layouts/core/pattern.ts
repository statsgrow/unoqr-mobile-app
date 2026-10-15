/* ------------------ BREAK ------------------ */

// Mixes the primary color with white on dark backgrounds and black on light backgrounds.
export function getPatternColor(primary: string): string {
   const channels = [1, 3, 5].map(offset => parseInt(primary.slice(offset, offset + 2), 16));
   const brightness = (channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114) / 255;
   const target = brightness < 0.5 ? 255 : 0;
   return `rgb(${channels.map(value => Math.round(value + (target - value) * 0.3)).join(', ')})`;
};//export ends
