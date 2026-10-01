import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

/* ------------------ BREAK ------------------ */

type ExpoPushTokenInfo = {
  token: string | null;
  updated_at: string | null;
};

/* ------------------ BREAK ------------------ */

// Requests an Expo push token only in native builds that support remote notifications.
export async function getExpoPushToken(): Promise<ExpoPushTokenInfo | null> {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (Platform.OS === "web" || !Device.isDevice || isExpoGo) {
    return null;
  };//if ends

  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX
    });
  };//if ends

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
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
