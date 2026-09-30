import { getInit as calendarEventInit } from "./CalendarEvent";
import { getInit as contactCardInit } from "./ContactCard";
import { getInit as customSchemeInit } from "./CustomScheme";
import { getInit as deepLinkInit } from "./DeepLink";
import { getInit as emailAddressInit } from "./EmailAddress";
import { getInit as fileInit } from "./File";
import { getInit as genericPaymentInit } from "./GenericPayment";
import { getInit as geoLocationInit } from "./GeoLocation";
import { getInit as otpAuthInit } from "./OtpAuth";
import { getInit as phoneNumberInit } from "./PhoneNumber";
import { getInit as plainTextInit } from "./PlainText";
import { getInit as productBarcodeInit } from "./ProductBarcode";
import { getInit as smsMessageInit } from "./SmsMessage";
import { getInit as upiPaymentInit } from "./UpiPayment";
import { getInit as webUrlInit } from "./WebUrl";
import { getInit as wifiNetworkInit } from "./WifiNetwork";
import type { ScanTypeInit } from "./types";

/* ------------------ BREAK ------------------ */

const scanTypeInitializers: ScanTypeInit[] = [
  calendarEventInit,
  contactCardInit,
  customSchemeInit,
  deepLinkInit,
  emailAddressInit,
  fileInit,
  genericPaymentInit,
  geoLocationInit,
  otpAuthInit,
  phoneNumberInit,
  plainTextInit,
  productBarcodeInit,
  { ...productBarcodeInit, label: "Barcode", type: "barcode" },
  smsMessageInit,
  upiPaymentInit,
  webUrlInit,
  wifiNetworkInit
];

const scanTypeInitializersByType = new Map(
  scanTypeInitializers.map((initializer) => [initializer.type, initializer])
);

/* ------------------ BREAK ------------------ */

// Returns the label and icon owned by a scan identifier, with a safe custom fallback.
export function getScanTypeInit(type: string | null): ScanTypeInit {
  return scanTypeInitializersByType.get(normalizeScanType(type)) || customSchemeInit;
};//export ends

// Maps legacy database aliases to the current scan type identifiers.
export function normalizeScanType(type: string | null): string {
  if (type === "vcard") return "contact";
  if (type === "website") return "url";
  if (type === "plain_text") return "text";
  return type || "custom";
};//export ends
