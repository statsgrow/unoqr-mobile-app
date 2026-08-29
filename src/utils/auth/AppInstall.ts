import axios from "axios";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { getLocales } from "expo-localization";
import { Platform } from "react-native";

import { apiSettings, installSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";
import { getExpoPushToken } from "@/utils/general/PushNotifications";
import { getData, setData } from "@/utils/general/Storage";
import { Toast } from "@/utils/general/Toast";
import { isUUID } from "@/utils/general/Uid";

/* ------------------ BREAK ------------------ */

export type AppInstallInfo = {
  id: string;
  user_id?: string | null;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  data?: T | null;
  message?: string;
};

type DeviceDetails = {
  platform: typeof Platform.OS;
  language: string | null | undefined;
  region: string | null | undefined;
  timezone: string;
  is_real_device: boolean;
  installed_at: Date | null;
  device: {
    manufacturer: string | null;
    model: string | null;
    brand: string | null;
    type: Device.DeviceType;
    name: string | null;
    os_name: string | null;
    os_version: string | null;
  };
  app_info: {
    build: string | null;
    version: string | null;
    installation_id: Date | null;
  };
  expo_token?: string;
  expo_token_updated_at?: string | null;
};

/* ------------------ BREAK ------------------ */

// Fetches the current API copy of this locally stored app installation.
export async function getAppInstallInfo(): Promise<AppInstallInfo | null> {
  try {
    const existingInstallInfo = await getStoredAppInstall();
    if (!existingInstallInfo?.id) return null;

    const apiUrl = apiSettings.getApiUrl({
      path: `/app/install?id=${encodeURIComponent(existingInstallInfo.id)}`
    });
    const response = await axios.get<ApiResponse<AppInstallInfo>>(apiUrl.href);
    return response.data?.data || null;
  } catch (error: unknown) {
    console.error("Error fetching app install info:", error);
    return null;
  };//try-catch ends
};//export ends

/* ------------------ BREAK ------------------ */

// Registers this app installation anonymously once and caches the returned UUID.
export async function insertAppInstall(): Promise<AppInstallInfo | null> {
  try {
    const existingInstallInfo = await getStoredAppInstall();
    if (existingInstallInfo) return existingInstallInfo;

    const deviceDetails = await getDeviceDetails();

    if (Platform.OS === "android" && deviceDetails.is_real_device) {
      const expoPushTokenInfo = await getExpoPushToken();
      if (!expoPushTokenInfo?.token) {
        throw new Error("A push notification token is required to register this Android app.");
      };//if ends

      deviceDetails.expo_token = expoPushTokenInfo.token;
      deviceDetails.expo_token_updated_at = expoPushTokenInfo.updated_at;
    };//if ends

    const apiUrl = apiSettings.getApiUrl({ path: "/app/install" });
    const response = await axios.post<ApiResponse<AppInstallInfo>>(apiUrl.href, deviceDetails);
    const appInstallData = response.data?.data || null;

    if (appInstallData) {
      await setData({
        key: installSettings.storageKeys.installInfo.name,
        value: appInstallData
      });
    };//if ends

    return appInstallData;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to register this app install.";
    Toast.error({ message });
    console.error("Error inserting app install:", error);
    return null;
  };//try-catch ends
};//export ends

/* ------------------ BREAK ------------------ */

// Connects the existing install UUID to the authenticated API user.
export async function connectUserAppInstall(): Promise<AppInstallInfo | null> {
  const existingInstallInfo = await getStoredAppInstall();

  //try catch 
  try {
    if (!existingInstallInfo?.id || !isUUID(existingInstallInfo.id)) {
      throw new Error("A valid app install UUID is required.");
    };//if ends

    //get url 
    const apiUrl = apiSettings.getApiUrl({ path: "/app/install/connectuser" });
    //send put request
    const response = await Axios.put<ApiResponse<AppInstallInfo>>(apiUrl.href, {
      install_id: existingInstallInfo.id
    });
    //get connected install info
    const connectedInstall = response.data?.data || null;

    //store connected install info
    if (connectedInstall) {
      await setData({
        key: installSettings.storageKeys.installInfo.name,
        value: connectedInstall
      });
    };//if ends

    //return connected install info
    return connectedInstall;
  } catch (error: any) {
    console.error("Unable to connect the app install to the user:", error);
    //return error
    return null;
  };//try-catch ends
};//export ends

/* ------------------ BREAK ------------------ */

// Collects stable device and app metadata for anonymous install registration.
export async function getDeviceDetails(): Promise<DeviceDetails> {
  const locale = getLocales()[0];
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const installationTime = await Application.getInstallationTimeAsync();

  return {
    platform: Platform.OS,
    language: locale?.languageCode,
    region: locale?.regionCode,
    timezone,
    is_real_device: Device.isDevice,
    installed_at: installationTime,
    device: {
      manufacturer: Device.manufacturer,
      model: Device.modelName,
      brand: Device.brand,
      type: await Device.getDeviceTypeAsync(),
      name: Device.deviceName,
      os_name: Device.osName,
      os_version: Device.osVersion
    },
    app_info: {
      build: Application.nativeBuildVersion,
      version: Application.nativeApplicationVersion,
      installation_id: installationTime
    }
  };
};//export ends

// Reads and validates the locally cached install object.
async function getStoredAppInstall(): Promise<AppInstallInfo | null> {
  const storedInstall = await getData({
    key: installSettings.storageKeys.installInfo.name
  });

  if (!storedInstall || typeof storedInstall !== "object") return null;
  const installId = (storedInstall as { id?: unknown }).id;
  if (typeof installId !== "string") return null;

  return storedInstall as AppInstallInfo;
};//func ends
