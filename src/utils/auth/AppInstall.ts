import axios from "axios";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { getLocales } from "expo-localization";
import { Platform } from "react-native";

import { apiSettings, installSettings } from "@/settings";
import { getInstallAccessToken, getInstallCredentials, saveInstallRegistration } from "@/utils/auth/AppInstallTokens";
import { Axios } from "@/utils/general/Axios";
import { getExpoPushToken } from "@/utils/general/PushNotifications";
import { getData, setData } from "@/utils/general/Storage";
import { Toast } from "@/utils/general/Toast";
import { isUUID } from "@/utils/general/Uid";

/* ------------------ BREAK ------------------ */

export type AppInstallInfo = {
  id: string;
  user_id?: string | null;
  status?: "pending" | "active" | "logged_in" | "logged_out";
  updated_at?: string;
  last_checked_at?: string;
  expo_token?: string | null;
  expo_token_updated_at?: string | null;
  app_info?: { build?: string | null; version?: string | null; installation_id?: string | null } | null;
  integrity_status?: "pending" | "checked" | "failed";
  integrity_checked_at?: string | null;
  integrity_error?: { message?: string } | null;
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
  expo_token?: string | null;
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
    const response = await Axios.get<ApiResponse<AppInstallInfo>>(apiUrl.href);
    return response.data?.data || null;
  } catch (error: unknown) {
    console.error("Error fetching app install info:", error);
    return null;
  };//try-catch ends
};//export ends

/* ------------------ BREAK ------------------ */

let registrationPromise: Promise<AppInstallInfo | null> | null = null;
let metadataRefreshPromise: Promise<void> | null = null;

// Shares installation registration across concurrent startup requests.
export function insertAppInstall(): Promise<AppInstallInfo | null> {
  if (!registrationPromise) registrationPromise = registerAppInstall().finally(() => { registrationPromise = null; });
  return registrationPromise;
};//export ends

