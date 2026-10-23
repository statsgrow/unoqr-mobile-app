import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { PxSkeleton } from "@/components/elements/PxSkeleton";
import { loadQrCardImage } from "@/helpers/digital_cards/files/qrCardFiles";
import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { layoutSettings, type StandardQrCardData } from "@/libraries/qrcards-layouts/standard/dataJson";
import { getSvg } from "@/libraries/qrcards-layouts/standard/renderSvg";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ TYPES ------------------ */

export type DigitalCardQrPreviewHandle = { exportPng: () => Promise<string> };//export ends
type Props = { card: AppDigitalCardQr; draft?: boolean; fit?: boolean; exportRef?: Ref<DigitalCardQrPreviewHandle>; onReadyChange?: (ready: boolean) => void };
type RenderedSvg = { xml: string; key: string; retry: number; requestId: number };

/* ------------------ BREAK ------------------ */

// Renders the Standard SVG locally from current card/form values, loading saved PNGs only for exports.
export default function DigitalCardQrPreview({ card, draft = false, fit = false, exportRef, onReadyChange }: Props) {
  const [renderedSvg, setRenderedSvg] = useState<RenderedSvg | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const latestRequest = useRef(0);
  const data: StandardQrCardData = {
    url: card.settings.content,
    name: card.details.fullname,
    position: card.details.position,
    company: card.details.company,
    primaryColor: card.primaryColor,
    photoUrl: card.details.profilePicture?.url || card.details.profilePicture?.uri || null,
    qrData: { dot: card.settings.dot, eye: card.settings.eye, frame: card.settings.frame, styles: card.settings.styles },
  };
  const key = JSON.stringify(data);
  const { width } = useWindowDimensions();
  const [previewWidth, setPreviewWidth] = useState(Math.min(width - spacing.lg * 2, 400));
  const [availableHeight, setAvailableHeight] = useState(0);
  const aspectRatio = layoutSettings.height / layoutSettings.width;
  const cardWidth = fit ? Math.min(previewWidth, availableHeight / aspectRatio) : previewWidth;
  const ready = renderedSvg?.key === key && renderedSvg.retry === retry && !error;

  // Snapshots the current RHF design and discards older local renders without waiting for modal dismissal.
  useEffect(() => {
    const requestId = ++latestRequest.current;
    setError(null);
    const snapshot = JSON.parse(key) as StandardQrCardData;
    void getSvg({ data: snapshot }).then((xml) => {
      if (latestRequest.current === requestId) setRenderedSvg({ xml, key, retry, requestId });//if ends
    }).catch((cause: unknown) => {
      if (latestRequest.current === requestId) setError(cause instanceof Error ? cause.message : "Your QR card could not be rendered. Try again.");//if ends
    });
    return () => { latestRequest.current++; };//return ends
  }, [key, retry]);

  // Enables saved-card sharing only after the current local vector preview is ready.
  useEffect(() => { onReadyChange?.(Boolean(ready)); }, [ready, onReadyChange]);

  // Reuses the frontend's saved PNG on an explicit export action without rasterizing the native preview.
  useImperativeHandle(exportRef, () => ({
    exportPng: async (): Promise<string> => {
      if (!ready || draft) throw new Error("Save your QR card and wait for its preview before sharing.");//if ends
      const file = await loadQrCardImage({ card, draft: false, signal: new AbortController().signal });
      return file.base64();
    },
  }), [ready, card, draft]);

  //Default Return
  return <View onLayout={(event) => { setPreviewWidth(Math.min(event.nativeEvent.layout.width, 400)); setAvailableHeight(event.nativeEvent.layout.height); }} style={fit ? styles.viewport : styles.container}>
    <View style={[styles.root, { width: cardWidth, height: cardWidth * aspectRatio }]}>
      {ready && renderedSvg ? <SvgXml key={`${renderedSvg.key}-${renderedSvg.retry}`} xml={renderedSvg.xml} width="100%" height="100%" accessibilityLabel={`${data.name}'s QR card`} accessibilityRole="image"
        onError={() => { if (renderedSvg.requestId === latestRequest.current) setError("Your QR card could not be displayed. Try again."); }}
      /> : error ? <View style={styles.loading}>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <Pressable onPress={() => setRetry((value) => value + 1)} accessibilityRole="button" style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
      </View> : <PxSkeleton width="100%" height="100%" />}
    </View>
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center" },
  viewport: { flex: 1, minHeight: 0, width: "100%", alignItems: "center", justifyContent: "center" },
  root: { width: "100%", maxWidth: 400, alignSelf: "center" },
  loading: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.cream.main },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  retry: { padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.secondary.main },
  retryText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
});
