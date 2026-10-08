import axios from "axios";
import * as AppIntegrity from "@expo/app-integrity";
import { Platform } from "react-native";

import { apiSettings, installSettings } from "@/settings";

/* ------------------ BREAK ------------------ */

export type InstallTokenResponse = { access_token: string; refresh_token?: string; expires_at: string };
export type IntegrityInstall = { id: string; integrity_status?: "pending" | "checked" | "failed"; integrity_error?: { retryable?: boolean; time?: string }; [key: string]: unknown };
export type IntegrityResult = { install: IntegrityInstall; tokens?: InstallTokenResponse };
type ObservationInput = { installId: string; registrationToken: string };
type Challenge = { challenge: string; challenge_id: string };
type ApiResponse<T> = { data?: T };

/* ------------------ BREAK ------------------ */

// Verifies an installation once and reports detailed native failures without displaying UI.
export async function observeAppIntegrity({ installId, registrationToken }: ObservationInput): Promise<IntegrityResult | null> {
  if (Platform.OS === "web") return null;
  const provider = Platform.OS === "ios" ? "app_attest" : "play_integrity";
  const headers = { "x-install-registration": registrationToken };
  let stage = "challenge";
  let submittingProof = false;
  try {
    if (Platform.OS === "ios" && !AppIntegrity.isSupported) throw new Error("APP_ATTEST_UNSUPPORTED");
    const response = await axios.post<ApiResponse<Challenge | IntegrityResult>>(apiSettings.getApiUrl({ path: "/app/install/integrity/challenge" }).href, { install_id: installId }, { headers, timeout: 15000 });
    const challenge = response.data.data;
    if (challenge && "tokens" in challenge) return challenge as IntegrityResult;
    if (!challenge || !("challenge" in challenge) || !challenge.challenge || !challenge.challenge_id) throw new Error("APP_INTEGRITY_CHALLENGE_UNAVAILABLE");
    let proof: Record<string, unknown>;
    if (Platform.OS === "ios") {
      stage = "generate_key";
      const keyId = await AppIntegrity.generateKeyAsync();
      stage = "apple_attestation";
      const attestation = await AppIntegrity.attestKeyAsync(keyId, challenge.challenge);
      proof = { kind: "ios-attest", key_id: keyId, attestation };
    } else {
      stage = "prepare_provider";
      if (!installSettings.googleCloudProjectNumber) throw new Error("PLAY_INTEGRITY_PROJECT_NUMBER_MISSING");
      await AppIntegrity.prepareIntegrityTokenProviderAsync(installSettings.googleCloudProjectNumber);
      stage = "google_integrity";
      proof = { kind: "android", token: await AppIntegrity.requestIntegrityCheckAsync(challenge.challenge) };
    };//if ends
    stage = "server_verification";
    submittingProof = true;
    const verified = await axios.post<ApiResponse<IntegrityResult>>(apiSettings.getApiUrl({ path: "/app/install/integrity" }).href,
      { ...proof, ...challenge, install_id: installId, provider }, { headers, timeout: 30000 });
    return verified.data.data || null;
  } catch (error: unknown) {
    // Proof rejection has already been recorded by the backend.
    if (submittingProof) {
      const recorded = axios.isAxiosError(error) ? error.response?.data?.data as IntegrityResult | undefined : undefined;
      return recorded?.install ? recorded : null;
    };//if ends
    const nativeError = error as { code?: string; message?: string };
    try {
      const observed = await axios.post<ApiResponse<IntegrityInstall>>(apiSettings.getApiUrl({ path: "/app/install/integrity" }).href, {
        install_id: installId, provider, kind: "client-error",
        error_code: nativeError.code || "APP_INTEGRITY_CLIENT_ERROR", error_message: nativeError.message || "Unknown integrity error", error_stage: stage
      }, { headers, timeout: 15000 });
      return observed.data.data ? { install: observed.data.data } : null;
    } catch {
      return null;
    };//try-catch ends
  };//try-catch ends
};//export ends
