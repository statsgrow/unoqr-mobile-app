import axios from "axios";

import { apiSettings, userTokenSettings } from "@/settings";
import { getUserTokens } from "@/utils/auth/AuthTokens";

/* ------------------ BREAK ------------------ */

export const Axios = axios.create();

/* ------------------ BREAK ------------------ */

// Attaches stored auth tokens only to requests targeting the configured UnoQR API.
Axios.interceptors.request.use(async (config) => {
  const apiOrigin = apiSettings.getApiUrl({ path: "/" }).origin;
  const requestOrigin = new URL(config.url || "/", config.baseURL || apiOrigin).origin;
  if (requestOrigin !== apiOrigin) return config;

  const { accessToken, refreshToken } = await getUserTokens();
  config.headers = config.headers ?? {};

  if (accessToken) {
    config.headers[userTokenSettings.headerTokens.accessToken.name] = accessToken;
  };//if ends

  if (refreshToken) {
    config.headers[userTokenSettings.headerTokens.refreshToken.name] = refreshToken;
  };//if ends

  return config;
});//interceptor ends
