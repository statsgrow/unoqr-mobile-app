import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { addDatabaseChangeListener } from "expo-sqlite";
import {
  Barcode, CalendarDays, ChevronRight, ContactRound, File, FileText, Globe2,
  History, Link, Mail, MapPin, MessageSquare, Pencil, Phone, QrCode,
  ScanLine, Share2, ShieldKeyhole, Wallet, Wifi, type LucideIcon
} from "lucide-react-native";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { getDigitalCard, restoreDigitalCard, saveDigitalCardSettings, type RemoteCard } from "@/helpers/digital_cards/api/cards";
import DigitalCardShareDialog from "@/helpers/digital_cards/dialogs/DigitalCardShareDialog";
import { createDigitalCard, type AppDigitalCardQr } from "@/helpers/digital_cards/model";
import { validateDigitalCard } from "@/helpers/digital_cards/validations";
import { QR_DEFAULTS } from "@/helpers/qrcodes/create/QrCreateScreen";
import { UpiPaymentIcon } from "@/helpers/scans/components/UpiPaymentIcon";
import { getAllScans } from "@/helpers/scans/db/getQueries";
import { getScanTypeInit, normalizeScanType } from "@/helpers/scans/identifiers";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { redirect } from "@/utils/general/Redirect";

/* ------------------ BREAK ------------------ */

type ScanRecord = Awaited<ReturnType<typeof getAllScans>>[number];
type ShareTab = "qr" | "social";
type ScanTypeSummary = { type: string; label: string; count: number; percentage: number };
type ScanCategoryProps = { summary: ScanTypeSummary };
type ShortcutProps = { title: string; description: string; Icon: LucideIcon; onPress: () => void };

/* ------------------ BREAK ------------------ */

