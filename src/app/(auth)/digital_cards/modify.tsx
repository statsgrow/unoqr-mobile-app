import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Eye, Pencil } from "lucide-react-native";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

import type { FileInputValue } from "@/components/form/PxFileInput";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { createDigitalCard, type AppDigitalCardQr, type DigitalCardDetails, type DigitalCardLayoutType, type DigitalCardSettingsValues } from "@/helpers/digital_cards/model";
import { deleteDigitalCard, getDigitalCard, restoreDigitalCard, saveDigitalCard, saveDigitalCardQrDesign, saveDigitalCardDetails, updateDigitalCardFile, saveDigitalCardLayout, saveDigitalCardSettings, type RemoteCard } from "@/helpers/digital_cards/api/cards";
import { validateDigitalCard } from "@/helpers/digital_cards/validations";
import DigitalCardForm from "@/helpers/digital_cards/forms/DigitalCardForm";
import DigitalCardLayout from "@/helpers/digital_cards/forms/DigitalCardLayout";
import DigitalCardQrPreview from "@/helpers/digital_cards/components/DigitalCardQrPreview";
import DigitalCardSettings from "@/helpers/digital_cards/forms/DigitalCardSettings";
import type { QrCreateFormValues } from "@/helpers/qrcodes/create/QrCreate";
import CreateQrScreen, { QR_DEFAULTS } from "@/helpers/qrcodes/create/QrCreateScreen";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { useUser } from "@/utils/auth/AuthUserContext";

import DigitalCardViewScreen from "./view";

/* ------------------ BREAK ------------------ */

type DigitalCardScreen = "edit" | "preview";
type DigitalCardStep = "form" | "layout" | "qr" | "settings";

/* ------------------ BREAK ------------------ */

