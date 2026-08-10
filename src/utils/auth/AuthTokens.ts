

//Imports
import { jwtDecode } from 'jwt-decode';
import { userTokenSettings } from '@/settings';
import { UserType } from './UserTypes';
import { getData, removeData, setData } from '../general/Storage';

//Constants
let tokenCheckIntervalId: number | null = null;
let tokenCheckInFlight = false;

/* ----------------- BREAK ----------------- */

export function isTokenExpired(token?: string | null) {
  if (!token) return true;

  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);

    //default return
    return !exp || exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  };//trycatch ends
};//func ends

/* ----------------- BREAK ----------------- */

//get tokens from storage
export async function getUserTokens() {
  //access token
  const accessToken = await getData({ key: userTokenSettings.storageTokens.accessToken.name }) || null;

  //refresh token
  const refreshToken = await getData({ key: userTokenSettings.storageTokens.refreshToken.name }) || null;

  //return tokens
  return { accessToken, refreshToken };
};//func ends

/* ----------------- BREAK ----------------- */

async function refreshTokensSilently() {
  if (tokenCheckInFlight) return;

  //get access token & refresh from storage
  const { accessToken, refreshToken } = await getUserTokens();

  //check if access token is expired
  const accessTokenExpired = isTokenExpired(accessToken);

  //Skip refresh if there is no refresh token
  if (!refreshToken) return;

  //Skip refresh if access token is still valid
  if (accessToken && !accessTokenExpired) return;

  // Mark that a token check is in progress
  tokenCheckInFlight = true;

  // Attempt to refresh tokens
  try {
    const response = await fetch('/auth/user', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        ...(accessToken ? { 'X-Auth-Token': accessToken } : {}),
        ...(refreshToken ? { 'X-Auth-Refresh-Token': refreshToken } : {}),
      },
    });
    //If error, return
    if (!response.ok) return;

    //Parse the response and extract new tokens
    const responseBody = await response.json().catch(() => null);
    const newTokens = responseBody?.data?.tokens || null;

    //If new tokens are present, update the stored tokens
    if (newTokens?.access_token || newTokens?.refresh_token) {
      //set new access token
      await setData({
        key: userTokenSettings.storageTokens.accessToken.name,
        value: newTokens.access_token || null,
      });
      //set new refresh token
      await setData({
        key: userTokenSettings.storageTokens.refreshToken.name,
        value: newTokens.refresh_token || null,
      });
    };//if ends
  } catch {
    // Silent background refresh should not interrupt the user flow.
  } finally {
    tokenCheckInFlight = false;
  };//trycatch ends
};//func ends

/* ----------------- BREAK ----------------- */

export function triggerTokenChecking() {
  if (typeof window === 'undefined') return () => {};

  if (tokenCheckIntervalId) {
    window.clearInterval(tokenCheckIntervalId);
    tokenCheckIntervalId = null;
  }

  void refreshTokensSilently();
  tokenCheckIntervalId = window.setInterval(() => {
    void refreshTokensSilently();
  }, 60_000);

  return () => {
    if (!tokenCheckIntervalId) return;
    window.clearInterval(tokenCheckIntervalId);
    tokenCheckIntervalId = null;
  };
};//func ends

/* ----------------- BREAK ----------------- */

export async function setUserTokens({ token = null, refreshToken = null, user = null }: { token?: string | null, refreshToken?: string | null, user?: UserType | null }) {
  //check both token are present
  if (!token) throw new Error("Access token is missing.");
  if (!refreshToken) throw new Error("Refresh token is missing.");

  console.log("Setting user cookies:", token, refreshToken);

  //set access token
  if (token) await setData({
    key: userTokenSettings.storageTokens.accessToken.name,
    value: token,
  });

  //set refresh token
  if (refreshToken) await setData({
    key: userTokenSettings.storageTokens.refreshToken.name,
    value: refreshToken,
  });
};//func ends

/* ------------------- BREAK ---------------- */

//remove and clear tokens from storage
export async function removeUserTokens() {
  
  //remove access token
  await removeData({ key: userTokenSettings.storageTokens.accessToken.name });

  //remove refresh token
  await removeData({ key: userTokenSettings.storageTokens.refreshToken.name });

};//func ends

/* ----------------- BREAK ----------------- */