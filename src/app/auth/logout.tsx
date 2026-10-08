import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { colors } from "@/theme/tokens";
import { processUserLogout } from "@/utils/auth/AuthUser";
import GetError from "@/utils/general/Error";
import { redirect } from "@/utils/general/Redirect";

/* ------------------ BREAK ------------------ */

// Finishes installation logout and local cleanup before returning to the home page.
export default function LogoutScreen() {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const logoutPromise = useRef<Promise<void> | null>(null);
  const installationConfirmed = useRef(false);

  // Shares an in-flight logout and allows another attempt after a reported failure.
  useEffect(() => {
    let active = true;
    setError(null);
    const operation = logoutPromise.current ?? processUserLogout({
      installationConfirmed: installationConfirmed.current,
      onInstallationConfirmed: () => { installationConfirmed.current = true; }
    });
    logoutPromise.current = operation;
    void operation.then(() => {
      if (active) redirect("replace", "/");
    }).catch((failure: unknown) => {
      if (active) setError(GetError({ error: failure, message: "Could not log out. Please try again.", errorType: "response" }).message);
    }).finally(() => {
      if (logoutPromise.current === operation) logoutPromise.current = null;
    });

    return () => { active = false; };//return ends
  }, [attempt]);

  //Default Return
  return (
    <View style={styles.root}>
      <PxPageLoader
        title={error ? "Could not log out" : "Logging you out"}
        description="Clearing your local data. Please keep the app open."
        error={error}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main }
});
