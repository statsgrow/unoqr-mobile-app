import { CloudAlert, CloudCheck, Smartphone } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { PxDialog } from "@/components/elements/PxDialog";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type SaveStatusDialogProps = {
  visible: boolean;
  onClose: () => void;
  isSavedOnDevice: boolean;
  isSavedInCloud: boolean;
};

/* ------------------ BREAK ------------------ */

// Shows whether the latest QR changes are saved on the device and backed up in the cloud.
export default function SaveStatusDialog({ visible, onClose, isSavedOnDevice, isSavedInCloud }: SaveStatusDialogProps) {
  //Default Return
  return (
    <PxDialog open={visible} setOpen={(open) => { if (!open) onClose(); }} title="Save status">
      <View style={styles.content} accessibilityLiveRegion="polite">
        <View style={styles.row}>
          <Smartphone color={colors.mute.main} size={24} strokeWidth={1.5} />
          <View style={styles.copy}>
            <Text style={styles.label}>On this device</Text>
            <Text style={styles.description}>{isSavedOnDevice ? "Your latest changes are saved." : "Your latest changes are not saved yet."}</Text>
          </View>
          <Text style={[styles.status, { color: isSavedOnDevice ? colors.success.dark : colors.warning.dark }]}>{isSavedOnDevice ? "Saved" : "Pending"}</Text>
        </View>
        <View style={styles.row}>
          {isSavedInCloud ? <CloudCheck color={colors.success.dark} size={24} strokeWidth={1.5} /> : <CloudAlert color={colors.warning.dark} size={24} strokeWidth={1.5} />}
          <View style={styles.copy}>
            <Text style={styles.label}>In the cloud</Text>
            <Text style={styles.description}>{isSavedInCloud ? "Your latest changes are backed up." : isSavedOnDevice ? "Your changes are saved here and waiting to upload." : "Waiting for your changes to save on this device."}</Text>
          </View>
          <Text style={[styles.status, { color: isSavedInCloud ? colors.success.dark : colors.warning.dark }]}>{isSavedInCloud ? "Saved" : "Pending"}</Text>
        </View>
      </View>
    </PxDialog>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.cream.main },
  copy: { flex: 1, gap: spacing.xxs },
  label: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  status: { fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption }
});
