import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react-native";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { PxModal } from "@/components/elements/PxModal";
import { getFile } from "@/components/files/FileStorage";
import { pickQrLogo } from "@/helpers/qrcodes/create/PickLogo";
import type { QrUserLogo } from "@/helpers/qrcodes/modify/logo";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type LogoDialogProps = {
  visible: boolean;
  onClose: () => void;
  logo: QrUserLogo | null;
  onChangeLogo: (logo: QrUserLogo | null) => void;
};

/* ------------------ BREAK ------------------ */

// Lets users add, replace, or remove an image from the center of their QR.
export default function LogoDialog({ visible, onClose, logo, onChangeLogo }: LogoDialogProps) {
  const [isPicking, setIsPicking] = useState(false);

  // Opens the image library and keeps the current logo if selection is canceled.
  async function handlePick() {
    if (isPicking) return;
    setIsPicking(true);
    try {
      const selected = await pickQrLogo();
      if (selected) onChangeLogo(selected);
    } catch (error: unknown) {
      Alert.alert("Could not add logo", error instanceof Error ? error.message : "Please try another image.");
    } finally {
      setIsPicking(false);
    };//try-catch ends
  };//func ends

  //Default Return
  return (
    <PxModal visible={visible} onRequestClose={onClose} name="Logo" height="auto" maxHeight={500}>
      <View style={styles.content}>
        <View style={styles.preview}>
          {logo ? <Image accessibilityLabel="Selected QR logo" source={{ uri: logo.dataUrl ?? getFile(logo.uri).uri }} resizeMode="contain" style={styles.image} />
            : <ImagePlus color={colors.mute.main} size={48} strokeWidth={1.5} />}
        </View>
        <Text style={styles.description}>Add an image to the center of your QR code.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isPicking }}
          disabled={isPicking}
          onPress={() => void handlePick()}
          style={styles.uploadButton}
        >
          <ImagePlus color={colors.white.main} size={20} />
          <Text style={styles.uploadText}>{isPicking ? "Opening photos..." : logo ? "Replace logo" : "Upload logo"}</Text>
        </Pressable>
        {logo ? (
          <Pressable accessibilityRole="button" onPress={() => onChangeLogo(null)} style={styles.removeButton}>
            <Trash2 color={colors.secondary.main} size={18} />
            <Text style={styles.removeText}>Remove logo</Text>
          </Pressable>
        ) : null}
      </View>
    </PxModal>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  preview: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.cream.main
  },
  image: { width: 88, height: 88 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  uploadButton: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.main
  },
  uploadText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  removeButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: spacing.sm },
  removeText: { color: colors.secondary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 }
});
