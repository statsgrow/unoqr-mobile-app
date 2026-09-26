import type { ScanTypeInit } from "./types";

// Defines the mobile label and icon for a resolved file link.
export const getInit: ScanTypeInit = { label: "File", type: "file", icon: "file-outline" };

/* ------------------ BREAK ------------------ */

const fileTypeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "application/msword": "Word document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word document",
  "application/vnd.ms-excel": "Excel spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel spreadsheet",
  "application/vnd.ms-powerpoint": "PowerPoint presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint presentation"
};

/* ------------------ BREAK ------------------ */

// Turns link-preview MIME data into a readable file format with an extension fallback.
export function getFileTypeLabel(contentType: string | null | undefined, url: string | null | undefined): string {
  const mimeType = contentType?.split(";")[0].trim().toLowerCase() || "";
  const knownLabel = fileTypeLabels[mimeType];
  if (knownLabel) return knownLabel;

  try {
    const fileName = new URL(url || "").pathname.split("/").pop() || "";
    const extension = fileName.includes(".") ? fileName.split(".").pop() : null;
    if (extension) {
      return extension.toUpperCase();
    };//if ends
  } catch {
    // An unknown URL can still have a useful MIME subtype.
  };//try-catch ends

  return mimeType.split("/")[1]?.toUpperCase() || "Unknown file";
};//export ends
