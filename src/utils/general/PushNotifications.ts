import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { router } from "expo-router";
import type { NotificationResponse } from "expo-notifications";
import { Platform } from "react-native";

/* ------------------ BREAK ------------------ */

type ExpoPushTokenInfo = {
  token: string | null;
  updated_at: string | null;
};

/* ------------------ BREAK ------------------ */

// Requests an Expo push token only in native builds that support remote notifications.
export async function getExpoPushToken({ requestPermission = true }: { requestPermission?: boolean } = {}): Promise<ExpoPushTokenInfo | null> {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (Platform.OS === "web" || !Device.isDevice || isExpoGo) {
    return null;
  };//if ends

  // Metro's synchronous module loader preserves the SDK's re-exported native methods.
  const Notifications = require("expo-notifications") as typeof import("expo-notifications");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX
    });
  };//if ends

  const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    if (!requestPermission || !canAskAgain) return null;
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  };//if ends

  if (finalStatus !== "granted") {
    return null;
  };//if ends

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;

  if (!projectId) {
    return null;
  };//if ends

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse.data ?? null;

  //Default Return
  return {
    token,
    updated_at: token ? new Date().toISOString() : null
  };
};//export ends

/* ------------------ BREAK ------------------ */

// Opens card previews from notification taps, including the tap that launched a closed app.
export function startNotificationNavigation(): () => void {
  if (Platform.OS === "web" || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return () => undefined;
  let disposed = false;
  let subscription: { remove: () => void } | null = null;
  const handled = new Set<string>();

  try {
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");
    const openNotification = (response: NotificationResponse): void => {
      if (disposed || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const request = response.notification.request;
      const destination = getCardPreviewNotificationRoute(request.content.data);
      if (!destination || handled.has(request.identifier)) return;
      handled.add(request.identifier);
      // Construct the known route from the card UID rather than opening an arbitrary payload URL.
      router.push(destination);
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    void Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
      if (lastResponse) openNotification(lastResponse);
    }).catch((error: unknown) => console.error("Unable to read the launch notification:", error));
  } catch (error: unknown) {
    console.error("Unable to observe notification taps:", error);
  };//try-catch ends

  return () => { disposed = true; subscription?.remove(); };
};//export ends

/* ------------------ BREAK ------------------ */

// Accepts only card-created notifications with a valid public card UID.
export function getCardPreviewNotificationRoute(data: Record<string, unknown> = {}): {
  pathname: "/digital_cards/modify"; params: { uid: string; mode: "preview" };
} | null {
  if (data.type !== "onCardCreated" || typeof data.card_uid !== "string" || !/^[A-Za-z0-9_-]+$/.test(data.card_uid)) return null;
  return { pathname: "/digital_cards/modify", params: { uid: data.card_uid, mode: "preview" } };
};//export ends
