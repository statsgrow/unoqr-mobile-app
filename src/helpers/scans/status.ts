import { colors } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

// Selects green, red, or orange for a stored scan processing status.
export function getScanStatusColor(status: string | null | undefined): string {
  const normalizedStatus = (status || "pending").toLocaleLowerCase();

  if (["complete", "completed", "processed", "synced", "success"].includes(normalizedStatus)) {
    return colors.success.dark;
  };//if ends

  if (["failed", "error"].includes(normalizedStatus)) {
    return colors.error.main;
  };//if ends

  return colors.warning.dark;
};//export ends

// Converts a stored scan status into a readable accessibility label.
export function getScanStatusLabel(status: string | null | undefined): string {
  return (status || "pending")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};//export ends

