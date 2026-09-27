/* ------------------ BREAK ------------------ */

// Keeps the selected shape at the start while preserving the other shapes' order.
export function selectedFirst<T extends { style: string }>(options: T[], selectedStyle: string): T[] {
  const selected = options.find((option) => option.style === selectedStyle);
  return selected ? [selected, ...options.filter((option) => option.style !== selectedStyle)] : options;
};//export ends
