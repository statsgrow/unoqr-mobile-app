import { apiSettings, userTokenSettings } from '@/settings';
import { setData } from '@/utils/general/Storage';
import { saveAuthUser } from './AuthUserStorage';
import type { UserType } from './UserTypes';

/* ------------------ BREAK ------------------ */

// Loads the app-specific account and preserves its full subscription when credentials rotate.
export async function requestAppUser({ accessToken, refreshToken, signal }: {
  accessToken: string | null; refreshToken: string; signal?: AbortSignal;
}): Promise<{ user: UserType; refreshed: boolean }> {
  const response = await fetch(apiSettings.getApiUrl({ path: '/app/auth/user' }).href, {
    cache: 'no-store', signal,
    headers: {
      ...(accessToken ? { [userTokenSettings.headerTokens.accessToken.name]: accessToken } : {}),
      [userTokenSettings.headerTokens.refreshToken.name]: refreshToken
    }
  });
  // Keep a successfully rotated session even if the following profile read temporarily fails.
  const newAccessToken = response.headers.get(userTokenSettings.headerTokens.newAccessToken.name);
  const newRefreshToken = response.headers.get(userTokenSettings.headerTokens.newRefreshToken.name);
  if (response.status !== 401) {
    if (newAccessToken) await setData({ key: userTokenSettings.storageTokens.accessToken.name, value: newAccessToken });
    if (newRefreshToken) await setData({ key: userTokenSettings.storageTokens.refreshToken.name, value: newRefreshToken });
  };//if ends
  const body = await response.json().catch(() => null) as { data?: UserType; message?: string } | null;
  if (!response.ok) throw Object.assign(new Error(body?.message || 'Unable to load the authenticated app user.'), { statusCode: response.status });
  const user = body?.data;
  if (!user?.id || !user.subscription?.plan) throw new Error('The app user response is missing its subscription. Deploy the updated API.');
  await saveAuthUser(user);
  //Default Return
  return { user, refreshed: !!(newAccessToken || newRefreshToken) };
};//export ends
