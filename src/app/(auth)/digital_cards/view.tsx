import { useEffect, useRef, useState } from "react";
import { File, Paths } from "expo-file-system";
import { Redirect, useLocalSearchParams } from "expo-router";
import { ChartNoAxesCombined, CheckCircle2, QrCode, Share2, UserRound, type LucideIcon } from "lucide-react-native";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { PxModal } from "@/components/elements/PxModal";
import { fileDownload } from "@/components/files/FileDownload";
import { getDigitalCard, restoreDigitalCard, saveDigitalCard } from "@/helpers/digital_cards/api/cards";
import DigitalCardAnalytics from "@/helpers/digital_cards/analytics/DigitalCardAnalytics";
import DigitalCardQrPreview from "@/helpers/digital_cards/components/DigitalCardQrPreview";
import { createDigitalCardContact } from "@/helpers/digital_cards/contact";
import DigitalCardContacts from "@/helpers/digital_cards/contacts/DigitalCardContacts";
import UserRoundGroup from "@/helpers/digital_cards/contacts/UserRoundGroup";
import DigitalCardShareDialog from "@/helpers/digital_cards/dialogs/DigitalCardShareDialog";
import { getDigitalCardLayout, getDigitalCardLayoutData } from "@/libraries/digitalcards-layouts";
import { CardFooter } from "@/libraries/digitalcards-layouts/native/shared";
import { createDigitalCard, type AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { validateDigitalCard } from "@/helpers/digital_cards/validations";
import { QR_DEFAULTS } from "@/helpers/qrcodes/create/QrCreateScreen";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

type DigitalCardViewProps = { embedded?: boolean; savedCard?: AppDigitalCardQr; onPublished?: (card: AppDigitalCardQr) => void; onCardRefreshed?: (card: AppDigitalCardQr) => void };
type PreviewSide = "profile" | "qr" | "analytics" | "contacts";
type PreviewTab = { value: PreviewSide; label: string; Icon: LucideIcon };

/* ------------------ BREAK ------------------ */

// Renders the shared native business-card layout immediately from saved or cached values.
export default function DigitalCardViewScreen({ embedded = false, savedCard, onPublished, onCardRefreshed }: DigitalCardViewProps = {}) {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [card, setCard] = useState<AppDigitalCardQr | null>(savedCard ?? null);
  const [side, setSide] = useState<PreviewSide>(params.tab === "contacts" ? "contacts" : "profile");
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [downloadLocation, setDownloadLocation] = useState<"Downloads" | "Files" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const downloadLock = useRef(false);
  const tabs: PreviewTab[] = [
    { value: "profile", label: "Digital card preview", Icon: UserRound },
    { value: "qr", label: "QR card preview", Icon: QrCode },
    { value: "analytics", label: "Card analytics", Icon: ChartNoAxesCombined },
    { value: "contacts", label: "Submitted contacts", Icon: UserRoundGroup }
  ];

  // Reflects confirmed section saves without a web reload or another card API request.
  useEffect(() => { if (savedCard) setCard(savedCard); }, [savedCard]);

  // Rereads SQLite on opening Preview or refreshing, independently of unsaved editor drafts.
  useEffect(() => {
    if (!embedded) return;
    let active = true;
    const loadCard = async (): Promise<void> => {
      setError(null);
      setRefreshing(true);
      try {
        const remote = await getDigitalCard({ uid: savedCard?.uid });
        if (!remote) {
          if (active) setCard(null);
          throw new Error("Add your card details before previewing it.");
        };//if ends
        const loaded = restoreDigitalCard(remote, createDigitalCard({ userId: remote.user_id, defaults: QR_DEFAULTS, uid: remote.uid }));
        if (active) {
          setCard(loaded);
          onCardRefreshed?.(loaded);
        };//if ends
      } catch (cause: unknown) {
        if (active) setError(GetError({ error: cause, message: "Your digital card could not be loaded." }).message);
      } finally {
        if (active) setRefreshing(false);
      };//try-catch ends
    };//func ends
    void loadCard();
    return () => { active = false; };//return ends
  }, [embedded, loadKey]);

  // Reloads SQLite values while retaining the current preview during the read.
  const reloadCard = (): void => { setLoadKey((key) => key + 1); };//func ends

  // Publishes the reviewed card and updates SQLite before sharing its public link.
  const handlePublish = async (): Promise<AppDigitalCardQr | null> => {
    if (!card || publishing || refreshing) return null;
    setPublishing(true);
    setActionError(null);
    try {
      const next = { ...card, cardSettings: { ...card.cardSettings, status: "published" as const } };
      await validateDigitalCard(next);
      const saved = restoreDigitalCard(await saveDigitalCard(next, Boolean(card.id)), next);
      setCard(saved);
      onPublished?.(saved);
      return saved;
    } catch (cause: unknown) {
      setActionError(GetError({ error: cause, message: "Your card could not be published. Try again." }).message);
      return null;
    } finally {
      setPublishing(false);
    };//try-catch ends
  };//func ends

  // Opens the same contact and social destinations as the public business card.
  const openLink = async (url: string): Promise<void> => {
    if (!/^(https?:|tel:|mailto:)/i.test(url)) return;
    setActionError(null);
    try {
      await Linking.openURL(url);
    } catch (cause: unknown) {
      setActionError(GetError({ error: cause, message: "This link could not be opened on your device." }).message);
    };//try-catch ends
  };//func ends

  // Exports a native vCard through the existing Files or Downloads flow.
  const saveContact = async (): Promise<void> => {
    if (!card || downloadLock.current) return;
    downloadLock.current = true;
    setSavingContact(true);
    setActionError(null);
    let file: File | null = null;
    try {
      const fileName = `unoqr-contact-${Date.now()}.vcf`;
      file = new File(Paths.cache, fileName);
      file.create();
      file.write(createDigitalCardContact(card));
      const saved = await fileDownload({ uri: file.uri, fileName, mimeType: "text/vcard" });
      if (saved) setDownloadLocation(saved.location);
    } catch (cause: unknown) {
      setActionError(GetError({ error: cause, message: "Your contact could not be saved." }).message);
    } finally {
      if (file?.exists) file.delete();
      downloadLock.current = false;
      setSavingContact(false);
    };//try-catch ends
  };//func ends

  const Layout = card ? getDigitalCardLayout(card.layout) : null;
  const previewContent = <>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {card && Layout ? <>
      {card.cardSettings.status !== "published" ? <Text style={styles.hint}>Your card is unpublished. Sharing will publish it first.</Text> : null}
      {side === "profile" ? <Layout data={getDigitalCardLayoutData(card)} primaryColor={card.primaryColor} onOpenLink={(url) => void openLink(url)} /> : <DigitalCardQrPreview card={card} fit />}
    </> : <View style={styles.message}>
      {error ? <Pressable accessibilityRole="button" onPress={reloadCard} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable> : <PxCircularProgress color={colors.secondary.main} size={40} />}
    </View>}
  </>;

  //Default Return
  if (!embedded) return <Redirect href="/digital_cards/modify" />;//return ends
  return <View style={[styles.root, { paddingBottom: insets.bottom }]}>
    {card ? <View style={styles.toolbar}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map(({ value, label, Icon }) => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: side === value }} onPress={() => setSide(value)} style={[styles.tab, side === value && styles.selectedTab]}>
          <Icon size={22} strokeWidth={1.25} color={side === value ? colors.white.main : colors.primary.main} />
        </Pressable>)}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Share digital card" disabled={publishing || refreshing} onPress={() => setShareOpen(true)} style={styles.shareButton}><Share2 size={22} strokeWidth={1.25} color={colors.primary.main} /></Pressable>
    </View> : null}
    {side === "contacts" && card ? <DigitalCardContacts key={card.uid} uid={card.uid} /> : side === "analytics" && card ? <DigitalCardAnalytics key={card.uid} uid={card.uid} /> : side === "qr" ? <View style={[styles.previewArea, styles.previewContent]}>{previewContent}</View> : <ScrollView style={styles.previewArea} contentContainerStyle={[styles.previewContent, !card && styles.emptyContent]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadCard} enabled={!publishing} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}>
      {previewContent}
    </ScrollView>}
    {actionError ? <Text accessibilityRole="alert" style={[styles.error, styles.feedback]}>{actionError}</Text> : null}
    {card ? <>
      {side === "profile" ? <CardFooter primaryColor={card.primaryColor} allowSaveContact={card.cardSettings.allowSaveContact} saving={savingContact} onSaveContact={() => void saveContact()} /> : side === "qr" ? <View style={styles.qrFooter}>
        <PxButton mode="contained" color="primary" fullWidth disabled={refreshing || publishing} onPress={() => setShareOpen(true)}>Share QR Card</PxButton>
      </View> : null}
      <DigitalCardShareDialog card={card} open={shareOpen} setOpen={setShareOpen} onPublish={handlePublish} initialTab={side === "qr" ? "qr" : "social"} />
    </> : null}
    <PxModal open={downloadLocation !== null} setOpen={(open) => { if (!open) setDownloadLocation(null); }} name="Contact saved" footerAction={<View><Pressable accessibilityRole="button" onPress={() => setDownloadLocation(null)} style={styles.retry}><Text style={styles.retryText}>Done</Text></Pressable></View>}>
      <View style={styles.success}><CheckCircle2 size={48} strokeWidth={1.25} color={colors.success.main} /><Text style={styles.hint}>{card?.details.fullname}'s contact was saved to {downloadLocation === "Downloads" ? "Downloads" : "your chosen Files folder"}.</Text></View>
    </PxModal>
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tabs: { flexDirection: "row", borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, padding: spacing.xxs, backgroundColor: colors.white.main },
  tab: { minHeight: 44, minWidth: 56, alignItems: "center", justifyContent: "center", borderRadius: radii.lg },
  selectedTab: { backgroundColor: colors.black.main },
  shareButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.main, backgroundColor: colors.white.main, borderRadius: radii.xl },
  previewArea: { flex: 1 },
  previewContent: { padding: spacing.md, gap: spacing.md },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  message: { alignItems: "center", gap: spacing.md },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  retry: { backgroundColor: colors.secondary.main, borderRadius: radii.lg, padding: spacing.md, alignItems: "center" },
  retryText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  feedback: { padding: spacing.sm },
  qrFooter: { padding: spacing.md },
  success: { padding: spacing.lg, gap: spacing.md, alignItems: "center" }
});
