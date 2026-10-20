import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { restoreUserDigitalCards } from "@/helpers/digital_cards/utils/SyncDigitalCards";
import { colors } from "@/theme/tokens";
import GetError from "@/utils/general/Error";
import { redirect } from "@/utils/general/Redirect";

/* ------------------ BREAK ------------------ */

// Restores existing digital cards and their QR files before opening Home after login.
export default function SyncMyDigitalCardsScreen() {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Forces a full account download and cancels it if this page loses focus.
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setError(null);

    // Advances only after every owned card is committed to SQLite and its QR files are stored.
    const synchronize = async (): Promise<void> => {
      try {
        const completed = await restoreUserDigitalCards({
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        if (!completed) throw new Error("Unable to sync your account on this device. Please try again.");
        redirect("replace", "/");
      } catch (failure: unknown) {
        if (!controller.signal.aborted) {
          setError(GetError({ error: failure, message: "Could not sync your digital cards. Please try again.", errorType: "response" }).message);
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
        title={error ? "Could not sync your digital cards" : "Syncing your digital cards"}
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