// Leads Home with the user's digital card, sharing actions, and top scan categories.
export default function HomeScreen() {
  const [loadingCard, setLoadingCard] = useState(true);
  const [card, setCard] = useState<RemoteCard | null>(null);
  const [cardError, setCardError] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [scanError, setScanError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTab, setShareTab] = useState<ShareTab>("qr");
  const cardRead = useRef(0);
  const scansRead = useRef(0);

  const shareCard = useMemo(() => card ? restoreDigitalCard(card, createDigitalCard({
    userId: card.user_id, defaults: QR_DEFAULTS, uid: card.uid
  })) : null, [card]);
  const scanTypes = useMemo(() => summarizeScanTypes(records), [records]);
  const topScanTypes = scanTypes.slice(0, 6);

  // Displays the local card as soon as its read finishes, preserving it during later reads.
  const loadCard = useCallback(async (isActive: () => boolean): Promise<void> => {
    const read = ++cardRead.current;
    try {
      const saved = await getDigitalCard();
      if (!isActive() || read !== cardRead.current) return;
      setCard(saved);
      setCardError(false);
    } catch {
      if (isActive() && read === cardRead.current) setCardError(true);
    } finally {
      if (isActive() && read === cardRead.current) setLoadingCard(false);
    };//try-catch ends
  }, []);

  // Displays local scans independently of the card and keeps categories visible during rereads.
  const loadScans = useCallback(async (isActive: () => boolean): Promise<void> => {
    const read = ++scansRead.current;
    try {
      const saved = await getAllScans();
      if (!isActive() || read !== scansRead.current) return;
      setRecords(saved);
      setScanError(false);
    } catch {
      if (isActive() && read === scansRead.current) setScanError(true);
    } finally {
      if (isActive() && read === scansRead.current) setLoadingScans(false);
    };//try-catch ends
  }, []);

  // Reads both SQLite sections without waiting for authentication or coupling their display.
  const loadHome = useCallback(async (isActive: () => boolean = () => true): Promise<void> => {
    await Promise.all([loadCard(isActive), loadScans(isActive)]);
  }, [loadCard, loadScans]);

  // Rereads saved data immediately when Home opens or regains focus without resetting loaders.
  useFocusEffect(useCallback(() => {
    let active = true;
    void loadHome(() => active);
    return () => { active = false; };//return ends
  }, [loadHome]));

  // Batches SQLite writes so saves, deletes and background sync silently refresh the affected section.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const changedTables = new Set<string>();
    const subscription = addDatabaseChangeListener(({ tableName }) => {
      if (!["digital_cards", "digital_card_photos", "scans"].includes(tableName)) return;
      changedTables.add(tableName);
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        if (changedTables.has("digital_cards") || changedTables.has("digital_card_photos")) void loadCard(() => active);
        if (changedTables.has("scans")) void loadScans(() => active);
        changedTables.clear();
      }, 0);
    });
    return () => {
      active = false;
      subscription.remove();
      if (timer !== null) clearTimeout(timer);
    };//return ends
  }, [loadCard, loadScans]);

  // Reloads the card and scan history from SQLite for a pull-to-refresh gesture.
  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  };//func ends

  // Opens the existing card editor directly from Home's Edit or creation action.
  const editCard = (): void => {
    redirect("push", { pathname: "/digital_cards/modify", params: { mode: "edit" } });
  };//func ends

  // Shows the sharing sheet using the card already read from SQLite.
  const openShare = (tab: ShareTab): void => {
    setShareTab(tab);
    setShareOpen(true);
  };//func ends

  // Publishes through the existing settings API before the sharing sheet exposes a public link.
  const publishCard = async (): Promise<AppDigitalCardQr | null> => {
    if (!shareCard) return null;
    const next = { ...shareCard, cardSettings: { ...shareCard.cardSettings, status: "published" as const } };
    await validateDigitalCard(next);
    const published = await saveDigitalCardSettings(next.uid, next.cardSettings);
    setCard(published);
    return restoreDigitalCard(published, next);
  };//func ends

  const cardDisabled = loadingCard || (cardError && !card);

  //Default Return
  return (
    <GeneralLayout scroll={false} topView={<HeaderNav showHome={false} />}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}
      >
        <View style={styles.cardSection}>
          <View style={styles.cardGroup}>
            <View style={styles.digitalCard}>
              <View pointerEvents="none" style={styles.cardPattern} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none">
                  <Defs>
                    <RadialGradient id="homeCardOrange" cx="10%" cy="0%" rx="58%" ry="135%">
                      <Stop offset="0" stopColor={colors.secondary.main} stopOpacity={0.34} />
                      <Stop offset="0.5" stopColor={colors.secondary.main} stopOpacity={0.12} />
                      <Stop offset="1" stopColor={colors.secondary.light} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="homeCardOrangeCorner" cx="96%" cy="100%" rx="65%" ry="140%">
                      <Stop offset="0" stopColor={colors.secondary.main} stopOpacity={0.3} />
                      <Stop offset="0.55" stopColor={colors.secondary.main} stopOpacity={0.1} />
                      <Stop offset="1" stopColor={colors.secondary.light} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="homeCardOrangeMist" cx="58%" cy="5%" rx="35%" ry="90%">
                      <Stop offset="0" stopColor={colors.secondary.main} stopOpacity={0.15} />
                      <Stop offset="1" stopColor={colors.secondary.light} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="homeCardCream" cx="3%" cy="95%" rx="48%" ry="100%">
                      <Stop offset="0" stopColor={colors.cream.sand} stopOpacity={0.95} />
                      <Stop offset="1" stopColor={colors.cream.card} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="homeCardCreamCorner" cx="100%" cy="0%" rx="36%" ry="100%">
                      <Stop offset="0" stopColor={colors.cream.sand} stopOpacity={0.9} />
                      <Stop offset="1" stopColor={colors.cream.card} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="homeCardWhite" cx="34%" cy="48%" rx="36%" ry="95%">
                      <Stop offset="0" stopColor={colors.white.main} stopOpacity={0.9} />
                      <Stop offset="1" stopColor={colors.white.main} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="homeCardWhiteCorner" cx="70%" cy="100%" rx="26%" ry="90%">
                      <Stop offset="0" stopColor={colors.white.main} stopOpacity={0.95} />
                      <Stop offset="1" stopColor={colors.white.main} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Rect width={400} height={120} fill={colors.cream.cardLight} />
                  <Rect width={400} height={120} fill="url(#homeCardOrange)" />
                  <Rect width={400} height={120} fill="url(#homeCardOrangeCorner)" />
                  <Rect width={400} height={120} fill="url(#homeCardOrangeMist)" />
                  <Rect width={400} height={120} fill="url(#homeCardCream)" />
                  <Rect width={400} height={120} fill="url(#homeCardCreamCorner)" />
                  <Rect width={400} height={120} fill="url(#homeCardWhite)" />
                  <Rect width={400} height={120} fill="url(#homeCardWhiteCorner)" />
                </Svg>
              </View>

              {loadingCard && !card ? (
                <View style={styles.cardMessage} />
              ) : cardError && !card ? (
                <View style={styles.cardMessage}>
                  <Text style={styles.cardDescription}>Your card could not be loaded.</Text>
                  <Pressable accessibilityRole="button" onPress={() => void loadHome()} style={styles.retryButton}>
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityLabel={card ? `View ${card.name}` : "Create your digital business card"}
                  accessibilityRole="button"
                  onPress={() => card ? redirect("push", { pathname: "/digital_cards/modify", params: { mode: "preview" } }) : editCard()}
                  style={({ pressed }) => [styles.cardPreview, pressed && styles.pressed]}
                >
                  <View style={styles.cardIdentity}>
                    <View style={styles.avatarBorder}>
                      <View style={styles.avatar}>
                        {card?.photo_url && failedPhoto !== card.photo_url ? (
                          <Image accessibilityLabel="Your card profile photo" source={{ uri: card.photo_url }} style={styles.avatarImage} onError={() => setFailedPhoto(card.photo_url)} />
                        ) : card ? (
                          <Text style={styles.avatarInitial}>{(card.fullname || card.name).trim().slice(0, 1).toUpperCase()}</Text>
                        ) : (
                          <ContactRound size={24} strokeWidth={1.25} color={colors.mute.dark} />
                        )}
                      </View>
                    </View>
                    <View style={styles.cardNameGroup}>
                      <Text numberOfLines={2} ellipsizeMode="tail" style={styles.cardTitle}>{card?.name || "Create your card"}</Text>
                      <Text numberOfLines={2} style={styles.cardDescription}>{card ? card.position : "Your details. Your QR. One card to share."}</Text>
                    </View>
                  </View>
                  <ChevronRight size={28} strokeWidth={1.25} color={colors.mute.dark} />
                </Pressable>
              )}
            </View>

            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                disabled={cardDisabled}
                accessibilityState={{ disabled: cardDisabled }}
                onPress={() => card ? openShare("qr") : editCard()}
                style={({ pressed }) => [styles.cardAction, styles.primaryAction, pressed && styles.pressed, cardDisabled && styles.disabled]}
              >
                <ScanLine size={20} strokeWidth={1.25} color={colors.secondary.dark} />
                <Text style={styles.primaryActionText}>{card ? "Show my QR" : "Create my card"}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share card"
                disabled={cardDisabled || !card}
                accessibilityState={{ disabled: cardDisabled || !card }}
                onPress={() => openShare("social")}
                style={({ pressed }) => [styles.iconAction, pressed && styles.pressed, (cardDisabled || !card) && styles.disabled]}
              >
                <Share2 size={20} strokeWidth={1.25} color={colors.primary.main} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={card ? "Edit digital business card" : "Create digital business card"}
                disabled={cardDisabled}
                accessibilityState={{ disabled: cardDisabled }}
                onPress={editCard}
                style={({ pressed }) => [styles.iconAction, pressed && styles.pressed, cardDisabled && styles.disabled]}
              >
                <Pencil size={20} strokeWidth={1.25} color={colors.primary.main} />
              </Pressable>
            </View>
          </View>
          {cardError && card ? <Text accessibilityRole="alert" style={styles.stateText}>Could not refresh your card. Pull down to try again.</Text> : null}
        </View>

        <View style={styles.shortcuts}>
          <HomeShortcut
            title="My scans"
            description={loadingScans ? "Loading scans…" : scanError ? "View your saved scans" : records.length + " scans"}
            Icon={History}
            onPress={() => redirect("push", "/scans/list")}
          />
          <HomeShortcut title="Create QR" description="Links, text & more" Icon={QrCode} onPress={() => redirect("push", "/qrcodes/create")} />
        </View>

        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.categoriesHeading}>Scans by type</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="View all scans" onPress={() => redirect("push", "/scans/list")} style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          </View>
          {loadingScans ? (
            <View style={styles.scanMessage}>
              <PxCircularProgress color={colors.secondary.main} size={24} />
              <Text style={styles.stateText}>Loading scan categories…</Text>
            </View>
          ) : scanError ? (
            <View style={styles.scanMessage}>
              <Text style={styles.stateText}>Your scans could not be loaded.</Text>
              <Pressable accessibilityRole="button" onPress={() => void loadHome()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
            </View>
          ) : topScanTypes.length ? (
            <View style={styles.categoriesGrid}>
              {topScanTypes.map(summary => <ScanCategory key={summary.type} summary={summary} />)}
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => redirect("push", "/scans/scanner")} style={({ pressed }) => [styles.emptyScans, pressed && styles.pressed]}>
              <View style={styles.scanIcon}><ScanLine size={24} strokeWidth={1.25} color={colors.secondary.main} /></View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>Scan your first QR</Text>
                <Text style={styles.stateText}>Your scan categories will appear here.</Text>
              </View>
              <ChevronRight size={20} strokeWidth={1.25} color={colors.mute.main} />
            </Pressable>
          )}
        </View>
      </ScrollView>
      {shareCard ? <DigitalCardShareDialog card={shareCard} open={shareOpen} setOpen={setShareOpen} onPublish={publishCard} initialTab={shareTab} /> : null}
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders a compact shortcut underneath the digital card.
function HomeShortcut({ title, description, Icon, onPress }: ShortcutProps) {
  //Default Return
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title + ". " + description} onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
      <View style={styles.shortcutIcon}><Icon size={24} strokeWidth={1.25} color={colors.secondary.main} /></View>
      <View style={styles.shortcutCopy}>
        <Text numberOfLines={2} style={styles.shortcutTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.shortcutDescription}>{description}</Text>
      </View>
    </Pressable>
  );//return ends
};//func ends

