

/* ------------------ BREAK ------------------ */

export const apiSettings = {
  //get api url with path 
  getApiUrl({ path }: { path: string }) {
    //get the host as per the environment variable
    const host = process.env.EXPO_PUBLIC_API_ENV === "production" ? process.env.EXPO_PUBLIC_API_URL_PRODUCTION : process.env.EXPO_PUBLIC_API_URL_DEVELOPMENT;
    //return the full url
    return new URL(path, host);
  }
};//const ends

/* ------------------ BREAK ------------------ */

export const frontendSettings = {
  // Builds frontend URLs for the same environment as the app's API.
  getFrontendUrl({ path }: { path: string }): URL {
    const host = process.env.EXPO_PUBLIC_API_ENV === "production"
      ? process.env.EXPO_PUBLIC_FRONTEND_URL_PRODUCTION || "https://unoqr.com"
      : process.env.EXPO_PUBLIC_FRONTEND_URL_DEVELOPMENT;
    if (!host) throw new Error("The card preview is not configured yet.");
    return new URL(path, host);
  },//func ends
};//export ends

/* ------------------ BREAK ------------------ */

export const sqliteSettings = {
  dbName: "unoqr_mobile_app.db",
};//const ends

// Names the persistent freshness marker for downloaded scan history.
export const scansSettings = {
  lastCheckedAtKey: "scans_last_checked_at"
};//export ends

/* ------------------ BREAK ------------------ */

export const userTokenSettings = {
  //local storage keys for user tokens
  storageTokens: {
    accessToken: { name: 'unoqr-auth-access-token', legacyName: 'uq-auth-token' },
    refreshToken: { name: 'unoqr-auth-refresh-token', legacyName: 'uq-auth-refresh-token' },
    userData: { name: 'unoqr-auth-user' },
  },
  
  //header tokens for api requests
  headerTokens: {
      "accessToken": { name: 'x-auth-token' },
      "refreshToken": { name: 'x-auth-refresh-token' },
      //seperate tokens for new tokens from backend
      "newAccessToken": { name: 'x-new-auth-token' },
      "newRefreshToken": { name: 'x-new-auth-refresh-token' },
   },
};//json ends

/* ------------------ BREAK ------------------ */

//install settings
export const installSettings = {
  googleCloudProjectNumber: process.env.EXPO_PUBLIC_CLOUD_PROJECT_NUMBER || "",
  //local storage keys for install info
  storageKeys: {
    installInfo: { name: 'uq-install-info' },
    installTokens: { name: 'uq-install-tokens' },
    appAttestKeyId: { name: 'uq-app-attest-key-id' },
  },
};//json ends

/* ------------------ BREAK ------------------ */
