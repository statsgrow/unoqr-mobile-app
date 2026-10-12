import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { File, Paths } from "expo-file-system";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import WebView from "react-native-webview";

import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { frontendSettings, userTokenSettings } from "@/settings";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { getUserTokens } from "@/utils/auth/AuthTokens";

/* ------------------ BREAK ------------------ */

export type DigitalCardQrPreviewHandle = { exportPng: () => Promise<string> };
type Props = { card: AppDigitalCardQr; exportRef?: Ref<DigitalCardQrPreviewHandle>; onReadyChange?: (ready: boolean) => void };
type ImageRequest = { id: string; resolve: (value: string) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> };
type PreviewSource = { uri: string; headers: Record<string, string> };

/* ------------------ BREAK ------------------ */

// Shows the authenticated frontend QR card with live local drafts and no download controls.
export default function DigitalCardQrPreview({ card, exportRef, onReadyChange }: Props) {
  const webView = useRef<WebView | null>(null);
  const [source, setSource] = useState<PreviewSource | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const imageRequest = useRef<ImageRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const { width } = useWindowDimensions();
  const [previewWidth, setPreviewWidth] = useState(Math.min(width - spacing.lg * 2, 400));
  const photo = card.details.profilePicture?.url || card.details.profilePicture?.uri || null;
  const photoType = card.details.profilePicture?.type;

  // Embeds the current profile photo and sends authentication only in the request header.
  useEffect(() => {
    let active = true;
    setSource(null);
    setBridgeReady(false);
    setCanvasReady(false);
    setError(null);
    const preparePreview = async (): Promise<void> => {
      let downloaded: File | null = null;
      try {
        const { accessToken } = await getUserTokens();
        if (!accessToken) throw new Error("Sign in to preview your QR card.");
        let image: string | null = null;
        if (photo) {
          const file = /^https?:/i.test(photo)
            ? downloaded = await File.downloadFileAsync(photo, new File(Paths.cache, `unoqr-qr-preview-${Date.now()}.jpg`))
            : new File(photo);
          const mime = photoType?.startsWith("image/") ? photoType : "image/jpeg";
          image = `data:${mime};base64,${await file.base64()}`;
        };//if ends
        const url = frontendSettings.getFrontendUrl({ path: `/dc/${card.uid}/qrcard` });
        url.searchParams.set("preview", "true");
        if (active) {
          setPhotoData(image);
          setSource({ uri: url.href, headers: { [userTokenSettings.headerTokens.accessToken.name]: accessToken } });
        };//if ends
      } catch (cause: unknown) {
        if (active) setError(cause instanceof Error ? cause.message : "Your QR card preview could not be loaded.");
      } finally {
        if (downloaded?.exists) downloaded.delete();
      };//try-catch ends
    };//func ends
    void preparePreview();
    return () => { active = false; };
  }, [card.uid, photo, photoType, retry]);

  const { dot, eye, frame, styles: qrStyles } = card.settings;
  const payload = JSON.stringify({ type: "digital-card-qr-preview", card: {
    uid: card.uid, url: `https://unoqr.com/dc/${card.uid}`, name: card.details.name,
    position: card.details.position, company: card.details.company, primary_color: card.primaryColor,
    qr_design: { dot, eye, frame, styles: qrStyles }, photo_data_url: photoData, photo_expected: Boolean(photo)
  } });

  // Updates the same canvas as the browser downloads without saving or publishing the draft.
  useEffect(() => {
    if (!bridgeReady) return;
    setCanvasReady(false);
    webView.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} })); true;`);
  }, [bridgeReady, payload]);

  // Reports when the frontend canvas is complete so native image actions stay disabled until ready.
  useEffect(() => { onReadyChange?.(canvasReady && !error); }, [canvasReady, error, onReadyChange]);

  // Releases a pending export if its preview is dismissed.
  useEffect(() => () => {
    const pending = imageRequest.current;
    if (pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("The QR card preview was closed."));
      imageRequest.current = null;
    };//if ends
  }, []);

  // Requests the exact PNG from the existing frontend canvas for native sharing and saving.
  useImperativeHandle(exportRef, () => ({
    exportPng: () => new Promise<string>((resolve, reject) => {
      if (!canvasReady || !webView.current || imageRequest.current) {
        reject(new Error("The QR card is not ready yet."));
        return;
      };//if ends
      const id = `${Date.now()}`;
      const timeout = setTimeout(() => {
        imageRequest.current = null;
        reject(new Error("The QR card image could not be created. Please try again."));
      }, 15000);
      imageRequest.current = { id, resolve, reject, timeout };
      const request = JSON.stringify({ type: "digital-card-qr-export", uid: card.uid, requestId: id });
      webView.current.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(request)} })); true;`);
    })
  }), [canvasReady, card.uid]);

  //Default Return
  return <View onLayout={event => setPreviewWidth(Math.min(event.nativeEvent.layout.width, 400))} style={[styles.root, { height: previewWidth * 1.5 }]}>
    {source && !error ? <WebView
      key={retry} ref={webView} source={source} style={styles.webView}
      javaScriptEnabled originWhitelist={["http://*", "https://*"]} mixedContentMode="never"
      cacheEnabled={false} incognito scrollEnabled={false} allowFileAccess={false}
      allowUniversalAccessFromFileURLs={false} javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={request => request.url === source.uri || request.url === "about:blank"}
      onMessage={event => {
        try {
          if (new URL(event.nativeEvent.url).origin !== new URL(source.uri).origin) return;
          const message = JSON.parse(event.nativeEvent.data) as { type?: string; uid?: string; ready?: boolean; requestId?: string; data?: string; error?: string };
          if (message.uid !== card.uid) return;
          if (message.type === "digital-card-qr-rendered") setCanvasReady(message.ready === true);
          if (message.type === "digital-card-qr-image" && imageRequest.current && message.requestId === imageRequest.current.id) {
            const pending = imageRequest.current!;
            clearTimeout(pending.timeout);
            imageRequest.current = null;
            if (typeof message.data === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(message.data)) pending.resolve(message.data.slice("data:image/png;base64,".length));
            else pending.reject(new Error(message.error || "The QR card image could not be created."));
          };//if ends
          if (message.type === "digital-card-qr-preview-ready" && message.uid === card.uid) setBridgeReady(true);
        } catch { /* Ignore unrelated preview messages. */ }
      }}
      onError={() => { setBridgeReady(false); setError("Your QR card preview could not be loaded. Try again."); }}
      onHttpError={event => { if (event.nativeEvent.url === source.uri) setError("Your QR card preview could not be loaded. Try again."); }}
      startInLoadingState renderLoading={() => <View style={styles.loading}><ActivityIndicator color={colors.secondary.main} /></View>}
    /> : <View style={styles.loading}>
      {error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable onPress={() => setRetry(value => value + 1)} accessibilityRole="button" style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></> : <ActivityIndicator color={colors.secondary.main} />}
    </View>}
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { width: "100%", maxWidth: 400, alignSelf: "center", overflow: "hidden", borderRadius: radii.xl, backgroundColor: colors.cream.main },
  webView: { flex: 1, backgroundColor: colors.cream.main },
  loading: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.cream.main },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  retry: { padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.secondary.main },
  retryText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