// Shows one scan category's count and share of all scans, linking to its filtered history.
function ScanCategory({ summary }: ScanCategoryProps) {
  const Icon = getScanCategoryIcon(summary.type);

  //Default Return
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${summary.label}: ${summary.count} scans, ${summary.percentage}% of total scans`}
      onPress={() => redirect("push", { pathname: "/scans/list", params: { type: summary.type } })}
      style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
    >
      <View style={styles.categoryTopRow}>
        {summary.type === "upi_payment" ? <UpiPaymentIcon size={32} backgroundColor={colors.cream.main} /> : <View style={styles.categoryIcon}><Icon size={18} strokeWidth={1.25} color={colors.secondary.main} /></View>}
        <Text style={styles.categoryPercentage}>{summary.percentage}%</Text>
      </View>
      <Text style={styles.categoryCount}>{summary.count}</Text>
      <Text numberOfLines={2} style={styles.categoryLabel}>{summary.label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${summary.percentage}%` }]} />
      </View>
    </Pressable>
  );//return ends
};//func ends

// Matches each scan identifier to a consistent Lucide outline icon.
function getScanCategoryIcon(type: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    url: Globe2, text: FileText, contact: ContactRound, "digital-card": ContactRound, phone: Phone,
    file: File, product: Barcode, barcode: Barcode, email: Mail,
    sms: MessageSquare, wifi: Wifi, location: MapPin, calendar: CalendarDays,
    payment: Wallet, upi_payment: Wallet, auth: ShieldKeyhole, deep_link: Link
  };
  return icons[type] || QrCode;
};//func ends

