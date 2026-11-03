import { Directory, File, Paths } from "expo-file-system";

import { installSettings, scansSettings, userTokenSettings } from "@/settings";
import { disconnectUserAppInstall, insertAppInstall } from "@/utils/auth/AppInstall";
import {
  getUserTokens,
  isTokenExpired,
  refreshTokensSilently,
  removeUserTokens,
  pauseTokenRefresh,
  resumeTokenRefresh,
  setUserTokens
} from "@/utils/auth/AuthTokens";
import { pauseQrCardImageRequests, resumeQrCardImageRequests } from "@/helpers/digital_cards/files/qrCardFiles";
import { initDigitalCardsTable } from "@/helpers/digital_cards/db/init";
import { initQrCodes } from "@/helpers/qrcodes/db/initQrCodes";
import { initScansTable } from "@/helpers/scans/db/init";
import { sqliteDB } from "@/utils/sqlite/db";
import type { UserType } from "@/utils/auth/UserTypes";
import { requestAppUser } from "@/utils/auth/requestAppUser";
import { getData, removeData, setData } from "@/utils/general/Storage";

/* ------------------ BREAK ------------------ */

type GetUserOptions = {
  errorOnFail?: boolean;
  signal?: AbortSignal;
  allowedRoles?: Array<"user">;
  activeSpaceUid?: string;
};

type AddUserDataInput = {
  userData?: UserType | null;
  accessToken: string;
  refreshToken: string;
};

type LogoutOptions = {
  installationConfirmed?: boolean;
  onInstallationConfirmed?: () => void;
};

/* ------------------ BREAK ------------------ */

// Fetches the authenticated UnoQR user and persists refreshed tokens returned in headers.
export async function getUser({
  errorOnFail = true,
  signal
}: GetUserOptions = {}): Promise<UserType | null> {
  try {
    let { accessToken, refreshToken } = await getUserTokens();
    if (!refreshToken) return null;
    if (!accessToken || isTokenExpired(accessToken)) {
      const result = await refreshTokensSilently();
      if (result === "failed" || result === "missing") throw new Error("Unable to refresh the authenticated app session.");
      const refreshedUser = await getData({ key: userTokenSettings.storageTokens.userData.name }) as UserType | null;
      if (refreshedUser?.subscription?.plan) return refreshedUser;
      ({ accessToken, refreshToken } = await getUserTokens());
      if (!refreshToken) return null;
    };//if ends
    const result = await requestAppUser({ accessToken, refreshToken, signal });
    //Default Return
    return result.user;
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error && error.statusCode === 401) await clearStoredUserSession();
    if (errorOnFail) throw error;
    return null;
  };//try-catch ends
};//export ends

/* ------------------ BREAK ------------------ */

