import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { File } from "expo-file-system";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { getQrCardImageKey, loadQrCardImage } from "@/helpers/digital_cards/files/qrCardFiles";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

export type DigitalCardQrPreviewHandle = { exportPng: () => Promise<string> };
type Props = { card: AppDigitalCardQr; draft?: boolean; fit?: boolean; exportRef?: Ref<DigitalCardQrPreviewHandle>; onReadyChange?: (ready: boolean) => void };

/* ------------------ BREAK ------------------ */

// Displays the locally stored Standard portrait and shares the same PNG without a WebView.
export default function DigitalCardQrPreview({ card, draft = false, fit = false, exportRef, onReadyChange }: Props) {
  const [image, setImage] = useState<{ uri: string; key: string } | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const imageFile = useRef<File | null>(null);
  const key = getQrCardImageKey(card);
  const { width } = useWindowDimensions();
  const [previewWidth, setPreviewWidth] = useState(Math.min(width - spacing.lg * 2, 400));
  const [availableHeight, setAvailableHeight] = useState(0);
  const cardWidth = fit ? Math.min(previewWidth, availableHeight / 1.5) : previewWidth;
  const ready = image?.key === key && loaded === `${key}-${retry}` && !error;

  // Debounces unsaved colour edits and cancels superseded renders before they replace the current portrait.
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setLoaded(null);
    imageFile.current = null;
    // Loads saved previews immediately and gives draft colour controls time to settle.
    const prepare = async (): Promise<void> => {
      try {
        const file = await loadQrCardImage({ card, draft, forceRefresh: retry > 0, signal: controller.signal });
        if (!controller.signal.aborted) {
          imageFile.current = file;
          setImage({ uri: file.uri, key });
        };//if ends
      } catch (cause: unknown) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Your QR card could not be loaded. Try again.");
      };//try-catch ends
    };//func ends
    const timer = setTimeout(() => void prepare(), draft ? 350 : 0);
    return () => { clearTimeout(timer); controller.abort(); };//return ends
  }, [key, card.userId, card.uid, draft, retry]);

  // Enables sharing only after the current local PNG has been displayed successfully.
  useEffect(() => { onReadyChange?.(Boolean(ready)); }, [ready, onReadyChange]);

  // Reads the stored PNG bytes so sharing reuses the same file as the preview.
  useImperativeHandle(exportRef, () => ({
    exportPng: async (): Promise<string> => {
      if (!ready || !imageFile.current) throw new Error("The QR card is not ready yet.");
      return imageFile.current.base64();
    }
  }), [ready]);

  //Default Return
  return <View onLayout={(event) => { setPreviewWidth(Math.min(event.nativeEvent.layout.width, 400)); setAvailableHeight(event.nativeEvent.layout.height); }} style={fit ? styles.viewport : styles.container}>
    <View style={[styles.root, { width: cardWidth, height: cardWidth * 1.5 }]}>
    {image?.key === key && !error ? <Image key={`${key}-${retry}`} source={{ uri: image.uri }} resizeMode="contain" accessibilityLabel={`${card.details.fullname}'s QR card`} style={styles.image} onLoad={() => setLoaded(`${key}-${retry}`)} onError={() => { setLoaded(null); setError("Your QR card image could not be displayed. Try again."); }} /> : null}
    {!ready ? <View style={styles.loading}>
      {error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable onPress={() => setRetry((value) => value + 1)} accessibilityRole="button" style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></> : <PxCircularProgress color={colors.secondary.main} size={40} />}
    </View> : null}
    </View>
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center" },
  viewport: { flex: 1, minHeight: 0, width: "100%", alignItems: "center", justifyContent: "center" },
  root: { width: "100%", maxWidth: 400, alignSelf: "center" },
  image: { width: "100%", height: "100%" },
  loading: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.cream.main },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  retry: { padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.secondary.main },
  retryText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
