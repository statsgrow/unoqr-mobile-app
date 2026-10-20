import { AppState } from "react-native";
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import { Settings } from "react-native-fbsdk-next";

/* ------------------ BREAK ------------------ */

let initialized = false;
let permissionCheck: Promise<void> | null = null;

/* ------------------ BREAK ------------------ */

// Starts iOS install/session measurement and rechecks tracking consent on foreground.
export function startMetaAppEvents(): () => void {
  if (AppState.currentState === "active") refreshMetaAppEvents();
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") refreshMetaAppEvents();
  });
  return () => subscription.remove();
};//export ends

/* ------------------ BREAK ------------------ */

// Serializes permission checks so the tracking dialog cannot open twice.
function refreshMetaAppEvents(): void {
  if (permissionCheck) return;
  permissionCheck = configureMetaAppEvents().catch((error: unknown) => {
    console.warn("Unable to initialize Meta app events:", error);
  }).finally(() => {
    permissionCheck = null;
  });
};//func ends

// Keeps install/session measurement enabled while advertising identifiers follow iOS consent.
async function configureMetaAppEvents(): Promise<void> {
  let permission = await getTrackingPermissionsAsync();
  if (permission.status === "undetermined" && permission.canAskAgain) {
    permission = await requestTrackingPermissionsAsync();
  };//if ends
  const allowed = permission.status === "granted";
  await Settings.setAdvertiserTrackingEnabled(allowed);
  Settings.setAdvertiserIDCollectionEnabled(allowed);
  Settings.setAutoLogAppEventsEnabled(true);
  if (!initialized) {
    Settings.initializeSDK();
    initialized = true;
  };//if ends
};//func ends
