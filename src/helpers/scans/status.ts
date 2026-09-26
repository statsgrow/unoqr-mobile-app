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

// Reads crawl failures, including older rows whose crawl status was saved incorrectly.
export function getScanCrawlError(crawlStatus: string | null | undefined, metadataError: unknown): string | null {
  if (crawlStatus !== "failed" && !metadataError) return null;
  if (typeof metadataError === "string" && metadataError.trim()) return metadataError;
  if (metadataError && typeof metadataError === "object" && "message" in metadataError) {
    const message = metadataError.message;
    if (typeof message === "string" && message.trim()) return message;
  };//if ends

  return "We could not collect details for this link.";
};//export ends
