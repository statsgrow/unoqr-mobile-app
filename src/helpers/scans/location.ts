import * as Location from "expo-location";
import { eq } from "drizzle-orm";

import { db } from "@/utils/sqlite/db";

import { initScansTable, type ScanLocation, scansTable } from "./db/init";

/* ------------------ BREAK ------------------ */

const recentLocationMaximumAge = 5 * 60 * 1_000;
const recentLocationMaximumAccuracy = 1_000;

/* ------------------ BREAK ------------------ */

// Collects a consented foreground location and saves it to the matching local scan row.
export async function collectAndStoreScanLocation(scanId: string): Promise<ScanLocation | null> {
  try {
    const permission = await getForegroundLocationPermission();

    if (!permission) return null;

    const position = await getFastScanPosition();
    const { latitude, longitude } = position.coords;
    const address = await getReverseGeocodedAddress(latitude, longitude);
    const scanLocation: ScanLocation = {
      latitude,
      longitude,
      city: address?.city ?? null,
      state: address?.region ?? null,
      country: address?.country ?? null,
      pincode: address?.postalCode ?? null
    };

    await storeScanLocation(scanId, scanLocation);
    return scanLocation;
  } catch (error: unknown) {
    console.warn("Unable to collect scan location:", error);
    return null;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

// Reuses an existing foreground grant or asks the user for one when needed.
async function getForegroundLocationPermission(): Promise<boolean> {
  const existingPermission = await Location.getForegroundPermissionsAsync();

  if (existingPermission.granted) return true;
  if (!existingPermission.canAskAgain) return false;

  const requestedPermission = await Location.requestForegroundPermissionsAsync();
  return requestedPermission.granted;
};//func ends

// Uses a recent cached fix when possible and otherwise requests balanced current accuracy.
async function getFastScanPosition(): Promise<Location.LocationObject> {
  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: recentLocationMaximumAge,
    requiredAccuracy: recentLocationMaximumAccuracy
  });

  if (lastKnownPosition) return lastKnownPosition;

  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
};//func ends

// Reverse-geocodes coordinates while allowing coordinate-only results on lookup failure.
async function getReverseGeocodedAddress(
  latitude: number,
  longitude: number
): Promise<Location.LocationGeocodedAddress | null> {
  try {
    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
    return addresses[0] ?? null;
  } catch (error: unknown) {
    console.warn("Unable to reverse-geocode scan location:", error);
    return null;
  };//try-catch ends
};//func ends

// Writes the structured location to SQLite without changing the scan synchronization state.
async function storeScanLocation(scanId: string, location: ScanLocation): Promise<void> {
  if (!db) return;

  await initScansTable();
  await db
    .update(scansTable)
    .set({ location, updated_at: new Date().toISOString() })
    .where(eq(scansTable.id, scanId))
    .run();
};//func ends

/* ------------------ BREAK ------------------ */
