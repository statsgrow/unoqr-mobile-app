import type { BarcodeType } from "expo-camera";

import { getBarcodeFormat, getBarcodeKind } from "./Barcode";
import { persistScan } from "./db/persistScan";
import { processDeepLinkScan } from "./scanTypes/DeepLink";
import { processTextScan } from "./scanTypes/Text";
import {
  checkBharatQr,
  getUpiPaymentDetails
} from "./scanTypes/UpiPayment";
import { processWebsiteScan } from "./scanTypes/Website";

/* ---------------------- BREAK ---------------------- */

export type ScanType =
  | "url"
  | "text"
  | "email"
  | "phone"
  | "sms"
  | "wifi"
  | "contact"
  | "location"
  | "calendar"
  | "upi_payment"
  | "payment"
  | "product"
  | "barcode"
  | "auth"
  | "deep_link"
  | "custom";

export type PreparedScan = {
  type: ScanType;
  kind: string;
  format: BarcodeType | null;
  value: string;
};

export type ProcessedScanResult = {
  scanId: string | null;
  textValue: string | null;
};

/* ---------------------- BREAK ---------------------- */

// Normalizes actionable destinations while preserving text QR content byte-for-byte.
export function prepareScannedValue(rawValue: string, rawFormat?: string | number): PreparedScan | null {
  const format = rawFormat === undefined ? null : getBarcodeFormat(rawFormat);
  if (rawFormat !== undefined && !format) return null;

  // Preserve barcode data before QR URL normalization or content identification.
  if (format && format !== "qr") {
    const value = rawValue.trim();
    if (!value) return null;
    // Expo on iOS reports UPC-A as ean13 after removing its leading zero.
    const barcodeFormat = format === "ean13" && /^\d{12}$/.test(value) ? "upc_a" : format;
    return { type: "barcode", kind: getBarcodeKind(barcodeFormat)!, format: barcodeFormat, value };
  };//if ends

  const normalizedValue = normalizeScannedValue(rawValue);

  if (!normalizedValue) return null;

  const scanType = identifyScanType(normalizedValue);
  return {
    type: scanType,
    kind: scanType,
    format: format ?? null,
    value: scanType === "text" ? rawValue : normalizedValue
  };
};//export ends

// Creates one SQLite row and dispatches it to the handler owned by its scan type.
export async function processPreparedScan(scan: PreparedScan): Promise<ProcessedScanResult> {
  const storedScan = await persistScan(scan.value, scan.type, scan.kind, scan.format);

  if (!storedScan) return { scanId: null, textValue: null };

  if (scan.type === "url") {
    await processWebsiteScan(storedScan);
    return { scanId: storedScan.id, textValue: null };
  };//if ends

  if (scan.type === "deep_link") {
    await processDeepLinkScan(storedScan);
    return { scanId: storedScan.id, textValue: null };
  };//if ends

  if (scan.type === "text") {
    const textValue = processTextScan(storedScan);
    return { scanId: storedScan.id, textValue };
  };//if ends

  return { scanId: storedScan.id, textValue: null };
};//export ends

/* ---------------------- BREAK ---------------------- */

// Identifies the supported QR payload category after trimming its value.
export function identifyScanType(value: string): ScanType {
  if (isContactScan(value)) return "contact";
  if (isCalendarScan(value)) return "calendar";
  if (isAuthScan(value)) return "auth";
  if (isWifiScan(value)) return "wifi";
  if (isSmsScan(value)) return "sms";
  if (isLocationScan(value)) return "location";
  if (/^upi:\/\/pay(?:\?|$)/i.test(value.trim())) {
    return isUpiPaymentScan(value) ? "upi_payment" : "custom";
  };//if ends
  if (isPaymentScan(value)) return "payment";
  if (isEmailScan(value)) return "email";
  if (isUrlScan(value)) return "url";
  if (isProductScan(value)) return "product";
  if (isPhoneScan(value)) return "phone";
  if (isDeepLinkScan(value)) return "deep_link";
  if (isCustomScan(value)) return "custom";
  if (isTextScan(value)) return "text";

  //Default return
  return "custom";
};//export ends

