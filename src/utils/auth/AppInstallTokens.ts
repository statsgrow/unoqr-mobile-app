import axios from "axios";

import { apiSettings, installSettings } from "@/settings";
import { getData, setData, removeData } from "@/utils/general/Storage";

import { observeAppIntegrity, type IntegrityInstall, type InstallTokenResponse } from "./AppIntegrity";

/* ------------------ BREAK ------------------ */

type InstallCredentials = { install_id: string; registration_token?: string; access_token?: string; refresh_token?: string; expires_at?: string; last_attempt_at?: string };
type RenewalResult = { install: IntegrityInstall; tokens: InstallTokenResponse };
let tokenPromise: Promise<string | null> | null = null;

// Reads installation credentials from native SecureStore.
export async function getInstallCredentials(): Promise<InstallCredentials | null> {
  const value = await getData({ key: installSettings.storageKeys.installTokens.name });
  return value && typeof value === "object" ? value as InstallCredentials : null;
};//export ends

// Saves the private bootstrap credential returned for a newly registered installation.
export async function saveInstallRegistration(installId: string, registrationToken: string): Promise<void> {
  await setData({ key: installSettings.storageKeys.installTokens.name, value: { install_id: installId, registration_token: registrationToken } });
};//export ends

// Clears installation credentials when an installation is explicitly reset.
export async function clearInstallTokens(): Promise<void> {
  await removeData({ key: installSettings.storageKeys.installTokens.name });
};//export ends

// Shares one verification or renewal operation across concurrent API requests.
export async function getInstallAccessToken(forceRefresh = false, waitForVerification = false): Promise<string | null> {
  const credentials = await getInstallCredentials();
  if (!credentials) return null;
  if (!forceRefresh && credentials.access_token && Date.parse(credentials.expires_at || "") > Date.now() + 60000) return credentials.access_token;
  if (!tokenPromise) tokenPromise = renewInstallToken(credentials).finally(() => { tokenPromise = null; });
  // Scan requests stay nonblocking; installation linking can await initial verification.
  if (!credentials.refresh_token && !waitForVerification) return null;
  return tokenPromise;
};//export ends

// Renews through UnoQR or obtains the initial provider proof when no refresh credential exists.
async function renewInstallToken(credentials: InstallCredentials): Promise<string | null> {
  try {
    let result: RenewalResult | null = null;
    if (credentials.refresh_token) {
      const response = await axios.post<{ data?: RenewalResult }>(apiSettings.getApiUrl({ path: "/app/install/token/refresh" }).href,
        { refresh_token: credentials.refresh_token }, { timeout: 15000 });
      result = response.data.data || null;
    } else if (credentials.registration_token) {
      const cachedInstall = await getData({ key: installSettings.storageKeys.installInfo.name }) as IntegrityInstall | null;
      const lastAttempt = Date.parse(credentials.last_attempt_at || cachedInstall?.integrity_error?.time || "");
      if (cachedInstall?.integrity_status === "failed" || (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < 15 * 60000)) return null;
      await setData({ key: installSettings.storageKeys.installTokens.name, value: { ...credentials, last_attempt_at: new Date().toISOString() } });
      const verified = await observeAppIntegrity({ installId: credentials.install_id, registrationToken: credentials.registration_token });
      if (verified?.install) {
        const current = await getInstallCredentials();
        if (current?.install_id !== credentials.install_id) return null;
        await setData({ key: installSettings.storageKeys.installInfo.name, value: { ...cachedInstall, ...verified.install } });
      };//if ends
      if (verified?.tokens) result = { install: verified.install, tokens: verified.tokens };
    };//if ends
    if (!result?.tokens.access_token) return null;
    const current = await getInstallCredentials();
    if (current?.install_id !== credentials.install_id) return null;
    await setData({ key: installSettings.storageKeys.installTokens.name, value: {
      install_id: credentials.install_id, access_token: result.tokens.access_token,
      refresh_token: result.tokens.refresh_token || credentials.refresh_token, expires_at: result.tokens.expires_at
    } });
    const cachedInstall = await getData({ key: installSettings.storageKeys.installInfo.name });
    await setData({ key: installSettings.storageKeys.installInfo.name, value: { ...cachedInstall, ...result.install } });
    return result.tokens.access_token;
  } catch {
    return null;
  };//try-catch ends
};//func ends
