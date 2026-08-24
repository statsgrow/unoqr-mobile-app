import { getInit as calendarEventInit } from "./CalendarEvent";
import { getInit as contactCardInit } from "./ContactCard";
import { getInit as customSchemeInit } from "./CustomScheme";
import { getInit as emailAddressInit } from "./EmailAddress";
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
  emailAddressInit,
  genericPaymentInit,
  geoLocationInit,
  otpAuthInit,
  phoneNumberInit,
  plainTextInit,
  productBarcodeInit,
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
  return scanTypeInitializersByType.get(type || "") || customSchemeInit;
};//export ends

