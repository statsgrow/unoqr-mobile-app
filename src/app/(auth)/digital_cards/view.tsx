import { useEffect, useRef, useState } from "react";
import { File, Paths } from "expo-file-system";
import { Share2 } from "lucide-react-native";
import { router } from "expo-router";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

import { fileDownload } from "@/components/files/FileDownload";
import { BottomNav } from "@/components/layout/BottomNav";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { getDigitalCard, restoreDigitalCard, saveDigitalCard } from "@/helpers/digital_cards/api/cards";
import { createDigitalCard, type AppDigitalCardQr } from "@/helpers/digital_cards/model";
import DigitalCardShareDialog from "@/helpers/digital_cards/dialogs/DigitalCardShareDialog";
import { validateDigitalCard } from "@/helpers/digital_cards/validations";
import { QR_DEFAULTS } from "@/helpers/qrcodes/create/QrCreateScreen";
import { frontendSettings, userTokenSettings } from "@/settings";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { getUserTokens } from "@/utils/auth/AuthTokens";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

type DigitalCardViewProps = { embedded?: boolean; onCardSettings?: () => void; onPublished?: (card: AppDigitalCardQr) => void };
type PreviewSource = { uri: string; headers: Record<string, string> };
type PreviewMessage = { type?: unknown; uid?: unknown; content?: unknown; message?: unknown };

/* ------------------ BREAK ------------------ */