// Stores a completed session and prepares its downloads to run after navigation.
export async function addUserData({
  accessToken,
  refreshToken
}: AddUserDataInput): Promise<UserType> {
  // Begin every login without another account's local rows, tokens or installation link.
  await resetLocalUserSession();
  const { initializePostLoginSync } = await import("@/utils/auth/PostLoginSync");
  await initializePostLoginSync();
  await setUserTokens({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  // Login-provider metadata does not contain the authoritative subscription.
  const user = await getUser();
  if (!user) throw new Error("Authenticated user data was not returned.");

  const install = await insertAppInstall();
  if (!install?.id) throw new Error("Unable to register this app installation. Please try again.");

  return user;
};//export ends

/* ------------------ BREAK ------------------ */

// Returns a stored user after refreshing an expired session only when tokens exist.
export async function getStorageUser(): Promise<UserType | null> {
  const { accessToken, refreshToken } = await getUserTokens();
  if (!refreshToken) return null;

  if (!accessToken || isTokenExpired(accessToken)) {
    const refreshResult = await refreshTokensSilently();
    if (refreshResult === "failed") return null;
  };//if ends

  const storedUser = await getData({
    key: userTokenSettings.storageTokens.userData.name
  });
  if (storedUser && typeof storedUser === "object" && (storedUser as UserType).subscription?.plan) return storedUser as UserType;

  return getUser({ errorOnFail: false });
};//export ends

/* ------------------ BREAK ------------------ */

// Confirms installation logout and clears the account, propagating failures to the logout page.
export async function processUserLogout({ installationConfirmed = false, onInstallationConfirmed }: LogoutOptions = {}): Promise<void> {
  await resetLocalUserSession(!installationConfirmed, onInstallationConfirmed);
};//export ends

// Resets account tables while retaining their schema and the shared SQLite connection.
async function resetLocalUserSession(logoutInstall = false, onInstallationConfirmed?: () => void): Promise<void> {
  // Load reset controls after session modules initialize to avoid circular startup imports.
  const [{ pauseScanSync, resumeScanSync }, { pauseQrCodeSync, resumeQrCodeSync }, { pauseDigitalCardRequests, resumeDigitalCardRequests }, { pauseDigitalCardSync, resumeDigitalCardSync }, { pausePostLoginSync, resumePostLoginSync, resetPostLoginSync }] = await Promise.all([
    import("@/helpers/scans/scanSync"),
    import("@/helpers/qrcodes/QrSync"),
    import("@/helpers/digital_cards/api/cards"),
    import("@/helpers/digital_cards/utils/SyncDigitalCards"),
    import("@/utils/auth/PostLoginSync")
  ]);
  pauseQrCardImageRequests();
  await pauseTokenRefresh();
  try {
    // Finish old requests before new credentials can be used by background synchronization.
    await Promise.all([pausePostLoginSync(), pauseQrCodeSync(), pauseScanSync(), pauseDigitalCardRequests(), pauseDigitalCardSync()]);
    if (logoutInstall) {
      await disconnectUserAppInstall();
      onInstallationConfirmed?.();
    };//if ends
    await removeData({ key: scansSettings.lastCheckedAtKey });
    await resetPostLoginSync();
    clearLocalAccountFiles();
    // Installation proof belongs to the device, so account changes retain its credentials.
    const install = await getData({ key: installSettings.storageKeys.installInfo.name });
    if (install && typeof install === "object") {
      await setData({ key: installSettings.storageKeys.installInfo.name, value: { ...install, user_id: null } });
    };//if ends
    const connection = sqliteDB;
    if (!connection) {
      await clearStoredUserSession();
      return;
    };//if ends
    await initScansTable();
    await initQrCodes();
    await initDigitalCardsTable();
    // Clear all account records together so the next login starts with empty tables.
    connection.withTransactionSync(() => {
      connection.execSync("DELETE FROM scans; DELETE FROM static_qrcodes; DELETE FROM static_qrcode_deletions; DELETE FROM digital_card_photos; DELETE FROM digital_cards;");
    });
    // Retain authentication until cleanup succeeds so the logout page can retry failures.
    await clearStoredUserSession();
  } finally {
    resumeQrCardImageRequests();
    resumeDigitalCardRequests();
    resumeDigitalCardSync();
    resumeQrCodeSync();
    resumeScanSync();
    resumePostLoginSync();
    resumeTokenRefresh();
  };//try-catch ends
};//func ends

// Removes app-owned QR logos and temporary QR exports without touching installation credentials.
function clearLocalAccountFiles(): void {
  const cardDirectory = new Directory(Paths.cache, "digital-card-qrcards");
  if (cardDirectory.exists) cardDirectory.delete();
  for (const root of [Paths.document, Paths.cache]) {
    const qrCardsDirectory = new Directory(root, "qrcards");
    if (qrCardsDirectory.exists) qrCardsDirectory.delete();
  };//for ends
  const qrDirectory = new Directory(Paths.document, "qrcodes");
  if (qrDirectory.exists) qrDirectory.delete();
  for (const name of ["unoqr-code.svg", "unoqr-code.pdf"]) {
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
  };//for ends
};//func ends

// Removes the cached user together with all access and refresh token variants.
async function clearStoredUserSession(): Promise<void> {
  await removeUserTokens();
};//func ends
