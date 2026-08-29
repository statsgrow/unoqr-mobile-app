import { apiSettings, userTokenSettings } from "@/settings";
import { connectUserAppScans } from "@/helpers/scans/scanSync";
import { connectUserAppInstall } from "@/utils/auth/AppInstall";
import {
  getUserTokens,
  isTokenExpired,
  refreshTokensSilently,
  removeUserTokens,
  setUserTokens
} from "@/utils/auth/AuthTokens";
import type { UserType } from "@/utils/auth/UserTypes";
import { getData, removeData, setData } from "@/utils/general/Storage";

/* ------------------ BREAK ------------------ */

type GetUserOptions = {
  errorOnFail?: boolean;
  allowedRoles?: Array<"user">;
  activeSpaceUid?: string;
};

type AddUserDataInput = {
  userData?: UserType | null;
  accessToken: string;
  refreshToken: string;
};

type ApiUserResponse = {
  data?: UserType | null;
  message?: string;
};

/* ------------------ BREAK ------------------ */

// Fetches the authenticated UnoQR user and persists refreshed tokens returned in headers.
export async function getUser({
  errorOnFail = true
}: GetUserOptions = {}): Promise<UserType | null> {
  try {
    const { accessToken, refreshToken } = await getUserTokens();
    if (!accessToken || !refreshToken) return null;

    const authApiUrl = apiSettings.getApiUrl({ path: "/auth/user" });
    const response = await fetch(authApiUrl.href, {
      cache: "no-store",
      headers: {
        [userTokenSettings.headerTokens.accessToken.name]: accessToken,
        [userTokenSettings.headerTokens.refreshToken.name]: refreshToken
      }
    });

    if (!response.ok) {
      if (response.status === 401) await clearStoredUserSession();
      const responseBody = await response.json().catch(() => null) as ApiUserResponse | null;
      throw new Error(responseBody?.message || "Unable to load the authenticated user.");
    };//if ends

    await persistResponseTokens(response);
    const responseBody = await response.json() as ApiUserResponse;
    const user = responseBody.data || null;

    if (user) {
      await setData({
        key: userTokenSettings.storageTokens.userData.name,
        value: user
      });
    };//if ends

    return user;
  } catch (error: unknown) {
    if (errorOnFail) throw error;
    return null;
  };//try-catch ends
};//export ends

/* ------------------ BREAK ------------------ */

// Stores a completed session, resolves its user, and connects the anonymous app install.
export async function addUserData({
  userData,
  accessToken,
  refreshToken
}: AddUserDataInput): Promise<UserType> {
  await setUserTokens({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  const user = userData || await getStorageUser() || await getUser();
  if (!user) throw new Error("Authenticated user data was not returned.");

  await setData({
    key: userTokenSettings.storageTokens.userData.name,
    value: user
  });
  const connectedInstall = await connectUserAppInstall();
  if (connectedInstall) await connectUserAppScans();

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
  if (storedUser && typeof storedUser === "object") return storedUser as UserType;

  return getUser({ errorOnFail: false });
};//export ends

/* ------------------ BREAK ------------------ */

// Clears local user and token data without affecting the anonymous app installation.
export async function processUserLogout(): Promise<void> {
  await clearStoredUserSession();
};//export ends

// Stores any rotated tokens emitted by the UnoQR API auth-user response.
async function persistResponseTokens(response: Response): Promise<void> {
  const accessToken = response.headers.get(userTokenSettings.headerTokens.newAccessToken.name);
  const refreshToken = response.headers.get(userTokenSettings.headerTokens.newRefreshToken.name);

  if (accessToken) {
    await setData({
      key: userTokenSettings.storageTokens.accessToken.name,
      value: accessToken
    });
  };//if ends

  if (refreshToken) {
    await setData({
      key: userTokenSettings.storageTokens.refreshToken.name,
      value: refreshToken
    });
  };//if ends
};//func ends

// Removes the cached user together with all access and refresh token variants.
async function clearStoredUserSession(): Promise<void> {
  await Promise.all([
    removeUserTokens(),
    removeData({ key: userTokenSettings.storageTokens.userData.name })
  ]);
};//func ends
