import { AppState } from "react-native";
import { Settings } from "react-native-fbsdk-next";

/* ------------------ BREAK ------------------ */

let initialized = false;

/* ------------------ BREAK ------------------ */

// Starts Android's automatic install and app activation measurement once the app is active.
export function startMetaAppEvents(): () => void {
  if (AppState.currentState === "active") initializeMetaAppEvents();
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") initializeMetaAppEvents();
  });
  return () => subscription.remove();
};//export ends

/* ------------------ BREAK ------------------ */

// Initializes Meta once so the SDK owns install reporting and session deduplication.
function initializeMetaAppEvents(): void {
  if (initialized) return;
  try {
    Settings.setAdvertiserIDCollectionEnabled(true);
    Settings.setAutoLogAppEventsEnabled(true);
    Settings.initializeSDK();
    initialized = true;
  } catch (error: unknown) {
    console.warn("Unable to initialize Meta app events:", error);
  };//try-catch ends
};//func ends
