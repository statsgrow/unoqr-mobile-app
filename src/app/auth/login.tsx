import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { isAxiosError } from "axios";
import * as Linking from "expo-linking";
import { useLocalSearchParams, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { redirect } from "@/utils/general/Redirect";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { PxButton } from "@/components/elements/PxButton";
import { PxAlert } from "@/components/elements/PxAlert";
import { PxTextInput } from "@/components/form/PxTextInput";
import { apiSettings } from "@/settings";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { addUserData } from "@/utils/auth/AuthUser";
import type { UserSessionType } from "@/utils/auth/UserTypes";
import { Toast } from "@/utils/general/Toast";

/* ------------------ BREAK ------------------ */

type LoginFormValues = {
  email: string;
  otp: string;
  password: string;
};

type LoginParams = {
  next?: string | string[];
};

type AuthApiResponse<T> = {
  data?: T | null;
  message?: string;
};

/* ------------------ BREAK ------------------ */

WebBrowser.maybeCompleteAuthSession();

const TEST_USER_EMAILS = ["unoqr.one@gmail.com", "patelpratik1988@yahoo.com"];

/* ------------------ BREAK ------------------ */

// Manages email OTP and Google authentication from one UnoQR login page.
export default function LoginScreen() {
  const params = useLocalSearchParams<LoginParams>();
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isLoggingInTestUser, setIsLoggingInTestUser] = useState(false);
  const [isOpeningGoogle, setIsOpeningGoogle] = useState(false);
  const nextRoute = getSafeNextRoute(getFirstParam(params.next));
  const RHF = useForm<LoginFormValues>({
    defaultValues: { email: "", otp: "", password: "" },
    shouldUnregister: true,
    mode: "onChange"
  });
  const isTestUser = isTestUserEmail(RHF.watch("email"));
  const isOtpStep = isOtpSent && !isTestUser;

  // Requests an eight-digit OTP for the validated email address.
  const handleRequestOtp: SubmitHandler<LoginFormValues> = async ({ email }) => {
    setIsRequestingOtp(true);
    setLoginError(null);

    try {
      const apiUrl = apiSettings.getApiUrl({ path: "/auth/app/login/email" });
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const responseBody = await response.json().catch(() => null) as AuthApiResponse<unknown> | null;
      if (!response.ok) throw new Error(responseBody?.message || "Unable to send the OTP.");

      setIsOtpSent(true);
      Toast.success({ message: responseBody?.message || "An 8-digit OTP was sent to your email." });
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Unable to send the OTP.");
      showLoginError(message);
    } finally {
      setIsRequestingOtp(false);
    };//try-catch ends
  };//func ends

  // Verifies the OTP, stores the session, connects the install, and follows the next route.
  const handleVerifyOtp: SubmitHandler<LoginFormValues> = async ({ email, otp }) => {
    setIsVerifyingOtp(true);
    setLoginError(null);

    try {
      const apiUrl = apiSettings.getApiUrl({ path: "/auth/app/login/email" });
      const response = await fetch(apiUrl.href, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim()
        })
      });
      const responseBody = await response.json().catch(() => null) as AuthApiResponse<UserSessionType> | null;
      if (!response.ok) throw new Error(responseBody?.message || "Unable to verify the OTP.");

      await completeAuthenticatedLogin(responseBody?.data, nextRoute);
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Unable to verify the OTP.");
      showLoginError(message);
    } finally {
      setIsVerifyingOtp(false);
    };//try-catch ends
  };//func ends

  // Signs a dedicated review account in with its password instead of email OTP.
  const handleTestUserLogin: SubmitHandler<LoginFormValues> = async ({ email, password }) => {
    setIsLoggingInTestUser(true);
    setLoginError(null);

    try {
      const apiUrl = apiSettings.getApiUrl({ path: "/auth/login" });
      const response = await fetch(apiUrl.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });
      const responseBody = await response.json().catch(() => null) as AuthApiResponse<UserSessionType> | null;
      if (!response.ok) throw new Error(responseBody?.message || "Unable to log in the test user.");

      await completeAuthenticatedLogin(responseBody?.data, nextRoute);
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Unable to log in the test user.");
      showLoginError(message);
    } finally {
      setIsLoggingInTestUser(false);
    };//try-catch ends
  };//func ends

  // Starts Google OAuth through the isolated mobile API route and hands success to the callback page.
  const handleGoogleLogin = async () => {
    setIsOpeningGoogle(true);
    setLoginError(null);

    try {
      const callbackUrl = new URL(Linking.createURL("/auth/callback"));
      callbackUrl.searchParams.set("next", nextRoute);
      const loginUrl = new URL(`https://api.unoqr.com/auth/app/login/google`);
      loginUrl.searchParams.set("next", callbackUrl.href);
      const result = await WebBrowser.openAuthSessionAsync(loginUrl.href, callbackUrl.href);

      if (result.type === "success") {
        redirect("replace", {
          pathname: "/auth/callback",
          params: { callback_url: result.url, next: nextRoute }
        });
      };//if ends
    } catch (error: unknown) {
      showLoginError(getErrorMessage(error, "Unable to start Google login."));
    } finally {
      setIsOpeningGoogle(false);
    };//try-catch ends
  };//func ends

  // Shows non-validation login failures in the inline error card.
  const showLoginError = (message: string): void => {
    setLoginError(message);
  };//func ends

  // Returns to email entry so the user can correct the destination address.
  const handleChangeEmail = () => {
    setIsOtpSent(false);
    setLoginError(null);
    RHF.setValue("otp", "");
    RHF.clearErrors();
  };//func ends

  //Default Return
  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderNav showProfile={false} showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.title}>
              {isOtpStep ? "Enter your OTP" : "Welcome"}
            </Text>
            <Text style={styles.subtitle}>
              {isOtpStep
                ? `We sent an 8-digit code to ${RHF.getValues("email")}.`
                : "Log in to sync your scans and access them across devices."}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                {isOtpStep ? (
                  <Pressable accessibilityRole="button" hitSlop={spacing.xs} onPress={handleChangeEmail}>
                    <Text style={styles.changeEmailText}>Change</Text>
                  </Pressable>
                ) : null}
              </View>
              <PxTextInput
                name="email"
                RHF={RHF}
                type="email"
                size="large"
                leftAdornment={{ icon: "email-outline" }}
                placeholder="you@example.com"
                disabled={isOtpStep}
                rules={{
                  required: "Email address is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address"
                  }
                }}
              />
            </View>

            {isOtpStep ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>8-DIGIT OTP</Text>
                <PxTextInput
                  name="otp"
                  RHF={RHF}
                  type="number"
                  size="large"
                  leftAdornment={{ icon: "shield-key-outline" }}
                  placeholder="00000000"
                  autoFocus
                  rules={{
                    required: "OTP is required",
                    pattern: {
                      value: /^\d{8}$/,
                      message: "Enter the 8-digit OTP"
                    }
                  }}
                />
              </View>
            ) : null}

            {isTestUser && !isOtpStep ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <PxTextInput
                  name="password"
                  RHF={RHF}
                  type="password"
                  size="large"
                  leftAdornment={{ icon: "lock-outline" }}
                  placeholder="Enter your password"
                  autoFocus
                  rules={{ required: "Password is required" }}
                />
              </View>
            ) : null}

            {loginError ? <PxAlert messages={[loginError]} color="error" /> : null}

            <PxButton
              mode="contained"
              color="secondary"
              size="lg"
              shape="rounded"
              fullWidth
              loading={isTestUser
                ? isLoggingInTestUser
                : isOtpStep
                  ? isVerifyingOtp
                  : isRequestingOtp}
              onPress={RHF.handleSubmit(isTestUser
                ? handleTestUserLogin
                : isOtpStep
                  ? handleVerifyOtp
                  : handleRequestOtp)}
            >
              {isTestUser ? "Log in" : isOtpStep ? "Verify OTP" : "Continue with email"}
            </PxButton>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              accessibilityLabel="Continue with Google"
              accessibilityRole="button"
              disabled={isOpeningGoogle}
              onPress={() => void handleGoogleLogin()}
              style={({ pressed }) => [
                styles.socialButton,
                (pressed || isOpeningGoogle) && styles.socialButtonPressed
              ]}
            >
              <Image source={require("@/assets/images/google-icon.png")} style={styles.googleIcon} resizeMode="contain" />
              <Text style={styles.socialButtonText}>
                {isOpeningGoogle ? "Opening Google…" : "Continue with Google"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.privacyText}>
            Read how UnoQR handles your information in our{" "}
            <Text onPress={() => void WebBrowser.openBrowserAsync("https://www.unoqr.com/policies/privacy")} accessibilityRole="link" style={styles.privacyLink}>
              Privacy Policy
            </Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Returns the first scalar route parameter value.
