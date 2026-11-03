import { jwtDecode } from "jwt-decode";

import { userTokenSettings } from "@/settings";
import { clearAuthUser } from "@/utils/auth/AuthUserStorage";
import { requestAppUser } from "@/utils/auth/requestAppUser";
import { getData, removeData, setData } from "@/utils/general/Storage";

/* ------------------ BREAK ------------------ */

export type StoredUserTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

export type SetUserTokensInput = {
  access_token: string;
  refresh_token: string;
};

type RefreshTokenResult = "missing" | "valid" | "refreshed" | "failed";

/* ------------------ BREAK ------------------ */

let tokenCheckIntervalId: ReturnType<typeof setInterval> | null = null;
let isSessionResetting = false;
let tokenRefreshPromise: Promise<RefreshTokenResult> | null = null;
const tokenRefreshTimeoutMilliseconds = 5_000;

/* ------------------ BREAK ------------------ */

// Reports whether a JWT is missing, invalid, or within thirty seconds of expiry.
export function isTokenExpired(token?: string | null): boolean {
  if (!token) return true;

  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return !exp || exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  };//try-catch ends
};//export ends

/* ------------------ BREAK ------------------ */

// Loads UnoQR tokens and migrates the earlier uq-prefixed storage keys when found.
export async function getUserTokens(): Promise<StoredUserTokens> {
  const accessToken = await getStoredToken(
    userTokenSettings.storageTokens.accessToken.name,
    userTokenSettings.storageTokens.accessToken.legacyName
  );
  const refreshToken = await getStoredToken(
    userTokenSettings.storageTokens.refreshToken.name,
    userTokenSettings.storageTokens.refreshToken.legacyName
  );

  return { accessToken, refreshToken };
};//export ends

/* ------------------ BREAK ------------------ */

// Refreshes an existing expired session while allowing anonymous users to continue untouched.
export function refreshTokensSilently(): Promise<RefreshTokenResult> {
  if (isSessionResetting) return Promise.resolve("missing");
  if (tokenRefreshPromise) return tokenRefreshPromise;

  tokenRefreshPromise = performTokenRefresh().finally(() => {
    tokenRefreshPromise = null;
  });

  return tokenRefreshPromise;
};//export ends

/* ------------------ BREAK ------------------ */

// Pauses new token checks and lets an existing refresh finish before session deletion.
export async function pauseTokenRefresh(): Promise<void> {
  isSessionResetting = true;
  await tokenRefreshPromise;
};//export ends

// Restores periodic token checks after the local session has been reset.
export function resumeTokenRefresh(): void {
  isSessionResetting = false;
};//export ends

// Refreshes expired credentials and caches the complete RPC-backed app user in one request.
async function performTokenRefresh(): Promise<RefreshTokenResult> {
  const { accessToken, refreshToken } = await getUserTokens();
  if (!refreshToken) return "missing";
  if (accessToken && !isTokenExpired(accessToken)) return "valid";
  const abortController = new AbortController();
  const refreshTimeout = setTimeout(() => abortController.abort(), tokenRefreshTimeoutMilliseconds);
  try {
    const result = await requestAppUser({ accessToken, refreshToken, signal: abortController.signal });
    //Default Return
    return result.refreshed ? "refreshed" : "valid";
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error && error.statusCode === 401) await removeUserTokens();
    console.warn("Unable to refresh the stored UnoQR session:", error);
    return "failed";
  } finally {
    clearTimeout(refreshTimeout);
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

// Starts periodic background token checks after the initial session check.
export function triggerTokenChecking(): () => void {
  if (tokenCheckIntervalId) clearInterval(tokenCheckIntervalId);

  tokenCheckIntervalId = setInterval(() => {
    void refreshTokensSilently();
  }, 60_000);

  return () => {
    if (!tokenCheckIntervalId) return;
    clearInterval(tokenCheckIntervalId);
    tokenCheckIntervalId = null;
  };
};//export ends

/* ------------------ BREAK ------------------ */

// Stores a complete authenticated UnoQR access and refresh token pair.
export async function setUserTokens({
  access_token,
  refresh_token
}: SetUserTokensInput): Promise<void> {
  if (!access_token) throw new Error("Access token is missing.");
  if (!refresh_token) throw new Error("Refresh token is missing.");

  await Promise.all([
    setData({
      key: userTokenSettings.storageTokens.accessToken.name,
      value: access_token
    }),
    setData({
      key: userTokenSettings.storageTokens.refreshToken.name,
      value: refresh_token
    })
  ]);
};//export ends

/* ------------------ BREAK ------------------ */

// Removes all UnoQR session tokens, including the earlier uq-prefixed keys.
export async function removeUserTokens(): Promise<void> {
  await Promise.all([
    removeData({ key: userTokenSettings.storageTokens.accessToken.name }),
    removeData({ key: userTokenSettings.storageTokens.refreshToken.name }),
    removeData({ key: userTokenSettings.storageTokens.accessToken.legacyName }),
    removeData({ key: userTokenSettings.storageTokens.refreshToken.legacyName }),
    clearAuthUser()
  ]);
};//export ends

// Reads a current token or migrates its legacy storage value into the new key.
async function getStoredToken(currentKey: string, legacyKey: string): Promise<string | null> {
  const currentValue = await getData({ key: currentKey });
  if (typeof currentValue === "string" && currentValue) return currentValue;

  const legacyValue = await getData({ key: legacyKey });
  if (typeof legacyValue !== "string" || !legacyValue) return null;

  await setData({ key: currentKey, value: legacyValue });
  await removeData({ key: legacyKey });
  return legacyValue;
};//func ends
