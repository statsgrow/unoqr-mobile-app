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
  | "payment"
  | "product"
  | "auth"
  | "custom";

/* ---------------------- BREAK ---------------------- */

// Identifies the supported QR payload category after trimming its value.
export function identifyScanType(value: string): ScanType {
  if (isContactScan(value)) return "contact";
  if (isCalendarScan(value)) return "calendar";
  if (isAuthScan(value)) return "auth";
  if (isWifiScan(value)) return "wifi";
  if (isSmsScan(value)) return "sms";
  if (isLocationScan(value)) return "location";
  if (isPaymentScan(value)) return "payment";
  if (isEmailScan(value)) return "email";
  if (isUrlScan(value)) return "url";
  if (isProductScan(value)) return "product";
  if (isPhoneScan(value)) return "phone";
  if (isCustomScan(value)) return "custom";
  if (isTextScan(value)) return "text";

  //Default return
  return "custom";
};//export ends

// Adds HTTPS to recognizable bare web domains while preserving non-web QR payloads.
export function normalizeScannedValue(value: string): string {
  const text = value.trim();

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

// Returns whether the payload uses a recognized payment URI scheme.
export function isPaymentScan(value: string): boolean {
  const text = (value || "").trim();
  return /^(?:bitcoin|ethereum|litecoin|upi|payto|venmo|paypal):/i.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains a mail URI or standalone email address.
export function isEmailScan(value: string): boolean {
  const text = (value || "").trim();
  return /^mailto:/i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
};//export ends

/* ---------------------- BREAK ---------------------- */

// Returns whether the payload contains a phone URI or phone-shaped value.
export function isPhoneScan(value: string): boolean {
  const text = (value || "").trim();
  return /^tel:/i.test(text) || /^\+?[0-9][0-9\s().-]{5,}$/.test(text);
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
  return /^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s]*)?$/i.test(value);
};//func ends

/* ---------------------- BREAK ---------------------- */