// Shows the shared frontend preview while keeping publishing and contact downloads native.
export default function DigitalCardViewScreen({ embedded = false, onCardSettings, onPublished }: DigitalCardViewProps = {}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [card, setCard] = useState<AppDigitalCardQr | null>(null);
  const [source, setSource] = useState<PreviewSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [formType, setFormType] = useState<"add" | "edit">("add");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const downloadLock = useRef(false);

  // Loads the account's saved card and authenticates the frontend's server-side preview request.
  useEffect(() => {
    let mounted = true;
    const loadCard = async (): Promise<void> => {
      setError(null);
      setPreviewReady(false);
      setSource(null);
      setAtTop(true);
      setRefreshing(true);
      try {
        const user = await getStorageUser();
        if (!user) throw new Error("Sign in to view your digital business card.");
        const remote = await getDigitalCard();
        if (!remote) throw new Error("Add your card details before previewing it.");
        const loaded = restoreDigitalCard(remote, createDigitalCard({ userId: user.id, defaults: QR_DEFAULTS, uid: remote.uid }));
        if (!loaded.details.name.trim()) throw new Error("Add your card details before previewing it.");
        const { accessToken } = await getUserTokens();
        if (!accessToken) throw new Error("Sign in to preview your card.");
        const url = frontendSettings.getFrontendUrl({ path: "/dc/preview" });
        url.searchParams.set("uid", loaded.uid);
        if (mounted) {
          setFormType(remote?.id ? "edit" : "add");
          setCard(loaded);
          setSource({ uri: url.href, headers: { [userTokenSettings.headerTokens.accessToken.name]: accessToken } });
          setPublishError(null);
          setActionError(null);
          setContactMessage(null);
        };//if ends
      } catch (loadError: unknown) {
        if (mounted) setError(GetError({ error: loadError, message: "Your digital card preview could not be loaded." }).message);
      } finally {
        if (mounted) setRefreshing(false);
      };//try-catch ends
    };//func ends
    void loadCard();
    return () => { mounted = false; };//return ends
  }, [loadKey]);

  // Publishes the reviewed card, then reloads the frontend to show its latest status.
  const handlePublish = async (): Promise<AppDigitalCardQr | null> => {
    if (!card || publishing || !previewReady) return null;
    setPublishing(true);
    setPublishError(null);
    try {
      const next = { ...card, cardSettings: { ...card.cardSettings, status: "published" as const } };
      await validateDigitalCard(next);
      const saved = restoreDigitalCard(await saveDigitalCard(next, formType === "edit"), next);
      setFormType("edit");
      setCard(saved);
      onPublished?.(saved);
      setLoadKey((key) => key + 1);
      return saved;
    } catch (saveError: unknown) {
      setPublishError(GetError({ error: saveError, message: "Your card could not be published. Try again." }).message);
      return null;
    } finally {
      setPublishing(false);
    };//try-catch ends
  };//func ends

  // Opens contact and social actions outside the authenticated preview web page.
  const openLink = async (url: string): Promise<void> => {
    if (!/^(https?:|tel:|mailto:)/i.test(url)) return;
    setActionError(null);
    try {
      await Linking.openURL(url);
    } catch (linkError: unknown) {
      setActionError(GetError({ error: linkError, message: "This link could not be opened on your device." }).message);
    };//try-catch ends
  };//func ends

  // Saves a contact through the existing download helper and removes its temporary cache file.
  const saveContact = async (content: string): Promise<void> => {
    if (downloadLock.current) return;
    downloadLock.current = true;
    setActionError(null);
    setContactMessage(null);
    let file: File | null = null;
    try {
      const fileName = `unoqr-contact-${Date.now()}.vcf`;
      file = new File(Paths.cache, fileName);
      file.create();
      file.write(content);
      const saved = await fileDownload({ uri: file.uri, fileName, mimeType: "text/vcard" });
      if (saved) setContactMessage(`Contact saved to ${saved.location}.`);
    } catch (downloadError: unknown) {
      setActionError(GetError({ error: downloadError, message: "Your contact could not be saved." }).message);
    } finally {
      if (file?.exists) file.delete();
      downloadLock.current = false;
    };//try-catch ends
  };//func ends

  // Accepts preview readiness and contact actions only from this account's trusted preview page.
  const handleMessage = (event: WebViewMessageEvent): void => {
    if (!source || !card || !isPreviewOrigin(event.nativeEvent.url, source.uri)) return;
    const message = parsePreviewMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === "digital-card-ready" && message.uid === card.uid) setPreviewReady(true);
    if (message.type === "digital-card-error" && typeof message.message === "string") {
      setError(message.message);
      setPreviewReady(false);
    };//if ends
    if (message.type === "digital-card-save-contact" && message.uid === card.uid && typeof message.content === "string") {
      void saveContact(message.content);
    };//if ends
  };//func ends

  //Default Return
  return (
    <View style={styles.root}>
      {!embedded ? <View style={styles.header}>
        <HeaderBackButton accessibilityLabel="Back to card editor" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Card preview</Text>
      </View> : null}
      {card ? <View style={styles.shareToolbar}>
        <Text style={styles.hint}>Your digital business card</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Share digital card" disabled={!previewReady || publishing || refreshing} onPress={() => setShareOpen(true)} style={styles.shareButton}><Share2 size={22} strokeWidth={1.25} color={colors.primary.main} /></Pressable>
      </View> : null}
      <ScrollView style={styles.previewArea} contentContainerStyle={styles.previewContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setLoadKey((key) => key + 1)} enabled={atTop && !publishing} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}>
        {source && !error ? (
          <WebView
            key={loadKey}
            source={source}
            style={styles.webView}
            javaScriptEnabled
            originWhitelist={["http://*", "https://*", "tel:*", "mailto:*"]}
            mixedContentMode="never"
            javaScriptCanOpenWindowsAutomatically={false}
            setSupportMultipleWindows={false}
            allowFileAccess={false}
            allowUniversalAccessFromFileURLs={false}
            cacheEnabled={false}
            incognito
            nestedScrollEnabled
            onScroll={({ nativeEvent }) => setAtTop(nativeEvent.contentOffset.y <= 0)}
            onShouldStartLoadWithRequest={(request) => {
              if (request.url === source.uri || request.url === "about:blank") return true;
              void openLink(request.url);
              return false;
            }}
            onMessage={handleMessage}
            onError={({ nativeEvent }) => { setError(nativeEvent.description || "Your card preview could not be loaded. Try again."); setPreviewReady(false); }}
            onHttpError={({ nativeEvent }) => {
              if (nativeEvent.url === source.uri) {
                setError("Your card preview could not be loaded. Try again.");
                setPreviewReady(false);
              };//if ends
            }}
            startInLoadingState
            renderLoading={() => <View style={styles.loading}><ActivityIndicator size="large" color={colors.secondary.main} /></View>}
          />
        ) : <View style={styles.message}>
          {error ? <>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setLoadKey((key) => key + 1)} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
          </> : <ActivityIndicator size="large" color={colors.secondary.main} />}
        </View>}
      </ScrollView>
      {card ? <BottomNav hideMenu={true} footerAction={<View style={styles.publishFooter}>
        {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
        {contactMessage ? <Text style={styles.hint}>{contactMessage}</Text> : null}
        {publishError ? <Text accessibilityRole="alert" style={styles.error}>{publishError}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="My Card Settings" onPress={() => onCardSettings ? onCardSettings() : router.replace("/digital_cards/modify")} style={styles.settingsButton}>
          <Text style={styles.settingsText}>My Card Settings</Text>
        </Pressable>
      </View>} /> : null}
      {card ? <DigitalCardShareDialog card={card} open={shareOpen} setOpen={setShareOpen} onPublish={handlePublish} /> : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Handles Android's origin-only message URLs while rejecting messages from other hosts.
function isPreviewOrigin(value: string, expected: string): boolean {
  try {
    return new URL(value).origin === new URL(expected).origin;
  } catch {
    return false;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

// Ignores malformed messages before reading the preview's small native action contract.
function parsePreviewMessage(value: string): PreviewMessage | null {
  try {
    const message: unknown = JSON.parse(value);
    return message && typeof message === "object" ? message as PreviewMessage : null;
  } catch {
    return null;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  headerTitle: { flex: 1, color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6 },
  shareToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, backgroundColor: colors.white.main },
  shareButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  previewArea: { flex: 1 },
  previewContent: { flex: 1 },
  webView: { flex: 1, backgroundColor: colors.cream.main },
  loading: { position: "absolute", inset: 0, justifyContent: "center", alignItems: "center", backgroundColor: colors.cream.main },
  message: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg, gap: spacing.md },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption, textAlign: "center" },
  retry: { backgroundColor: colors.secondary.main, borderRadius: radii.lg, padding: spacing.md },
  retryText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  publishFooter: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white.main },
  settingsButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.black.main },
  settingsText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
