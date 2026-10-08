import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { restoreUserQrCodes } from "@/helpers/qrcodes/QrSync";
import { colors } from "@/theme/tokens";
import GetError from "@/utils/general/Error";
import { redirect } from "@/utils/general/Redirect";

/* ------------------ BREAK ------------------ */

// Downloads saved account history before advancing to the next login step.
export default function SyncMyQrCodesScreen() {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Forces a full account download and cancels it if this page loses focus.
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setError(null);

    // Advances only after every downloaded page is committed to SQLite.
    const synchronize = async (): Promise<void> => {
      try {
        const completed = await restoreUserQrCodes({
          force: true,
          signal: controller.signal,
          onPage: async (): Promise<void> => {},
          onProgress: (): void => {}
        });
        if (controller.signal.aborted) return;
        if (!completed) throw new Error("Unable to sync your account on this device. Please try again.");
        redirect("replace", "/");
      } catch (failure: unknown) {
        if (!controller.signal.aborted) {
          setError(GetError({ error: failure, message: "Could not sync your saved history. Please try again.", errorType: "response" }).message);
        };//if ends
      };//try-catch ends
    };//func ends

    void synchronize();
    return () => controller.abort();
  }, [attempt]));

  //Default Return
  return (
    <View style={styles.root}>
      <PxPageLoader
        title={error ? "Could not sync your QR codes" : "Syncing your QR codes"}
        description="This may take a few minutes. Please keep the app open."
        error={error}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main },
});
