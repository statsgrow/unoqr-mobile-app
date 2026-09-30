import type { BarcodeType } from "expo-camera";

/* ------------------ BREAK ------------------ */

export type BarcodeKind = "ean-13" | "ean-8" | "upc-a" | "upc-e" | "itf-14" | "code128" | "code39" | "code93" | "codabar" | "datamatrix" | "pdf417" | "aztec";

export const scannerBarcodeTypes: BarcodeType[] = [
  "qr", "ean13", "ean8", "upc_a", "upc_e", "itf14", "code128", "code39", "code93", "codabar", "datamatrix", "pdf417", "aztec"
];

// Android image decoding returns ML Kit format constants instead of camera type strings.
const androidFormats: Record<number, BarcodeType> = {
  1: "code128", 2: "code39", 4: "code93", 8: "codabar", 16: "datamatrix",
  32: "ean13", 64: "ean8", 128: "itf14", 256: "qr", 512: "upc_a",
  1024: "upc_e", 2048: "pdf417", 4096: "aztec"
};

/* ------------------ BREAK ------------------ */

// Normalize camera strings and Android image format codes before classifying a scan.
export function getBarcodeFormat(format: string | number): BarcodeType | null {
  if (typeof format === "number") return androidFormats[format] ?? null;
  return scannerBarcodeTypes.find((type) => type === format) ?? null;
};//export ends

/* ------------------ BREAK ------------------ */

// Groups the detected barcode format into the kind stored with each scan.
export function getBarcodeKind(format: BarcodeType): BarcodeKind | null {
  if (format === "qr") return null;
  if (format === "ean13") return "ean-13";
  if (format === "ean8") return "ean-8";
  if (format === "upc_a") return "upc-a";
  if (format === "upc_e") return "upc-e";
  if (format === "itf14") return "itf-14";
  return format;
};//export ends
