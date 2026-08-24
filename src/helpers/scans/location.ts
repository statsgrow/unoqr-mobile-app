import * as Location from "expo-location";
import { eq } from "drizzle-orm";
import { Platform } from "react-native";

import { db } from "@/utils/sqlite/db";

import { initScansTable, type ScanLocation, scansTable } from "./db/init";

/* ------------------ BREAK ------------------ */

const recentLocationMaximumAge = 5 * 60 * 1_000;
const recentLocationMaximumAccuracy = 1_000;
let preparedLocationPromise: Promise<ScanLocation | null> | null = null;

/* ------------------ BREAK ------------------ */

// Starts permission and coordinate collection before a QR value is detected.
export function prepareScanLocation(): Promise<ScanLocation | null> {
  preparedLocationPromise ??= collectScanLocation();
  return preparedLocationPromise;
};//export ends

// Reuses the prepared coordinates and saves them to the matching local scan row.
export async function collectAndStoreScanLocation(scanId: string): Promise<ScanLocation | null> {
  const locationPromise = preparedLocationPromise ?? prepareScanLocation();
  preparedLocationPromise = null;
  const scanLocation = await locationPromise;

  if (!scanLocation) return null;

  try {
    await storeScanLocation(scanId, scanLocation);
    return scanLocation;
  } catch (error: unknown) {
    console.warn("Unable to store scan location:", error);
    return null;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

// Collects consented device coordinates without waiting for reverse geocoding.
async function collectScanLocation(): Promise<ScanLocation | null> {
  try {
    const permission = await getForegroundLocationPermission();

    if (!permission) {
      console.warn("Scan location permission was not granted.");
      return null;
    };//if ends

    const locationServicesEnabled = await Location.hasServicesEnabledAsync();

    if (!locationServicesEnabled) {
      console.warn("Device location services are disabled.");
      return null;
    };//if ends

    const position = await getFastScanPosition();
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      city: null,
      state: null,
      country: null,
      pincode: null
    };
  } catch (error: unknown) {
    console.warn("Unable to collect scan coordinates:", error);
    return null;
  };//try-catch ends
};//func ends

// Reuses an existing foreground grant or asks the user for one when needed.
async function getForegroundLocationPermission(): Promise<boolean> {
  const existingPermission = await Location.getForegroundPermissionsAsync();

  if (existingPermission.granted) return true;
  if (!existingPermission.canAskAgain) return false;

  const requestedPermission = await Location.requestForegroundPermissionsAsync();
  return requestedPermission.granted;
};//func ends

// Uses cached coordinates first and enables Android network location before requesting a fresh fix.
async function getFastScanPosition(): Promise<Location.LocationObject> {
  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: recentLocationMaximumAge,
    requiredAccuracy: recentLocationMaximumAccuracy
  });

  if (lastKnownPosition) return lastKnownPosition;

  if (Platform.OS === "android") {
    const providerStatus = await Location.getProviderStatusAsync();

    if (!providerStatus.networkAvailable) {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (error: unknown) {
        console.warn("Android network location was not enabled:", error);
      };//try-catch ends
    };//if ends
  };//if ends

  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
      mayShowUserSettingsDialog: true
    });
  } catch (error: unknown) {
    const unrestrictedLastKnownPosition = await Location.getLastKnownPositionAsync();

    if (unrestrictedLastKnownPosition) return unrestrictedLastKnownPosition;

    throw error;
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