// Registers this app installation anonymously once and caches the returned UUID.
async function registerAppInstall(): Promise<AppInstallInfo | null> {
  try {
    const existingInstallInfo = await getStoredAppInstall();
    const credentials = await getInstallCredentials();
    if (existingInstallInfo && credentials?.install_id === existingInstallInfo.id) {
      startAppIntegrityObservation();
      void refreshAppInstallMetadata();
      return existingInstallInfo;
    };//if ends

    const deviceDetails = await getDeviceDetails();

    if (Platform.OS === "android" && deviceDetails.is_real_device) {
      // Keep device registration available when notifications are denied or unavailable.
      const expoPushTokenInfo = await getExpoPushToken().catch(() => null);
      deviceDetails.expo_token = expoPushTokenInfo?.token ?? null;
      deviceDetails.expo_token_updated_at = expoPushTokenInfo?.updated_at ?? null;
    };//if ends

    const apiUrl = apiSettings.getApiUrl({ path: "/app/install" });
    const response = await axios.post<ApiResponse<AppInstallInfo>>(apiUrl.href, deviceDetails);
    const appInstallData = response.data?.data || null;

    if (appInstallData) {
      const registrationToken = appInstallData.registration_token;
      if (typeof registrationToken === "string") await saveInstallRegistration(appInstallData.id, registrationToken);
      delete appInstallData.registration_token;
      await setData({
        key: installSettings.storageKeys.installInfo.name,
        value: appInstallData
      });
      startAppIntegrityObservation();
      void refreshAppInstallMetadata();
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

// Starts silent initial verification or UnoQR-only renewal without blocking startup.
function startAppIntegrityObservation(): void {
  void getInstallAccessToken().catch(() => null);
};//func ends

/* ------------------ BREAK ------------------ */

// Links the registered installation to the authenticated user before history restoration.
export async function connectUserAppInstall({ signal }: { signal?: AbortSignal } = {}): Promise<AppInstallInfo> {
  const existingInstallInfo = await getStoredAppInstall();
  if (!existingInstallInfo?.id || !isUUID(existingInstallInfo.id)) {
    throw new Error("A valid app install UUID is required.");
  };//if ends

  const headers = await getInstallLinkHeaders(existingInstallInfo.id);
  if (signal?.aborted) throw new Error("Installation linking was cancelled.");

  const apiUrl = apiSettings.getApiUrl({ path: "/app/install/connectuser" });
  const response = await Axios.put<ApiResponse<AppInstallInfo>>(apiUrl.href, {
    install_id: existingInstallInfo.id
  }, { headers, signal, timeout: 15_000 });
  const connectedInstall = response.data?.data;
  if (!connectedInstall) throw new Error("The API did not confirm the installation link.");
  await setData({ key: installSettings.storageKeys.installInfo.name, value: { ...existingInstallInfo, ...connectedInstall } });
  return connectedInstall;
};//export ends

/* ------------------ BREAK ------------------ */

// Shares silent metadata checks so startup and foreground events cannot send duplicate updates.
export function refreshAppInstallMetadata(): Promise<void> {
  metadataRefreshPromise ??= checkAppInstallMetadata().catch(() => undefined).finally(() => { metadataRefreshPromise = null; });
  return metadataRefreshPromise;
};//export ends

// Checks push tokens every 24 hours and saves changed token, version or build on the existing row.
async function checkAppInstallMetadata(): Promise<void> {
  if (Platform.OS === "web") return;
  const install = await getStoredAppInstall();
  if (!install?.id) return;
  const now = new Date().toISOString();
  const lastCheck = Date.parse(install.last_checked_at || "");
  const pushCheckDue = !Number.isFinite(lastCheck) || Date.now() - lastCheck >= 24 * 60 * 60 * 1000;
  const build = Application.nativeBuildVersion;
  const version = Application.nativeApplicationVersion;
  const changes: { app_info?: AppInstallInfo["app_info"]; expo_token?: string; } = {};
  if (!install.updated_at || install.app_info?.build !== build || install.app_info?.version !== version) {
    changes.app_info = { ...install.app_info, build, version };
  };//if ends
  const pushInfo = pushCheckDue ? await getExpoPushToken({ requestPermission: false }) : null;
  if (pushInfo?.token && pushInfo.token !== install.expo_token) changes.expo_token = pushInfo.token;
  let updatedInstall = install;
  if (Object.keys(changes).length) {
    const headers = await getInstallLinkHeaders(install.id);
    const response = await axios.patch<ApiResponse<AppInstallInfo>>(
      apiSettings.getApiUrl({ path: "/app/install" }).href,
      { id: install.id, ...changes }, { headers, timeout: 15_000 }
    );
    if (response.data?.data?.id !== install.id || !response.data.data.updated_at) throw new Error("Installation metadata update was not confirmed.");
    updatedInstall = response.data.data;
  };//if ends
  if (pushCheckDue || updatedInstall !== install) {
    const current = await getStoredAppInstall();
    if (current?.id !== install.id) return;
    await setData({ key: installSettings.storageKeys.installInfo.name, value: {
      ...current, ...(updatedInstall !== install ? updatedInstall : {}),
      ...(pushCheckDue ? { last_checked_at: now } : {})
    } });
  };//if ends
};//func ends

/* ------------------ BREAK ------------------ */

// Proves installation ownership for account linking without requiring a new integrity verdict.
export async function getInstallLinkHeaders(installId: string): Promise<Record<string, string>> {
  const credentials = await getInstallCredentials();
  if (credentials?.install_id !== installId) throw new Error("Installation credentials do not match this device.");
  if (credentials.registration_token) return { "x-install-registration": credentials.registration_token };
  const token = await getInstallAccessToken(false, true);
  if (!token) throw new Error("Installation credentials could not be renewed. Please try again.");
  return { "x-install-token": token };
};//export ends

/* ------------------ BREAK ------------------ */

// Marks installation logout and verifies the returned status without caching the response.
export async function disconnectUserAppInstall(): Promise<void> {
  const install = await getStoredAppInstall();
  if (!install?.id || !isUUID(install.id)) throw new Error("A valid app install UUID is required.");
  const credentials = await getInstallCredentials();
  const headers: Record<string, string> = {};
  if (credentials?.install_id === install.id) {
    if (credentials.registration_token) {
      headers["x-install-registration"] = credentials.registration_token;
    } else if (credentials.refresh_token) {
      const token = await getInstallAccessToken();
      if (token) headers["x-install-token"] = token;
    };//if ends
  };//if ends
  const apiUrl = apiSettings.getApiUrl({ path: "/app/install" });
  const response = await Axios.put<ApiResponse<AppInstallInfo>>(apiUrl.href, {
    id: install.id,
    status: "logged_out"
  }, { headers, timeout: 15_000 });
  const updatedInstall = response.data?.data;
  if (updatedInstall?.status !== "logged_out") throw new Error("The API did not confirm installation logout.");
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