// Adds HTTPS to recognizable bare web domains while preserving non-web QR payloads.
export function normalizeScannedValue(value: string): string {
  const text = value.trim();
  const bharatQrPaymentUrl = checkBharatQr(text);

  if (bharatQrPaymentUrl) return bharatQrPaymentUrl;
  if (isHttpUrl(text)) return text;
  if (isBareWebUrl(text)) return `https://${text}`;

  return text;
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains a vCard or MeCard contact.
export function isContactScan(value: string): boolean {
  const text = (value || "").trim();
  return /^(?:begin:vcard|mecard:)/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains an iCalendar calendar or event record.
export function isCalendarScan(value: string): boolean {
  const text = (value || "").trim();
  return /^(?:begin:vcalendar|begin:vevent)/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains an OTP authentication URI.
export function isAuthScan(value: string): boolean {
  const text = (value || "").trim();
  return /^otpauth:\/\//i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains Wi-Fi connection settings.
export function isWifiScan(value: string): boolean {
  const text = (value || "").trim();
  return /^wifi:/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains an SMS destination.
export function isSmsScan(value: string): boolean {
  const text = (value || "").trim();
  return /^(?:smsto:|sms:)/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains a geographic location URI.
export function isLocationScan(value: string): boolean {
  const text = (value || "").trim();
  return /^geo:/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains a UPI payment destination.
export function isUpiPaymentScan(value: string): boolean {
  return Boolean(getUpiPaymentDetails(value));
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload uses a recognized payment URI scheme.
export function isPaymentScan(value: string): boolean {
  const text = (value || "").trim();
  return /^(?:bitcoin|ethereum|litecoin|payto|venmo|paypal):/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains a mail URI or standalone email address.
export function isEmailScan(value: string): boolean {
  const text = (value || "").trim();
  return /^mailto:/i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload explicitly contains a phone URI.
export function isPhoneScan(value: string): boolean {
  const text = (value || "").trim();
  return /^tel:\+?[0-9]/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload is an HTTP(S), www, or bare-domain web destination.
export function isUrlScan(value: string): boolean {
  const text = (value || "").trim();
  return isHttpUrl(text) || isBareWebUrl(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload is a common numeric product barcode length.
export function isProductScan(value: string): boolean {
  const text = (value || "").trim();
  const productBarcodeLengths = new Set([8, 12, 13, 14, 18]);
  return /^[0-9]+$/.test(text) && productBarcodeLengths.has(text.length);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload uses a custom URI scheme with an explicit destination.
export function isDeepLinkScan(value: string): boolean {
  const text = (value || "").trim();
  return /^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains any non-empty unmatched text.
export function isTextScan(value: string): boolean {
  return Boolean((value || "").trim());
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload uses an otherwise unsupported URI or structured-data scheme.
export function isCustomScan(value: string): boolean {
  const text = (value || "").trim();
  const lowerText = text.toLowerCase();
  return Boolean(text) && (/^[a-z][a-z0-9+.-]*:/i.test(text) || lowerText.includes("begin:"));
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the value starts with an HTTP or HTTPS protocol.
function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
};//func ends

// Returns whether the value resembles a web domain that can safely receive an HTTPS prefix.
function isBareWebUrl(value: string): boolean {
  if (!value || /\s/.test(value)) return false;

  const destinationStart = value.search(/[/?#]/);
  const authority = destinationStart >= 0 ? value.slice(0, destinationStart) : value;
  const portSeparator = authority.lastIndexOf(":");
  const hasPort = portSeparator >= 0;
  const hostname = hasPort ? authority.slice(0, portSeparator) : authority;
  const port = hasPort ? authority.slice(portSeparator + 1) : null;

  if (port !== null && !/^\d+$/.test(port)) return false;

  const labels = hostname.split(".");
  if (labels.length < 2 || !/^[a-z]{2,}$/i.test(labels.at(-1) || "")) return false;

  return labels.every(isValidHostnameLabel);
};//func ends

// Validates one hostname label without nested regex repetition or backtracking.
function isValidHostnameLabel(label: string): boolean {
  if (!label || label.startsWith("-") || label.endsWith("-")) return false;
  return /^[a-z0-9-]+$/i.test(label);
};//func ends

/* ---------------------- BREAK ---------------------- */
