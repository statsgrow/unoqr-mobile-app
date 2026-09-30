import { useEffect, useMemo, useRef } from "react";
import * as Linking from "expo-linking";
import { useLocalSearchParams, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { redirect } from "@/utils/general/Redirect";
import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { addUserData } from "@/utils/auth/AuthUser";
import { Toast } from "@/utils/general/Toast";

/* ------------------ BREAK ------------------ */

type LoginCallbackParams = {
  callback_url?: string | string[];
  access_token?: string | string[];
  refresh_token?: string | string[];
  next?: string | string[];
};

type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

/* ------------------ BREAK ------------------ */

WebBrowser.maybeCompleteAuthSession();

/* ------------------ BREAK ------------------ */

// Completes app OAuth, connects the install, and follows the validated next route.
export default function LoginCallbackScreen() {
  const params = useLocalSearchParams<LoginCallbackParams>();
  const currentUrl = Linking.useURL();
  const hasProcessed = useRef(false);
  const callbackUrl = useMemo(
    () => getFirstParam(params.callback_url) || currentUrl || "",
    [currentUrl, params.callback_url]
  );

  // Processes the OAuth result exactly once even when linking state updates more than once.
  useEffect(() => {
    if (hasProcessed.current) return;

    const directTokens: AuthTokens = {
      accessToken: getFirstParam(params.access_token),
      refreshToken: getFirstParam(params.refresh_token)
    };
    const tokens = directTokens.accessToken && directTokens.refreshToken
      ? directTokens
      : getTokensFromUrl(callbackUrl);
    const callbackNext = getNextFromUrl(callbackUrl);
    const nextRoute = getSafeNextRoute(getFirstParam(params.next) || callbackNext);

    if (!tokens.accessToken || !tokens.refreshToken) {
      if (!callbackUrl) return;

      hasProcessed.current = true;
      Toast.error({ message: "Google authentication could not be completed." });
      const redirectTimeout = setTimeout(() => {
        redirect("replace", { pathname: "/auth/login", params: { next: nextRoute } });
      }, 1200);
      return () => clearTimeout(redirectTimeout);
    };//if ends

    hasProcessed.current = true;

    // Stores the authenticated session and returns to the requested internal page.
    const completeAuthentication = async () => {
      try {
        await addUserData({
          accessToken: tokens.accessToken as string,
          refreshToken: tokens.refreshToken as string
        });
        Toast.success({ message: "You are now logged in." });
        redirect("replace", nextRoute as Href);
      } catch (error: unknown) {
        const message = error instanceof Error
          ? error.message
          : "Google authentication could not be completed.";
        Toast.error({ message });
        redirect("replace", { pathname: "/auth/login", params: { next: nextRoute } });
      };//try-catch ends
    };//func ends

    void completeAuthentication();
  }, [callbackUrl, params.access_token, params.next, params.refresh_token]);

  //Default Return
  return (
    <PxPageLoader
      title="Signing you in"
      description="Securely connecting your UNOQR account and this app installation."
    />
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Returns the first scalar route parameter value.
function getFirstParam(value?: string | string[]): string | null {
  return Array.isArray(value) ? value[0] || null : value || null;
};//func ends

// Extracts Supabase session tokens from query parameters or the hash fragment.
function getTokensFromUrl(value: string): AuthTokens {
  if (!value) return { accessToken: null, refreshToken: null };

  try {
    const parsedUrl = new URL(value);
    const fragmentParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));

    return {
      accessToken: fragmentParams.get("access_token") || parsedUrl.searchParams.get("access_token"),
      refreshToken: fragmentParams.get("refresh_token") || parsedUrl.searchParams.get("refresh_token")
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  };//try-catch ends
};//func ends

// Reads the post-login route supplied by the fixed API callback.
function getNextFromUrl(value: string): string | null {
  if (!value) return null;

  try {
    return new URL(value).searchParams.get("next");
  } catch {
    return null;
  };//try-catch ends
};//func ends

// Restricts post-login navigation to an internal Expo route.
function getSafeNextRoute(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
};//func ends