// Opens the saved card in Preview and keeps its editor sections mounted beneath the header.
export default function ModifyDigitalCardScreen() {
  const user = useUser();
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialScreen: DigitalCardScreen = params.mode === "edit" ? "edit" : "preview";
  const [screen, setScreen] = useState<DigitalCardScreen>(initialScreen);
  const [activeStep, setActiveStep] = useState<DigitalCardStep>("form");
  const [card, setCard] = useState<AppDigitalCardQr | null>(null);
  const draftCard = useRef<AppDigitalCardQr | null>(null);
  const latestCard = useRef<AppDigitalCardQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loadKey, setLoadKey] = useState(0);

  // Reads saved SQLite values when the card opens while retaining mounted RHF drafts across tabs.
  useEffect(() => {
    let isMounted = true;
    setError(null);
    setRefreshing(true);
    const loadCard = async (): Promise<void> => {
      try {
        const remote = await getDigitalCard();
        const defaults = createDigitalCard({ userId: user.id, defaults: QR_DEFAULTS, uid: remote?.uid });
        const loaded = remote ? restoreDigitalCard(remote, defaults) : defaults;
        if (isMounted) {
          if (loadKey === 0 || !remote?.id) setScreen(remote?.id ? initialScreen : "edit");
          latestCard.current = loaded;
          draftCard.current = loaded;
          setCard(loaded);
          setRevision((value) => value + 1);
        };//if ends
      } catch (loadError: unknown) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "Your digital business card could not be loaded.");
      } finally {
        if (isMounted) setRefreshing(false);
      };//try-catch ends
    };//func ends
    void loadCard();
    return () => { isMounted = false; };//return ends
  }, [loadKey, initialScreen, user.id]);

  // Saves only the selected section and commits API-confirmed values without replacing other RHF drafts.
  const persistCard = useCallback(async (changes: Partial<AppDigitalCardQr>, saveSection: (uid: string) => Promise<RemoteCard>): Promise<AppDigitalCardQr> => {
    const current = latestCard.current;
    if (!current) throw new Error("Your digital business card is not ready.");
    const next = { ...current, ...changes };
    let remote: RemoteCard;
    if (current.id) {
      remote = await saveSection(current.uid);
    } else {
      await validateDigitalCard(next);
      remote = await saveDigitalCard(next, false);
    };//if ends
    const saved = restoreDigitalCard(remote, next);
    latestCard.current = saved;
    draftCard.current = { ...(draftCard.current ?? saved), ...changes, id: saved.id };
    setCard(saved);
    return saved;
  }, []);

  // Reloads saved card values into each mounted form after a pull gesture.
  const handleRefresh = useCallback((): void => {
    Keyboard.dismiss();
    setLoadKey((value) => value + 1);
  }, []);

  // Deletes the saved card remotely and locally before returning to the Home screen.
  const handleDeleteCard = useCallback(async (): Promise<void> => {
    const current = latestCard.current;
    if (!current?.id) throw new Error("Save your digital card before deleting it.");
    Keyboard.dismiss();
    await deleteDigitalCard(current.uid);
    latestCard.current = null;
    draftCard.current = null;
    setCard(null);
    router.replace("/");
  }, []);

  // Saves QR appearance through the API without changing publication status.
  const handleSaveQr = useCallback(async (settings: QrCreateFormValues): Promise<void> => {
    await persistCard({ settings }, (uid) => saveDigitalCardQrDesign(uid, settings));
  }, [persistCard]);

  // Saves publication, SEO and contact sharing preferences.
  const handleSaveSettings = useCallback(async (cardSettings: DigitalCardSettingsValues): Promise<void> => {
    await persistCard({ cardSettings }, (uid) => saveDigitalCardSettings(uid, cardSettings));
  }, [persistCard]);

  // Saves appearance without changing the sample preview identities.
  const handleSaveLayout = useCallback(async (layout: DigitalCardLayoutType, primaryColor: string): Promise<void> => {
    await persistCard({ layout, primaryColor }, (uid) => saveDigitalCardLayout(uid, layout, primaryColor));
  }, [persistCard]);

  // Saves Details through the API without publishing or navigating away.
  const handleSaveDetails = useCallback(async (details: DigitalCardDetails): Promise<DigitalCardDetails> => {
    const saved = await persistCard({ details }, (uid) => saveDigitalCardDetails(uid, details));
    return saved.details;
  }, [persistCard]);

  // Saves a replacement photo independently while preserving every other unsaved Details field.
  const handleSavePhoto = useCallback(async (photo: FileInputValue, field: "profilePicture" | "featurePhoto"): Promise<FileInputValue | null> => {
    const current = latestCard.current;
    if (!current?.id) return null;
    if (!photo.url) throw new Error("Your uploaded photo URL is missing. Please try again.");
    const remote = await updateDigitalCardFile(current.uid, field === "featurePhoto" ? "feature_photo_url" : "photo_url", photo.url);
    const saved = restoreDigitalCard(remote, current);
    const confirmed = saved.details[field] ? { ...photo, ...saved.details[field] } : null;
    if (!confirmed) throw new Error("Your photo could not be saved.");
    latestCard.current = saved;
    const draft = draftCard.current ?? saved;
    draftCard.current = { ...draft, details: { ...draft.details, [field]: confirmed } };
    setCard(saved);
    return confirmed;
  }, []);

  // Retains each mounted RHF draft while moving between editor sections.
  const updateDraft = useCallback((changes: Partial<AppDigitalCardQr>): void => {
    if (draftCard.current) draftCard.current = { ...draftCard.current, ...changes };
  }, []);
  // Tracks the Details draft without writing it to storage.
  const handleDetailsDraft = useCallback((details: DigitalCardDetails): void => updateDraft({ details }), [updateDraft]);
  // Tracks the appearance draft without writing it to storage.
  const handleLayoutDraft = useCallback((layout: DigitalCardLayoutType, primaryColor: string): void => updateDraft({ layout, primaryColor }), [updateDraft]);
  // Tracks the QR draft without writing it to storage.
  const handleQrDraft = useCallback((settings: QrCreateFormValues): void => updateDraft({ settings }), [updateDraft]);
  // Tracks the preferences draft without writing it to storage.
  const handleSettingsDraft = useCallback((cardSettings: DigitalCardSettingsValues): void => updateDraft({ cardSettings }), [updateDraft]);

  // Syncs confirmed publication without replacing other unsaved editor fields.
  const handlePublished = useCallback((saved: AppDigitalCardQr): void => {
    latestCard.current = saved;
    const draft = draftCard.current ?? saved;
    draftCard.current = { ...draft, id: saved.id, cardSettings: { ...draft.cardSettings, status: saved.cardSettings.status } };
    setCard(saved);
  }, []);

  // Applies the SQLite card reread by Preview without resetting the mounted editor drafts.
  const handleCardRefreshed = useCallback((loaded: AppDigitalCardQr): void => {
    latestCard.current = loaded;
    setCard(loaded);
  }, []);

  //Default Return
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <HeaderBackButton accessibilityLabel={screen === "edit" && card?.id ? "Back to card preview" : "Back to Home"} onPress={() => { Keyboard.dismiss(); if (screen === "edit" && card?.id) setScreen("preview"); else router.back(); }} />
        <Text numberOfLines={1} style={styles.title}>{card?.cardSettings.name || "My Card"}</Text>
        {card?.id ? <Pressable accessibilityRole="button" accessibilityLabel={screen === "preview" ? "Edit digital business card" : "Preview digital business card"} onPress={() => { Keyboard.dismiss(); setScreen(screen === "preview" ? "edit" : "preview"); }} style={styles.editButton}>
          {screen === "preview" ? <Pencil size={18} strokeWidth={1.25} color={colors.primary.main} /> : <Eye size={18} strokeWidth={1.25} color={colors.primary.main} />}
          <Text style={styles.editText}>{screen === "preview" ? "Edit" : "Preview"}</Text>
        </Pressable> : null}
      </View>
      {screen === "edit" ? (
        <View style={styles.stepsArea}>
          <View accessibilityRole="tablist" style={styles.steps}>
            {(["form", "layout", "qr", "settings"] as const).map((step) => (
              <Pressable
                key={step}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeStep === step }}
                onPress={() => { Keyboard.dismiss(); setActiveStep(step); }}
                style={styles.stepButton}
              >
                <View style={[styles.stepPill, activeStep === step && styles.selectedStepPill]}>
                  <Text style={[styles.stepText, activeStep === step && styles.selectedStepText]}>{step === "form" ? "Details" : step === "layout" ? "Layout" : step === "qr" ? "QR Card" : "Settings"}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {error && card ? <Text accessibilityRole="alert" style={styles.messageText}>{error}</Text> : null}
      {card ? (
        <>
          <View style={[styles.panel, screen !== "edit" && styles.hiddenPanel]}>
            <View style={[styles.panel, activeStep !== "form" && styles.hiddenPanel]}>
              <DigitalCardForm key={revision} refreshing={refreshing} onRefresh={handleRefresh} details={card.details} onDraftChange={handleDetailsDraft} onSave={handleSaveDetails} onSavePhoto={handleSavePhoto} />
            </View>
            <View style={[styles.panel, activeStep !== "layout" && styles.hiddenPanel]}>
              <DigitalCardLayout key={revision} refreshing={refreshing} onRefresh={handleRefresh} layout={card.layout} primaryColor={card.primaryColor} featurePhotoUrl={card.details.featurePhoto?.url} onDraftChange={handleLayoutDraft} onSave={handleSaveLayout} />
            </View>
            <View style={[styles.panel, activeStep !== "qr" && styles.hiddenPanel]}>
              <CreateQrScreen key={revision} digitalCard={{ primaryColor: card.primaryColor, settings: card.settings, onSave: handleSaveQr, onDraftChange: handleQrDraft, refreshing, onRefresh: handleRefresh, renderPreview: () => screen === "edit" && activeStep === "qr" ? <DigitalCardQrPreview card={card} /> : null }} />
            </View>
            <View style={[styles.panel, activeStep !== "settings" && styles.hiddenPanel]}>
              <DigitalCardSettings key={revision} refreshing={refreshing} onRefresh={handleRefresh} settings={card.cardSettings} cardUrl={`https://unoqr.com/dc/${card.uid}`} fullname={card.details.fullname} bio={card.details.bio} onDraftChange={handleSettingsDraft} onSave={handleSaveSettings} onDelete={card.id ? handleDeleteCard : undefined} />
            </View>
          </View>
          {screen === "preview" ? <DigitalCardViewScreen embedded savedCard={card} onPublished={handlePublished} onCardRefreshed={handleCardRefreshed} /> : null}
        </>
      ) : (
        <View style={styles.message}>
          {error ? (
            <>
              <Text style={styles.messageText}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={() => setLoadKey((current) => current + 1)} style={styles.retryButton}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <PxCircularProgress color={colors.secondary.main} size={40} />
          )}
        </View>
      )}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main },
  header: { zIndex: 1, minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  title: { flex: 1, color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle },
  editButton: { minHeight: 44, minWidth: 44, flexDirection: "row", gap: spacing.xxs, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs },
  editText: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  stepsArea: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xxs, borderBottomWidth: 1, borderBottomColor: colors.line.main, backgroundColor: colors.cream.main },
  steps: { flexDirection: "row", gap: spacing.xs },
  stepButton: { flex: 1, minHeight: 44, justifyContent: "center" },
  stepPill: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.cream.dark },
  selectedStepPill: { backgroundColor: colors.primary.main },
  stepText: { color: colors.mute.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption, lineHeight: 18 },
  selectedStepText: { color: colors.white.main },
  panel: { flex: 1 },
  hiddenPanel: { display: "none" },
  message: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  messageText: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  retryButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  retryText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button }
});
