import { useEffect, useState } from "react";
import * as Application from "expo-application";
import { AppState, Linking, Platform, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxModal } from "@/components/elements/PxModal";
import { apiSettings } from "@/settings";
import { colors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";

import { Axios } from "./Axios";
import { getData, removeData, setData } from "./Storage";

/* ------------------ BREAK ------------------ */

type AppRelease = {
  version: string;
  build_version: string;
  platform: "android" | "ios";
};

const VERSION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CHECK_SCHEDULE_KEY = "app_version_check_schedule";

type VersionCheckSchedule = {
  installedVersion: string;
  nextCheckAt: number;
};

/* ------------------ BREAK ------------------ */

// Checks cloud releases daily and displays a dismissible app update modal.
export function AppVersionDialog() {
  const [open, setOpen] = useState(false);
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  // Checks the saved deadline on startup and foreground, and while the app remains active.
  useEffect(() => {
    let active = true;
    let checking = false;
    let legacyDateRemoved = false;

    // Compares the latest API release against the installed native version and build.
    const checkLatestVersion = async (): Promise<void> => {
      const installedVersion = Application.nativeApplicationVersion;
      if (checking || !installedVersion || (Platform.OS !== "android" && Platform.OS !== "ios")) return;
      checking = true;
      try {
        if (!legacyDateRemoved) {
          await removeData({ key: "app_version_last_checked_at" });
          legacyDateRemoved = true;
        };//if ends
        const installedIdentity = getInstalledVersion();
        const schedule = await getData({ key: CHECK_SCHEDULE_KEY }) as VersionCheckSchedule | null;
        if (!schedule || schedule.installedVersion !== installedIdentity || !Number.isFinite(schedule.nextCheckAt)) {
          await postponeVersionCheck();
          return;
        };//if ends
        if (Date.now() < schedule.nextCheckAt) return;
        const response = await Axios.get<{ data: AppRelease | null }>(
          apiSettings.getApiUrl({ path: `/app/version?platform=${Platform.OS}` }).href,
          { timeout: 15_000 }
        );
        await postponeVersionCheck();
        const latest = response.data.data;
        if (!active || !latest || latest.platform !== Platform.OS) return;
        const versionComparison = compareVersion(latest.version, installedVersion);
        const newerBuild = versionComparison === 0 && Application.nativeBuildVersion
          && compareVersion(latest.build_version, Application.nativeBuildVersion) > 0;
        if (versionComparison > 0 || newerBuild) {
          setRelease(latest);
          setOpen(true);
        };//if ends
      } catch {
        // A failed update check must not interrupt normal app use.
      } finally {
        checking = false;
      };//try-catch ends
    };//func ends

    void checkLatestVersion();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void checkLatestVersion();
    }, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkLatestVersion();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };//return ends
  }, []);

  // Delays the next check for 24 hours after closing or postponing the reminder.
  const dismissUpdate = async (): Promise<void> => {
    try {
      await postponeVersionCheck();
    } catch {
      // Storage failure must not prevent closing the reminder.
    } finally {
      setOpen(false);
    };//try-catch ends
  };//func ends

  // Opens the platform's store listing using the installed application identifier.
  const updateApp = async (): Promise<void> => {
    setStoreError(null);
    const storeUrl = Platform.OS === "ios"
      ? "https://apps.apple.com/in/search?term=Uno%20QR"
      : `https://play.google.com/store/apps/details?id=${Application.applicationId || "com.statsgrow.unoqr"}`;
    try {
      await Linking.openURL(storeUrl);
      await dismissUpdate();
    } catch {
      setStoreError("Unable to open the store. Please search for Uno QR in your app store.");
    };//try-catch ends
  };//func ends

  //Default Return
  return (
    <PxModal
      visible={open} onRequestClose={() => void dismissUpdate()} name="App update available" height="auto" maxHeight={760}
      footerAction={(
        <View style={styles.actions}>
          <PxButton onPress={() => void updateApp()} fullWidth>Update Now</PxButton>
          <PxButton onPress={() => void dismissUpdate()} mode="text" size="sm">Maybe later</PxButton>
        </View>
      )}
    >
        <View style={styles.content}>
          <Text style={styles.message}>
            {release ? `Version ${release.version} (build ${release.build_version}) is available.` : ""}
            {Application.nativeApplicationVersion ? `\nYou are using ${Application.nativeApplicationVersion} (build ${Application.nativeBuildVersion}).` : ""}
            {"\n\nUpdate Uno QR to get the latest features and improvements."}
          </Text>
          {storeError ? <Text style={styles.error}>{storeError}</Text> : null}
        </View>
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Identifies the actual installed binary so an app update resets the check deadline.
function getInstalledVersion(): string {
  return `${Platform.OS}:${Application.nativeApplicationVersion}:${Application.nativeBuildVersion}`;
};//func ends

// Stores the next daily check deadline with the current installed version and build.
async function postponeVersionCheck(): Promise<void> {
  const schedule: VersionCheckSchedule = {
    installedVersion: getInstalledVersion(),
    nextCheckAt: Date.now() + VERSION_CHECK_INTERVAL_MS
  };
  await setData({ key: CHECK_SCHEDULE_KEY, value: schedule });
};//func ends

/* ------------------ BREAK ------------------ */

// Compares numeric version segments so 1.0.10 sorts after 1.0.9.
function compareVersion(latest: string, current: string): number {
  if (typeof latest !== "string" || typeof current !== "string" || !/^\d+(\.\d+)*$/.test(latest) || !/^\d+(\.\d+)*$/.test(current)) return NaN;
  const left = latest.split(".");
  const right = current.split(".");
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = Number(left[index] || 0) - Number(right[index] || 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  };//for ends
  return 0;
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  content: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  message: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body1, lineHeight: 24, color: colors.mute.dark, marginBottom: spacing.sm },
  error: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, color: colors.error.main }
});
