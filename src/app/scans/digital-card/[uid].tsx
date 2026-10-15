import { useEffect, useRef, useState } from "react";
import { File, Paths } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { Download, Share2 } from "lucide-react-native";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { fileDownload } from "@/components/files/FileDownload";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { getPublicDigitalCard, type PublicDigitalCard } from "@/helpers/digital_cards/api/publicCard";
import DigitalCardShareDialog from "@/helpers/digital_cards/dialogs/DigitalCardShareDialog";
import { createDigitalCardContact } from "@/helpers/digital_cards/contact";
import { getAllScans, getScanById } from "@/helpers/scans/db/getQueries";
import { waitForInitialScanSync } from "@/helpers/scans/db/insertQueries";
import { updateScan } from "@/helpers/scans/db/updateQueries";
import { getUnoQrDigitalCardUid } from "@/helpers/scans/identifiers/DigitalCard";
import { checkPendingScans } from "@/helpers/scans/scanSync";
import { getDigitalCardLayout, type DigitalCardLayoutData } from "@/libraries/digitalcards-layouts";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

// Opens a scanned public card with the same native profile layout used by full-screen previews.
export default function ScannedDigitalCardScreen() {
  const params = useLocalSearchParams<{ uid?: string | string[] }>();
  const uid = Array.isArray(params.uid) ? params.uid[0] : params.uid;
  const [card, setCard] = useState<PublicDigitalCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const downloadLock = useRef(false);

  // Cancels stale public reads when returning to scanning or opening a different card.
  useEffect(() => {
    const controller = new AbortController();
    setCard(null);
    setLoading(true);
    setError(null);
    if (!uid) {
      setError("This digital card link is invalid.");
      setLoading(false);
      return () => controller.abort();
    };//if ends
    void getPublicDigitalCard(uid, controller.signal).then((loaded) => {
      if (controller.signal.aborted) return;
      setCard(loaded);
      void saveDigitalCardScanTitle(loaded).catch((cause: unknown) => console.error("Unable to save digital-card scan title:", cause));
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "This digital card could not be loaded. Try again." }).message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [uid, retryKey]);

  // Returns to scan history or the camera without trapping a directly opened route.
  function goBack(): void {
    if (router.canGoBack()) router.back();
    else router.replace("/scans/scanner");
  };//func ends

  // Opens the public card's supported contact and social destinations.
  async function openLink(url: string): Promise<void> {
    if (!/^(https?:|tel:|mailto:)/i.test(url)) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Could not open link", "This link could not be opened on your device.");
    };//try-catch ends
  };//func ends

  // Reuses the existing vCard export and Files flow when the card owner permits contact saving.
  async function saveContact(): Promise<void> {
    if (!card || !card.allow_save_contact || downloadLock.current) return;
    downloadLock.current = true;
    setSavingContact(true);
    let file: File | null = null;
    try {
      const fileName = `unoqr-contact-${Date.now()}.vcf`;
      file = new File(Paths.cache, fileName);
      file.create();
      file.write(createDigitalCardContact({ details: card, cardSettings: { name: card.fullname }, settings: { content: card.url } }));
      const saved = await fileDownload({ uri: file.uri, fileName, mimeType: "text/vcard" });
      if (saved) Alert.alert("Contact saved", "The contact file was saved successfully.");
    } catch (cause: unknown) {
      Alert.alert("Could not save contact", GetError({ error: cause, message: "Please try again." }).message);
    } finally {
      if (file?.exists) file.delete();
      downloadLock.current = false;
      setSavingContact(false);
    };//try-catch ends
  };//func ends

  const Layout = card ? getDigitalCardLayout(card.layout) : null;
  const data: DigitalCardLayoutData | null = card ? {
    fullname: card.fullname, company: card.company, position: card.position,
    phones: card.phones, emails: card.emails, bio: card.bio, address: card.address,
    socialLinks: card.social_links, photo: card.photo_url ? { uri: card.photo_url } : null
  } : null;

  //Default Return
  return <>
    <GeneralLayout
      pullToRefreshEnabled={false}
      bodyStyle={styles.content}
      topView={<View style={styles.header}>
        <HeaderBackButton onPress={goBack} />
        <Text numberOfLines={1} style={styles.title}>{card?.fullname || "Digital card"}</Text>
        {card ? <Pressable accessibilityRole="button" accessibilityLabel="Share digital card" onPress={() => setShareOpen(true)} style={styles.shareButton}>
          <Share2 size={22} strokeWidth={1.25} color={colors.primary.main} />
        </Pressable> : null}
      </View>}
      bottomNav={card?.allow_save_contact ? <View>
        <Pressable accessibilityRole="button" disabled={savingContact} onPress={() => void saveContact()} style={[styles.action, { backgroundColor: card.primary_color }]}>
          {savingContact ? <PxCircularProgress size={20} color={colors.white.main} /> : <Download size={20} strokeWidth={1.25} color={colors.white.main} />}
          <Text style={styles.saveText}>{savingContact ? "Saving…" : "Save contact"}</Text>
        </Pressable>
      </View> : null}
    >
      {loading ? <View style={styles.message}><PxCircularProgress size={40} color={colors.secondary.main} /><Text style={styles.messageText}>Opening digital card…</Text></View> : null}
      {error ? <View style={styles.message}>
        <Text accessibilityRole="alert" style={styles.messageText}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => setRetryKey((key) => key + 1)} style={styles.retry}><Text style={styles.scanText}>Try again</Text></Pressable>
      </View> : null}
      {card && Layout && data ? <Layout data={data} primaryColor={card.primary_color} onOpenLink={(url) => void openLink(url)} /> : null}
    </GeneralLayout>
    {card ? <DigitalCardShareDialog publicLink={{ url: card.url, fullname: card.fullname }} open={shareOpen} setOpen={setShareOpen} /> : null}
  </>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Enriches matching history rows after initial sync so its response cannot overwrite the card title.
async function saveDigitalCardScanTitle(card: PublicDigitalCard): Promise<void> {
  const title = card.seo.title.trim() || card.fullname.trim();
  const scans = await getAllScans();
  for (const scan of scans) {
    if (scan.type !== "digital-card" || getUnoQrDigitalCardUid(scan.value) !== card.uid) continue;
    await waitForInitialScanSync(scan.id);
    const current = await getScanById(scan.id);
    if (!current || (current.metadata?.title === title && current.metadata?.digitalCardUid === card.uid)) continue;
    await updateScan(scan.id, {
      metadata: { ...current.metadata, title, description: card.seo.description || card.bio, digitalCardUid: card.uid },
      updated_at: new Date().toISOString(), sync_status: "pending"
    });
  };//for ends
  await checkPendingScans();
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white.main },
  title: { flex: 1, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.navigationTitle, color: colors.primary.main },
  shareButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  action: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radii.lg },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  scanText: { color: colors.secondary.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  message: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl },
  messageText: { textAlign: "center", color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  retry: { padding: spacing.sm }
});