function getFirstParam(value?: string | string[]): string | null {
  return Array.isArray(value) ? value[0] || null : value || null;
};//func ends

// Restricts post-login navigation to an internal Expo route.
function getSafeNextRoute(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
};//func ends

// Returns whether the entered email uses password login for app review.
function isTestUserEmail(email: string): boolean {
  return TEST_USER_EMAILS.includes((email || "").trim().toLowerCase());
};//func ends

// Stores a returned Supabase session and completes the shared post-login flow.
async function completeAuthenticatedLogin(
  session: UserSessionType | null | undefined,
  nextRoute: string
): Promise<void> {
  if (!session?.access_token || !session.refresh_token) {
    throw new Error("The authenticated session did not include tokens.");
  }//if ends

  await addUserData({
    userData: session.user,
    accessToken: session.access_token,
    refreshToken: session.refresh_token
  });
  Toast.success({ message: "You are now logged in." });
  redirect("replace", nextRoute as Href);
};//func ends

// Converts an unknown request failure into readable login feedback.
function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message || fallback;
  };//if ends
  return error instanceof Error && error.message ? error.message : fallback;
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white.main
  },
  screen: {
    flex: 1,
    backgroundColor: colors.cream.main
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg
  },
  hero: {
    gap: spacing.xs,
    marginBottom: spacing.xl
  },
  title: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h3,
    lineHeight: 38,
    letterSpacing: -0.7
  },
  subtitle: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body1,
    lineHeight: 24
  },
  form: {
    gap: spacing.lg
  },
  fieldGroup: {
    gap: spacing.xs
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  fieldLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    letterSpacing: 1.6
  },
  changeEmailText: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line.main
  },
  dividerText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption
  },
  googleIcon: {
    width: 23,
    height: 23
  },
  socialButton: {
    width: "100%",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  socialButtonPressed: {
    opacity: 0.68
  },
  socialButtonText: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body1
  },
  privacyLink: { color: colors.secondary.main },
  privacyText: {
    marginTop: "auto",
    paddingTop: spacing.xxl,
    color: colors.mute.light,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption,
    lineHeight: 18,
    textAlign: "center"
  }
});