// Groups normalized scan types and ranks their counts using all saved scans as the percentage total.
function summarizeScanTypes(records: ScanRecord[]): ScanTypeSummary[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const type = normalizeScanType(record.type);
    counts.set(type, (counts.get(type) || 0) + 1);
  };//for ends
  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([type, count]) => ({
      type, count, label: getScanTypeInit(type).label,
      percentage: Math.round(count / records.length * 100)
    }));
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, backgroundColor: colors.cream.main },
  cardSection: { gap: spacing.xs },
  sectionHeader: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  cardGroup: { borderRadius: radii.xl + spacing.xs, backgroundColor: colors.white.main, shadowColor: colors.neutral.dark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 },
  digitalCard: { minHeight: 104, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radii.xl + spacing.xs, borderWidth: 1, borderColor: colors.cream.dark, backgroundColor: colors.cream.cardLight, overflow: "hidden" },
  cardPattern: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  cardPreview: { flex: 1, minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardIdentity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatarBorder: { flexShrink: 0, padding: 3, borderWidth: 1, borderColor: colors.mute.main, borderRadius: radii.pill },
  avatar: { width: 48, height: 48, borderRadius: radii.pill, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.white.main },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarInitial: { color: colors.mute.dark, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h4 },
  cardNameGroup: { flex: 1, minWidth: 0, gap: spacing.xxs },
  cardTitle: { flexShrink: 1, color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.subtitle1, lineHeight: 20, letterSpacing: -0.2 },
  cardDescription: { color: colors.primary.light, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, lineHeight: 20 },
  cardMessage: { flex: 1, minHeight: 72, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  cardActions: { flexDirection: "row", gap: spacing.xs, padding: spacing.xs },
  cardAction: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingHorizontal: spacing.xs, borderRadius: radii.lg },
  primaryAction: { backgroundColor: colors.secondary.light },
  iconAction: { width: 48, minHeight: 48, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border.main, backgroundColor: colors.white.main },
  primaryActionText: { color: colors.secondary.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  shortcuts: { flexDirection: "row", gap: spacing.xs },
  shortcut: { flex: 1, minWidth: 0, minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.xxs, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  shortcutIcon: { width: 40, height: 40, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.cream.main },
  shortcutCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  shortcutTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  shortcutDescription: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption, lineHeight: 16 },
  categoriesSection: { gap: spacing.xs },
  categoriesHeading: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6 },
  viewAllButton: { minHeight: 44, justifyContent: "center", paddingLeft: spacing.xs },
  viewAllText: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.xs },
  categoryCard: { width: "48%", minHeight: 112, gap: spacing.xxs, padding: spacing.xs, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main },
  categoryTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  categoryIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.md, backgroundColor: colors.cream.main },
  categoryPercentage: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption - 1 },
  categoryCount: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6, lineHeight: 24 },
  categoryLabel: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption, lineHeight: 16 },
  progressTrack: { height: spacing.xxs, marginTop: spacing.xxs, overflow: "hidden", borderRadius: radii.pill, backgroundColor: colors.line.light },
  progressFill: { height: "100%", borderRadius: radii.pill, backgroundColor: colors.primary.main },
  scanIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.cream.main },
  emptyCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  emptyTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  scanMessage: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  stateText: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, lineHeight: 20 },
  emptyScans: { minHeight: 100, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  retryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md },
  retryText: { color: colors.secondary.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 }
});
