import axios, { type InternalAxiosRequestConfig } from "axios";

import { apiSettings, userTokenSettings } from "@/settings";
import { getInstallAccessToken } from "@/utils/auth/AppInstallTokens";
import { getUserTokens } from "@/utils/auth/AuthTokens";

/* ------------------ BREAK ------------------ */

export const Axios = axios.create();

/* ------------------ BREAK ------------------ */

// Attaches stored auth tokens only to requests targeting the configured UnoQR API.
Axios.interceptors.request.use(async (config) => {
  const apiOrigin = apiSettings.getApiUrl({ path: "/" }).origin;
  const requestUrl = new URL(config.url || "/", config.baseURL || apiOrigin);
  const requestOrigin = requestUrl.origin;
  if (requestOrigin !== apiOrigin) return config;

  const { accessToken, refreshToken } = await getUserTokens();
  config.headers = config.headers ?? {};

  if (accessToken) {
    config.headers[userTokenSettings.headerTokens.accessToken.name] = accessToken;
  };//if ends

  if (refreshToken) {
    config.headers[userTokenSettings.headerTokens.refreshToken.name] = refreshToken;
  };//if ends

  const registrationLink = config.method?.toLowerCase() === "put"
    && ["/app/install/connectuser", "/app/scans/connectuser"].includes(requestUrl.pathname.replace(/\/$/, ""))
    && config.headers["x-install-registration"];
  const accountNotes = config.method?.toLowerCase() === "patch"
    && /^\/app\/scans\/[^/]+\/notes\/?$/.test(requestUrl.pathname)
    && Boolean(accessToken);
  if (!registrationLink && !accountNotes && needsInstallToken(requestUrl.pathname, config.method, config.data)) {
    const token = await getInstallAccessToken();
    if (!token) throw new axios.AxiosError("Installation verification is pending; scan remains saved locally", "INSTALL_VERIFICATION_PENDING", config);
    config.headers["x-install-token"] = token;
  };//if ends

  return config;
});//interceptor ends

/* ------------------ BREAK ------------------ */

// Renews an expired installation token once without intercepting unrelated API failures.
Axios.interceptors.response.use(response => response, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error;
  const config = error.config as (InternalAxiosRequestConfig & { installRetry?: boolean }) | undefined;
  const code = error.response?.data?.code;
  if (config && !config.installRetry && error.response?.status === 401 && (code === "INSTALL_TOKEN_EXPIRED" || code === "INSTALL_TOKEN_REQUIRED")) {
    const token = await getInstallAccessToken(true);
    if (token) {
      config.installRetry = true;
      config.headers["x-install-token"] = token;
      return Axios.request(config);
    };//if ends
  };//if ends
  throw error;
});//interceptor ends

// Identifies native installation endpoints that require an installation access token.
function needsInstallToken(path: string, method?: string, data?: unknown): boolean {
  const route = path.replace(/\/$/, "");
  if (method?.toLowerCase() === "delete" && /^\/app\/scans\/[^/]+$/.test(route)) return false;
  if (route === "/app/install" && method?.toLowerCase() === "put"
    && (data as { status?: unknown } | null)?.status === "logged_out") return false;
  if (route === "/app/scans" && method?.toLowerCase() === "get") return false;
  return route === "/app/scans" || route.startsWith("/app/scans/") || route === "/app/install/connectuser" || (route === "/app/install" && method?.toLowerCase() !== "post");
};//func ends
