import { useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { QrCode, Share2 } from "lucide-react-native";

import { PxModal } from "@/components/elements/PxModal";
import { fileDownload } from "@/components/files/FileDownload";
import { fileShare } from "@/components/files/FileSharing";
import DigitalCardQrPreview, { type DigitalCardQrPreviewHandle } from "@/helpers/digital_cards/components/DigitalCardQrPreview";
import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type Props = { card: AppDigitalCardQr; open: boolean; setOpen: (open: boolean) => void; onPublish: () => Promise<AppDigitalCardQr | null> };
type ShareAction = "share-image" | "save-image" | "share-link" | "copy-link";

/* ------------------ BREAK ------------------ */

// Previews a portrait QR card and shares its image or public link after publication succeeds.
export default function DigitalCardShareDialog({ card, open, setOpen, onPublish }: Props) {
  const [tab, setTab] = useState<"qr" | "social">("qr");
  const [previewReady, setPreviewReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const previewRef = useRef<DigitalCardQrPreviewHandle | null>(null);
  const locked = useRef(false);
  const dismissResolve = useRef<(() => void) | null>(null);
  // Waits for the iOS sheet to close before presenting another native share or Files sheet.
  const closeSheet = (): Promise<void> => {
    if (Platform.OS !== "ios") { setOpen(false); return Promise.resolve(); };//if ends
    return new Promise(resolve => { dismissResolve.current = resolve; setOpen(false); });
  };//func ends

  // Publishes first and only exposes a link or image after the server confirms the published card.
  const handleShare = async (action: ShareAction): Promise<void> => {
    if (locked.current || ((action === "share-image" || action === "save-image") && !previewReady)) return;
    locked.current = true;
    setBusy(true);
    setMessage(null);
    let file: File | null = null;
    try {
      // Capture before publishing refreshes the preview, preserving its complete photo and QR.
      let imageBase64: string | null = null;
      if (action === "share-image" || action === "save-image") {
        const preview = previewRef.current;
        if (!preview) throw new Error("The QR card is not ready yet.");
        imageBase64 = await preview.exportPng();
      };//if ends
      const published = card.cardSettings.status === "published" ? card : await onPublish();
      if (!published || published.cardSettings.status !== "published") throw new Error("Publish your card before sharing it.");
      const url = published.settings.content;
      if (action === "copy-link") {
        await Clipboard.setStringAsync(url);
        setMessage("Link copied.");
      } else if (action === "share-link") {
        await closeSheet();
        await Share.share(Platform.OS === "ios" ? { message: `${published.details.name}'s digital business card`, url } : { message: `${published.details.name}'s digital business card\n${url}` });
      } else {
        if (!imageBase64) throw new Error("The QR card image is not ready yet.");
        file = new File(Paths.cache, `unoqr-card-${published.uid}.png`);
        file.create({ overwrite: true });
        file.write(imageBase64, { encoding: "base64" });
        await closeSheet();
        if (action === "share-image") await fileShare({ uri: file.uri, mimeType: "image/png", uti: "public.png", dialogTitle: "Share my QR card" });
        else await fileDownload({ uri: file.uri, fileName: `unoqr-card-${published.uid}.png`, mimeType: "image/png" });
      };//if ends
    } catch (error: unknown) {
      setOpen(true);
      setMessage(error instanceof Error ? error.message : "Your card could not be shared. Try again.");
    } finally {
      if (file?.exists) file.delete();
      locked.current = false;
      setBusy(false);
    };//try-catch ends
  };//func ends

  const ready = !busy && (tab === "social" || previewReady);
  const needsPublish = card.cardSettings.status !== "published";

  //Default Return
  return <PxModal open={open} setOpen={value => { if (!busy) setOpen(value); }} name="Share digital card" height="full" onDismiss={() => { dismissResolve.current?.(); dismissResolve.current = null; }}>
    <View style={styles.body}>
      <View style={styles.tabs}>
        {(["qr", "social"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value === "qr" ? "My QR Card" : "Social"} accessibilityState={{ selected: tab === value }} disabled={busy} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.selectedTab]}><View>{value === "qr" ? <QrCode size={24} strokeWidth={1.25} color={tab === value ? colors.white.main : colors.black.main} /> : <Share2 size={24} strokeWidth={1.25} color={tab === value ? colors.white.main : colors.black.main} />}</View></Pressable>)}
      </View>
      {open ? <View style={tab === "qr" ? styles.portrait : styles.hidden}>
        <DigitalCardQrPreview card={card} exportRef={previewRef} onReadyChange={setPreviewReady} />
      </View> : null}
      {tab === "social" ? <View style={styles.social}><Text style={styles.title}>Share your digital card</Text><Text selectable style={styles.link}>{card.settings.content}</Text><Text style={styles.hint}>Send one link with your contact details, business and social profiles.</Text></View> : null}
      {needsPublish ? <Text style={styles.hint}>Your card is unpublished. Sharing will publish it first.</Text> : null}
      {busy || (tab === "qr" && !previewReady) ? <ActivityIndicator color={colors.secondary.main} /> : null}
      {message ? <Text accessibilityRole="alert" style={styles.hint}>{message}</Text> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={!ready} onPress={() => void handleShare(tab === "qr" ? "share-image" : "share-link")} style={[styles.action, !ready && styles.disabled]}><Text style={styles.actionText}>{needsPublish ? "Publish & Share" : tab === "qr" ? "Share Image" : "Share Link"}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={!ready} onPress={() => void handleShare(tab === "qr" ? "save-image" : "copy-link")} style={[styles.secondaryAction, !ready && styles.disabled]}><Text style={styles.secondaryText}>{needsPublish ? tab === "qr" ? "Publish & Save Image" : "Publish & Copy Link" : tab === "qr" ? "Save Image" : "Copy Link"}</Text></Pressable>
      </View>
    </View>
  </PxModal>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { padding: spacing.md, gap: spacing.md },
  tabs: { flexDirection: "row", alignSelf: "center", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border.main, backgroundColor: colors.white.main, padding: spacing.xxs },
  tab: { minWidth: 64, minHeight: 48, justifyContent: "center", padding: spacing.sm, alignItems: "center", borderRadius: radii.xl },
  selectedTab: { backgroundColor: colors.black.main },
  portrait: { width: "100%", maxWidth: 280, alignSelf: "center" },
  hidden: { position: "absolute", opacity: 0, pointerEvents: "none" },
  social: { paddingVertical: spacing.xl, gap: spacing.md },
  title: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6, color: colors.primary.main },
  link: { padding: spacing.md, backgroundColor: colors.cream.main, borderRadius: radii.md, color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  actions: { gap: spacing.sm },
  action: { minHeight: 48, padding: spacing.md, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondary.main },
  secondaryAction: { minHeight: 48, padding: spacing.md, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.main },
  actionText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  secondaryText: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  disabled: { opacity: 0.5 }
});
