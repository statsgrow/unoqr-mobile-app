import { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import { Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CheckCircle2, ChevronRight, Copy, Download, QrCode, Share2 } from "lucide-react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { PxModal } from "@/components/elements/PxModal";
import { fileDownload } from "@/components/files/FileDownload";
import { fileShare } from "@/components/files/FileSharing";
import DigitalCardQrPreview, { type DigitalCardQrPreviewHandle } from "@/helpers/digital_cards/components/DigitalCardQrPreview";
import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type Props = { open: boolean; setOpen: (open: boolean) => void; initialTab?: "qr" | "social" } & (
  | { card: AppDigitalCardQr; onPublish: () => Promise<AppDigitalCardQr | null>; publicLink?: never }
  | { publicLink: { url: string; fullname: string }; card?: never; onPublish?: never }
);
type ShareAction = "share-image" | "save-image" | "share-link" | "copy-link";

/* ------------------ BREAK ------------------ */

// Shares an owner QR card or an already published scanned card through the same modal.
export default function DigitalCardShareDialog({ card, publicLink, open, setOpen, onPublish, initialTab }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const [tab, setTab] = useState<"qr" | "social">("qr");
  const activeTab = publicLink ? "social" : tab;
  const [previewReady, setPreviewReady] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [downloadLocation, setDownloadLocation] = useState<"Downloads" | "Files" | null>(null);
  const imageRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const previewRef = useRef<DigitalCardQrPreviewHandle | null>(null);
  const locked = useRef(false);
  const dismissResolve = useRef<(() => void) | null>(null);

  // Opens the sharing option selected by the Home card action.
  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);

  // Waits for the iOS sheet to close before presenting another native share or Files sheet.
  const closeSheet = (): Promise<void> => {
    // Closes the currently visible sheet before presenting the next native modal.
    const close = (): void => { if (optionsOpen) setOptionsOpen(false); else setOpen(false); };//func ends
    if (Platform.OS !== "ios") { close(); return Promise.resolve(); };//if ends
    return new Promise(resolve => { dismissResolve.current = resolve; close(); });
  };//func ends

  // Captures the ready QR card before closing its preview and opening the image options sheet.
  const openQrOptions = async (): Promise<void> => {
    if (locked.current || !previewReady || !previewRef.current) return;
    locked.current = true;
    setBusy(true);
    setMessage(null);
    setDownloadLocation(null);
    try {
      imageRef.current = await previewRef.current.exportPng();
      await closeSheet();
      setOptionsOpen(true);
    } catch (error: unknown) {
      setOpen(true);
      setMessage(error instanceof Error ? error.message : "Your QR card could not be prepared. Try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    };//try-catch ends
  };//func ends

  // Shares public links directly and publishes owner cards before exposing their link or image.
  const handleShare = async (action: ShareAction): Promise<void> => {
    if (locked.current || ((action === "share-image" || action === "save-image") && !imageRef.current)) return;
    locked.current = true;
    setBusy(true);
    setMessage(null);
    let file: File | null = null;
    try {
      // Reuses the captured image after the original preview sheet has closed.
      const imageBase64 = imageRef.current;
      const published = card ? (card.cardSettings.status === "published" ? card : await onPublish()) : null;
      if (!publicLink && (!published || published.cardSettings.status !== "published")) throw new Error("Publish your card before sharing it.");
      const url = publicLink?.url ?? published!.settings.content;
      const fullname = publicLink?.fullname ?? published!.details.fullname;
      if (action === "copy-link") {
        await Clipboard.setStringAsync(url);
      } else if (action === "share-link") {
        await closeSheet();
        await Share.share(Platform.OS === "ios" ? { message: `${fullname}'s digital business card`, url } : { message: `${fullname}'s digital business card\n${url}` });
      } else {
        if (!imageBase64 || !published) throw new Error("The QR card image is not ready yet.");
        file = new File(Paths.cache, `unoqr-card-${published.uid}.png`);
        file.create({ overwrite: true });
        file.write(imageBase64, { encoding: "base64" });
        await closeSheet();
        if (action === "share-image") await fileShare({ uri: file.uri, mimeType: "image/png", uti: "public.png", dialogTitle: "Share my QR card" });
        else {
          const downloaded = await fileDownload({ uri: file.uri, fileName: `unoqr-card-${published.uid}.png`, mimeType: "image/png" });
          setDownloadLocation(downloaded?.location ?? null);
          setOptionsOpen(true);
        };//if ends
      };//if ends
    } catch (error: unknown) {
      if (action === "share-image" || action === "save-image") setOptionsOpen(true);
      else setOpen(true);
      setMessage(error instanceof Error ? error.message : "Your card could not be shared. Try again.");
    } finally {
      if (file?.exists) file.delete();
      locked.current = false;
      setBusy(false);
    };//try-catch ends
  };//func ends

  const ready = !busy && (activeTab === "social" || previewReady);
  const needsPublish = card != null && card.cardSettings.status !== "published";

  //Default Return
  return (
    <>
      <PxModal
        open={open}
        setOpen={value => { if (!busy) setOpen(value); }}
        name="Share digital card"
        height="auto"
        maxHeight={windowHeight}
        onDismiss={() => { dismissResolve.current?.(); dismissResolve.current = null; }}
        footerAction={activeTab === "qr" ? (
          <View style={styles.actions}>
            <PxButton mode="contained" color="primary" fullWidth disabled={!ready} onPress={() => void openQrOptions()}>Share QR Card</PxButton>
          </View>
        ) : (
          <View>
            <View style={styles.linkMenu}>
              {(["copy-link", "share-link"] as const).map((action, index) => (
                <Pressable key={action} accessibilityRole="button" disabled={!ready} onPress={() => void handleShare(action)} style={({ pressed }) => [styles.linkRow, (pressed || !ready) && styles.disabled]}>
                  <View style={styles.linkIcon}>{action === "copy-link" ? <Copy size={21} strokeWidth={1.25} color={colors.primary.light} /> : <Share2 size={21} strokeWidth={1.25} color={colors.primary.light} />}</View>
                  <View style={[styles.linkCopy, index === 0 && styles.linkDivider]}>
                    <View style={styles.linkText}>
                      <Text style={styles.linkLabel}>{action === "copy-link" ? "Copy Link" : "Share Link"}</Text>
                      <Text style={styles.linkDescription}>{action === "copy-link" ? (publicLink ? "Copy this card link to clipboard" : "Copy your card link to clipboard") : (publicLink ? "Send this card link to others" : "Send your card link to others")}</Text>
                    </View>
                    <ChevronRight size={22} strokeWidth={1.25} color={colors.mute.light} />
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={styles.linkBottomSpace} />
          </View>
        )}
      >
        {!publicLink || busy || message ? <View style={styles.body}>
          {!publicLink ? <View style={styles.tabs}>
            {(["qr", "social"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value === "qr" ? "My QR Card" : "Social"} accessibilityState={{ selected: tab === value }} disabled={busy} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.selectedTab]}><View>{value === "qr" ? <QrCode size={24} strokeWidth={1.25} color={tab === value ? colors.white.main : colors.black.main} /> : <Share2 size={24} strokeWidth={1.25} color={tab === value ? colors.white.main : colors.black.main} />}</View></Pressable>)}
          </View> : null}
          {open && card ? <View style={activeTab === "qr" ? styles.portrait : styles.hidden}>
            <DigitalCardQrPreview card={card} exportRef={previewRef} onReadyChange={setPreviewReady} />
          </View> : null}
          {needsPublish ? <Text style={styles.hint}>Your card is unpublished. Sharing will publish it first.</Text> : null}
          {busy ? <PxCircularProgress color={colors.secondary.main} /> : null}
          {message ? <Text accessibilityRole="alert" style={styles.hint}>{message}</Text> : null}
        </View> : null}
      </PxModal>
      <PxModal
        open={optionsOpen}
        setOpen={value => { if (!busy) setOptionsOpen(value); }}
        name={downloadLocation ? "Download complete" : "Share QR Card"}
        height="auto"
        onDismiss={() => { dismissResolve.current?.(); dismissResolve.current = null; }}
        footerAction={(
          <View style={styles.actions}>
            {downloadLocation ? (
              <Pressable accessibilityRole="button" onPress={() => setOptionsOpen(false)} style={styles.action}>
                <Text style={styles.actionText}>Done</Text>
              </Pressable>
            ) : (
              <>
                <PxButton mode="contained" color="primary" fullWidth disabled={busy} onPress={() => void handleShare("share-image")} icon={({ color, size }) => <Share2 size={size} strokeWidth={1.25} color={color} />}>Share Image</PxButton>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => void handleShare("save-image")} style={[styles.secondaryAction, busy && styles.disabled]}>
                  <Download size={20} strokeWidth={1.25} color={colors.primary.main} />
                  <Text style={styles.secondaryText}>Download Image</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      >
        <View style={styles.body}>
          {downloadLocation ? <View style={styles.success}>
            <CheckCircle2 size={48} strokeWidth={1.25} color={colors.success.main} />
            <Text accessibilityRole="header" style={styles.title}>QR card downloaded</Text>
            <Text style={styles.hint}>{downloadLocation === "Downloads" ? "Your QR card image was saved to Downloads." : "Your QR card image was saved to your chosen Files folder."}</Text>
          </View> : <>
            <Text style={styles.hint}>Share your QR card image or download a copy to your device.</Text>
            {needsPublish ? <Text style={styles.hint}>Your card will be published before sharing or downloading.</Text> : null}
            {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
            {busy ? <PxCircularProgress color={colors.secondary.main} /> : null}
          </>}
        </View>
      </PxModal>
    </>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { padding: spacing.md, gap: spacing.md },
  tabs: { flexDirection: "row", alignSelf: "center", borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border.main, backgroundColor: colors.white.main, padding: spacing.xxs },
  tab: { minWidth: 64, minHeight: 48, justifyContent: "center", padding: spacing.sm, alignItems: "center", borderRadius: radii.xl },
  selectedTab: { backgroundColor: colors.black.main },
  portrait: { width: "100%", maxWidth: 280, alignSelf: "center" },
  hidden: { position: "absolute", opacity: 0, pointerEvents: "none" },
  title: { fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6, color: colors.primary.main },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  success: { alignItems: "center", gap: spacing.md },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  linkBottomSpace: { height: 72 },
  linkMenu: { borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main, overflow: "hidden" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.md },
  linkIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.cream.main },
  linkCopy: { minWidth: 0, flex: 1, minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingRight: spacing.md },
  linkDivider: { borderBottomWidth: 1, borderBottomColor: colors.border.light },
  linkText: { minWidth: 0, flex: 1 },
  linkLabel: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  linkDescription: { marginTop: spacing.xxs, color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  actions: { gap: spacing.sm },
  action: { minHeight: 48, padding: spacing.md, borderRadius: radii.lg, flexDirection: "row", justifyContent: "center", gap: spacing.sm, alignItems: "center", backgroundColor: colors.secondary.main },
  secondaryAction: { minHeight: 48, padding: spacing.md, borderRadius: radii.lg, flexDirection: "row", justifyContent: "center", gap: spacing.sm, alignItems: "center", borderWidth: 1, borderColor: colors.border.main },
  actionText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  secondaryText: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  disabled: { opacity: 0.5 }
});
