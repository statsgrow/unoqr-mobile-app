import * as AppIntegrity from "@expo/app-integrity";
import * as Application from "expo-application";
import { Platform } from "react-native";

import { apiSettings, installSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";
import { setData } from "@/utils/general/Storage";

/* ------------------ BREAK ------------------ */

type IntegrityProvider = "app_attest" | "play_integrity";

type ChallengeResponse = {
  challenge: string;
  challenge_id: string;
  expires_at: string;
};

type AppIntegrityObservation = {
  id: string;
  integrity_status?: "not_checked" | "verified" | "unsupported" | "temporary_error" | "verification_failed";
  integrity_checked_at?: string | null;
  [key: string]: unknown;
};

type ApiResponse<T> = {
  data?: T | null;
  message?: string;
};

type ObservationInput = {
  installId: string;
};

/* ------------------ BREAK ------------------ */

let observationPromise: Promise<AppIntegrityObservation | null> | null = null;

/* ------------------ BREAK ------------------ */

// Runs one non-blocking platform integrity observation for the current native app installation.
export function observeAppIntegrity({ installId }: ObservationInput): Promise<AppIntegrityObservation | null> {
  if (Platform.OS === "web") return Promise.resolve(null);
  if (observationPromise) return observationPromise;

  observationPromise = runAppIntegrityObservation(installId).finally(() => {
    observationPromise = null;
  });

  return observationPromise;
};//export ends

/* ------------------ BREAK ------------------ */

// Selects and executes the platform-specific observation without changing app access.
async function runAppIntegrityObservation(installId: string): Promise<AppIntegrityObservation | null> {
  const provider = getIntegrityProvider();

  if (Platform.OS === "ios" && !AppIntegrity.isSupported) {
    return submitClientObservation(installId, provider, "unsupported", "APP_ATTEST_UNSUPPORTED");
  };//if ends

  try {
    const challenge = await requestChallenge(installId);

    return Platform.OS === "ios"
      ? await observeAppleIntegrity(installId, challenge)
      : await observeAndroidIntegrity(installId, challenge);
  } catch (error: unknown) {
    if (isServerVerificationError(error)) return null;

    return submitClientObservation(
      installId,
      provider,
      "client-error",
      getIntegrityErrorCode(error)
    ).catch(() => null);
  };//try-catch ends
};//func ends

// Generates and submits a one-time Apple App Attest object.
async function observeAppleIntegrity(
  installId: string,
  challenge: ChallengeResponse
): Promise<AppIntegrityObservation | null> {
  const keyId = await AppIntegrity.generateKeyAsync();
  const attestation = await AppIntegrity.attestKeyAsync(keyId, challenge.challenge);
  const observation = await submitProof({
    install_id: installId,
    kind: "ios-attest",
    provider: "app_attest",
    challenge_id: challenge.challenge_id,
    challenge: challenge.challenge,
    key_id: keyId,
    attestation,
    ...getAppVersionData()
  });

  if (observation?.integrity_status === "verified") {
    await setData({
      key: installSettings.storageKeys.appAttestKeyId.name,
      value: keyId
    });
  };//if ends

  return observation;
};//func ends

// Requests and submits a Google Play Integrity standard token.
async function observeAndroidIntegrity(
  installId: string,
  challenge: ChallengeResponse
): Promise<AppIntegrityObservation | null> {
  const cloudProjectNumber = installSettings.googleCloudProjectNumber;
  if (!cloudProjectNumber) throw new Error("PLAY_INTEGRITY_PROJECT_NUMBER_MISSING");

  await AppIntegrity.prepareIntegrityTokenProviderAsync(cloudProjectNumber);
  const token = await AppIntegrity.requestIntegrityCheckAsync(challenge.challenge);

  return submitProof({
    install_id: installId,
    kind: "android",
    provider: "play_integrity",
    challenge_id: challenge.challenge_id,
    challenge: challenge.challenge,
    token,
    ...getAppVersionData()
  });
};//func ends

// Requests a server-owned challenge bound to the current installation.
async function requestChallenge(installId: string): Promise<ChallengeResponse> {
  const apiUrl = apiSettings.getApiUrl({ path: "/app/install/integrity/challenge" });
  const response = await Axios.post<ApiResponse<ChallengeResponse>>(apiUrl.href, {
    install_id: installId
  });
  const challenge = response.data?.data;

  if (!challenge?.challenge || !challenge.challenge_id) {
    throw new Error("APP_INTEGRITY_CHALLENGE_UNAVAILABLE");
  };//if ends

  return challenge;
};//func ends

// Sends a platform proof and marks API verification failures so they are not overwritten as client errors.
async function submitProof(body: Record<string, unknown>): Promise<AppIntegrityObservation | null> {
  const apiUrl = apiSettings.getApiUrl({ path: "/app/install/integrity" });

  try {
    const response = await Axios.post<ApiResponse<AppIntegrityObservation>>(apiUrl.href, body);
    return response.data?.data || null;
  } catch (error: unknown) {
    throw new ServerVerificationError(getIntegrityErrorCode(error));
  };//try-catch ends
};//func ends

// Reports only unsupported or pre-verification client errors for observation telemetry.
async function submitClientObservation(
  installId: string,
  provider: IntegrityProvider,
  kind: "unsupported" | "client-error",
  errorCode: string
): Promise<AppIntegrityObservation | null> {
  const apiUrl = apiSettings.getApiUrl({ path: "/app/install/integrity" });
  const response = await Axios.post<ApiResponse<AppIntegrityObservation>>(apiUrl.href, {
    install_id: installId,
    kind,
    provider,
    error_code: errorCode,
    ...getAppVersionData()
  });

  return response.data?.data || null;
};//func ends

// Returns the platform provider represented by the current native build.
function getIntegrityProvider(): IntegrityProvider {
  return Platform.OS === "ios" ? "app_attest" : "play_integrity";
};//func ends

// Returns non-secret app version fields saved with the observation.
function getAppVersionData() {
  return {
    app_version: Application.nativeApplicationVersion,
    build: Application.nativeBuildVersion
  };
};//func ends

// Converts native, Axios and provider failures into a concise telemetry code.
function getIntegrityErrorCode(error: unknown): string {
  const integrityError = error as {
    code?: unknown;
    message?: unknown;
    response?: { data?: { message?: unknown } };
  } | null;
  const value = typeof integrityError?.code === "string"
    ? integrityError.code
    : typeof integrityError?.response?.data?.message === "string"
      ? integrityError.response.data.message
      : typeof integrityError?.message === "string"
        ? integrityError.message
        : "APP_INTEGRITY_CLIENT_ERROR";

  return value.slice(0, 120);
};//func ends

// Returns whether the API already handled and stored a proof verification failure.
function isServerVerificationError(error: unknown): error is ServerVerificationError {
  return error instanceof ServerVerificationError;
};//func ends

/* ------------------ BREAK ------------------ */

// Represents an API-handled integrity failure that the client must not reclassify.
class ServerVerificationError extends Error {
  // Creates an error that prevents a verification failure from being reclassified by the client.
  constructor(message: string) {
    super(message);
    this.name = "ServerVerificationError";
  };//constructor ends
};//class ends
