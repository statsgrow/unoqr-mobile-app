import { useState } from "react";
import * as Device from "expo-device";
import { Phone } from "lucide-react-native";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";

import { PxAlert } from "@/components/elements/PxAlert";
import { PxButton } from "@/components/elements/PxButton";
import { getPhoneNumber } from "@/helpers/scans/identifiers/PhoneNumber";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type PhoneScanProps = {
  value: string;
  createdAt?: string;
};

/* ------------------ BREAK ------------------ */

// Shows a scanned phone number and opens the dialer only when Call is selected.
export function PhoneScan({ value, createdAt }: PhoneScanProps) {
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const number = getPhoneNumber(value);

  // Hands the validated phone URI to the phone app after the user's tap.
  const handleCall = async (): Promise<void> => {
    if (!number || calling) return;
    // iOS simulators have no Phone app, so explain the limitation before opening a link.
    if (Platform.OS === "ios" && !Device.isDevice) {
      setError("Calling is unavailable in the iOS simulator. Test this button on a real iPhone.");
      return;
    };//if ends
    setCalling(true);
    setError(null);
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      setError("Could not open the phone app. Calling may be unavailable on this device or simulator.");
    } finally {
      setCalling(false);
    };//try-catch ends
  };//func ends

  //Default Return
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.heading}>
          <Phone size={26} strokeWidth={1.25} color={colors.neutral.main} />
          <Text style={styles.label}>Phone number</Text>
        </View>
        <Text selectable style={styles.number}>{number || value}</Text>
        {createdAt ? <Text style={styles.label}>{new Date(createdAt).toLocaleString()}</Text> : null}
      </View>
      {error ? <PxAlert color="error" messages={[error]} /> : null}
      <PxButton fullWidth color="secondary" disabled={!number || calling} loading={calling} icon={({ color, size }) => <Phone color={color} size={size} strokeWidth={1.25} />} onPress={() => void handleCall()}>
        Call
      </PxButton>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  number: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 }
});
