import { jwtDecode } from "jwt-decode";

import { apiSettings, userTokenSettings } from "@/settings";
import type { UserType } from "@/utils/auth/UserTypes";
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

type SupabaseJwtClaims = {
  sub?: string;
  email?: string;
  phone?: string;
  role?: string;
  exp?: number;
  user_metadata?: Record<string, unknown>;
};

/* ------------------ BREAK ------------------ */

let tokenCheckIntervalId: ReturnType<typeof setInterval> | null = null;
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
  if (tokenRefreshPromise) return tokenRefreshPromise;

  tokenRefreshPromise = performTokenRefresh().finally(() => {
    tokenRefreshPromise = null;
  });

  return tokenRefreshPromise;
};//export ends

/* ------------------ BREAK ------------------ */

// Performs one guarded refresh through the UnoQR auth-user endpoint.
async function performTokenRefresh(): Promise<RefreshTokenResult> {
  const { accessToken, refreshToken } = await getUserTokens();
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  if (!refreshToken) return "missing";
  if (accessToken && !isTokenExpired(accessToken)) return "valid";

  try {
    const authApiUrl = apiSettings.getApiUrl({ path: "/auth/user" });
    const abortController = new AbortController();
    refreshTimeout = setTimeout(() => abortController.abort(), tokenRefreshTimeoutMilliseconds);
    const response = await fetch(authApiUrl.href, {
      cache: "no-store",
      signal: abortController.signal,
      headers: {
        ...(accessToken
          ? { [userTokenSettings.headerTokens.accessToken.name]: accessToken }
          : {}),
        [userTokenSettings.headerTokens.refreshToken.name]: refreshToken
      }
    });

    if (!response.ok) {
      if (response.status === 401) await removeUserTokens();
      return "failed";
    };//if ends

    const newAccessToken = response.headers.get(
      userTokenSettings.headerTokens.newAccessToken.name
    );
    const newRefreshToken = response.headers.get(
      userTokenSettings.headerTokens.newRefreshToken.name
    );

    if (newAccessToken) {
      await persistAccessTokenAndUser(newAccessToken);
    };//if ends

    if (newRefreshToken) {
      await setData({
        key: userTokenSettings.storageTokens.refreshToken.name,
        value: newRefreshToken
      });
    };//if ends

    return newAccessToken || newRefreshToken ? "refreshed" : "valid";
  } catch (error: unknown) {
    console.warn("Unable to refresh the stored UnoQR session:", error);
    return "failed";
  } finally {
    if (refreshTimeout) clearTimeout(refreshTimeout);
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
    persistAccessTokenAndUser(access_token),
    setData({
      key: userTokenSettings.storageTokens.refreshToken.name,
      value: refresh_token
    })
  ]);
};//export ends

/* ------------------ BREAK ------------------ */

// Stores an access token together with user details decoded from its Supabase claims.
async function persistAccessTokenAndUser(accessToken: string): Promise<void> {
  const user = decodeSupabaseUser(accessToken);

  await Promise.all([
    setData({
      key: userTokenSettings.storageTokens.accessToken.name,
      value: accessToken
    }),
    setData({
      key: userTokenSettings.storageTokens.userData.name,
      value: user
    })
  ]);
};//func ends

// Converts Supabase access-token claims into the stored UnoQR user shape.
function decodeSupabaseUser(accessToken: string): UserType {
  const claims = jwtDecode<SupabaseJwtClaims>(accessToken);
  const metadata = claims.user_metadata || {};
  const metadataFullName = getMetadataString(metadata, "full_name")
    || getMetadataString(metadata, "name");
  const suppliedFirstName = getMetadataString(metadata, "first_name")
    || getMetadataString(metadata, "given_name");
  const suppliedLastName = getMetadataString(metadata, "last_name")
    || getMetadataString(metadata, "family_name");
  const nameParts = metadataFullName.trim().split(/\s+/).filter(Boolean);
  const firstName = suppliedFirstName || nameParts[0] || "";
  const lastName = suppliedLastName || nameParts.slice(1).join(" ");
  const fullName = metadataFullName || [firstName, lastName].filter(Boolean).join(" ");

  return {
    id: claims.sub || "",
    email: claims.email || getMetadataString(metadata, "email"),
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    avatar_url: getMetadataString(metadata, "avatar_url")
      || getMetadataString(metadata, "picture"),
    phone: claims.phone || getMetadataString(metadata, "phone"),
    role: "user",
    is_authenticated: claims.role === "authenticated" || Boolean(claims.sub),
    created_at: "",
    updated_at: ""
  };
};//func ends

// Reads a string value from Supabase user metadata.
function getMetadataString(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
};//func ends

/* ------------------ BREAK ------------------ */

// Removes all UnoQR session tokens, including the earlier uq-prefixed keys.
export async function removeUserTokens(): Promise<void> {
  await Promise.all([
    removeData({ key: userTokenSettings.storageTokens.accessToken.name }),
    removeData({ key: userTokenSettings.storageTokens.refreshToken.name }),
    removeData({ key: userTokenSettings.storageTokens.accessToken.legacyName }),
    removeData({ key: userTokenSettings.storageTokens.refreshToken.legacyName })
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
