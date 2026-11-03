import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { addDatabaseChangeListener } from "expo-sqlite";
import { ChevronRight, ContactRound, Plus, Rows3, Search, UsersRound, createLucideIcon } from "lucide-react-native";
import { Animated, FlatList, Image, PanResponder, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { PxTextInput } from "@/components/form/PxTextInput";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { restoreDigitalCard, type RemoteCard } from "@/helpers/digital_cards/api/cards";
import { getCachedDigitalCards } from "@/helpers/digital_cards/db/getQueries";
import { createDigitalCard } from "@/helpers/digital_cards/model";
import { QR_DEFAULTS } from "@/helpers/qrcodes/create/QrCreateScreen";
import { getDigitalCardLayout, getDigitalCardLayoutData } from "@/libraries/digitalcards-layouts";
import { restoreUserDigitalCards } from "@/helpers/digital_cards/utils/SyncDigitalCards";
import { retryPostLoginSync, usePostLoginSync } from "@/utils/auth/PostLoginSync";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { useUser } from "@/utils/auth/AuthUserContext";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

type CardRowProps = { card: RemoteCard; onPress: () => void };

/* ------------------ BREAK ------------------ */

// Official Lucide PlayingCardsFan paths; this icon is absent from the installed package.
// https://github.com/lucide-icons/lucide/blob/main/icons/playing-cards-fan.svg
const PlayingCardsFan = createLucideIcon("PlayingCardsFan", [
  ["path", { d: "M12.65 7.65a2 2 0 012.629-1.046l5.51 2.374a2 2 0 011.046 2.628l-3.957 9.184a2 2 0 01-2.628 1.046l-5.51-2.374a2 2 0 01-1.046-2.628z", key: "front" }],
  ["path", { d: "M18 7.777V4a2 2 0 00-2-2h-6a2 2 0 00-2 2v10a2 2 0 001.137 1.805", key: "middle" }],
  ["path", { d: "m8 4.389-4.364.809a2 2 0 00-1.602 2.33l1.822 9.833a2 2 0 002.331 1.602l2.542-.47", key: "back" }]
]);

/* ------------------ BREAK ------------------ */

// Lists every locally saved account card and opens the selected public UID in the existing preview/editor.
export default function DigitalCardsListScreen() {
  const postLoginSync = usePostLoginSync();
  const user = useUser();
  const [cards, setCards] = useState<RemoteCard[]>([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [availableHeight, setAvailableHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRead = useRef(0);
  const refreshRequest = useRef<AbortController | null>(null);

  // Rereads owned SQLite rows without replacing the list with an arbitrary default card.
  const loadCards = useCallback(async (isActive: () => boolean): Promise<void> => {
    const read = ++latestRead.current;
    try {
      const saved = await getCachedDigitalCards(user.id);
      if (isActive() && read === latestRead.current) setCards(saved.reverse());
    } catch (cause: unknown) {
      if (isActive() && read === latestRead.current) setError(GetError({ error: cause, message: "Your saved cards could not be loaded." }).message);
    } finally {
      if (isActive() && read === latestRead.current) setLoading(false);
    };//try-catch ends
  }, [user.id]);

  // Updates the list after saves, deletions and background sync while cancelling reads on account navigation.
  useFocusEffect(useCallback(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setError(null); setRefreshing(false);
    void loadCards(() => active);
    const subscription = addDatabaseChangeListener(({ tableName }) => {
      if (!["digital_cards", "digital_card_photos"].includes(tableName) || timer !== null) return;
      timer = setTimeout(() => { timer = null; void loadCards(() => active); }, 0);
    });
    return () => {
      active = false;
      subscription.remove();
      if (timer !== null) clearTimeout(timer);
      refreshRequest.current?.abort();
      refreshRequest.current = null;
    };//return ends
  }, [loadCards]));

  // Refreshes all owned server cards through the existing account-scoped sync, preserving offline rows on failure.
  async function refreshCards(): Promise<void> {
    if (refreshRequest.current || postLoginSync.checking || postLoginSync.cards === "pending") return;
    const controller = new AbortController();
    refreshRequest.current = controller; setRefreshing(true); setError(null);
    try {
      if (postLoginSync.cards === "failed") {
        await retryPostLoginSync();
        return;
      };//if ends
      const synced = await restoreUserDigitalCards({ signal: controller.signal });
      if (!synced && !controller.signal.aborted) throw new Error("Your cards could not be refreshed. Try again.");
      await loadCards(() => !controller.signal.aborted);
    } catch (cause: unknown) {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Your cards could not be refreshed. Your saved cards are still available." }).message);
    } finally {
      if (refreshRequest.current === controller) { refreshRequest.current = null; setRefreshing(false); };//if ends
    };//try-catch ends
  };//func ends

  // Starts a new card explicitly instead of reopening the oldest card in the account.
  function createCard(): void { router.push({ pathname: "/digital_cards/modify", params: { mode: "edit", new: "1" } }); };//func ends

  const visibleCards = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query ? cards.filter(card => [card.name, card.fullname, card.company, card.position].join(" ").toLocaleLowerCase().includes(query)) : cards;
  }, [cards, search]);

  //Default Return
  return <GeneralLayout scroll={false} edges={[]} bodyStyle={styles.body} topView={<View style={styles.header}>
    <View style={styles.heading}><Text style={styles.title}>My Cards</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Open card groups" onPress={() => router.push("/digital_cards/groups")} style={styles.iconButton}><UsersRound size={23} strokeWidth={1.25} color={colors.primary.main} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Create digital card" onPress={createCard} style={styles.addButton}><Plus size={24} strokeWidth={1.25} color={colors.white.main} /></Pressable>
  </View>}>
    <View style={styles.search}>
      <View style={styles.viewIcons}>
        <Text pointerEvents="none" style={styles.toolbarCount}>{viewMode === "cards" && visibleCards.length ? `${Math.min(deckIndex + 1, visibleCards.length)} / ${visibleCards.length}` : `${visibleCards.length} ${visibleCards.length === 1 ? "card" : "cards"}`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? "Hide search" : "Show search"} accessibilityState={{ expanded: searchOpen }} onPress={() => { setSearchOpen(current => !current); setSearch(""); }} style={[styles.viewIcon, styles.searchToggle, searchOpen && styles.searchToggleActive]}><Search size={24} strokeWidth={1.25} color={colors.primary.main} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Card view" accessibilityState={{ selected: viewMode === "cards" }} onPress={() => setViewMode("cards")} style={[styles.viewIcon, styles.modeToggle, viewMode === "cards" && styles.searchToggleActive]}><PlayingCardsFan size={24} strokeWidth={1.25} color={colors.primary.main} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="List view" accessibilityState={{ selected: viewMode === "list" }} onPress={() => setViewMode("list")} style={[styles.viewIcon, styles.modeToggle, viewMode === "list" && styles.searchToggleActive]}><Rows3 size={24} strokeWidth={1.25} color={colors.primary.main} /></Pressable>
      </View>
      {searchOpen ? <PxTextInput autoFocus value={search} onChangeText={setSearch} placeholder="Search your cards" accessibilityLabel="Search cards by name or company" autoCorrect={false} /> : null}
    </View>
    <View style={styles.results} onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)}>
    {viewMode === "cards" && visibleCards.length > 0 ? <CardDeck key={visibleCards.map(card => card.uid).join(":")} cards={visibleCards} height={availableHeight} onIndexChange={setDeckIndex} /> : <FlatList key={viewMode} data={visibleCards} keyExtractor={card => card.uid} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshCards()} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}
      renderItem={({ item }) => <CardRow card={item} onPress={() => router.push({ pathname: "/digital_cards/modify", params: { uid: item.uid, mode: "preview" } })} />}
      ListEmptyComponent={loading ? <View style={styles.message}><PxCircularProgress size={36} color={colors.secondary.main} /></View> : <View style={styles.message}>
        <ContactRound size={44} strokeWidth={1.25} color={colors.mute.main} />
        <Text style={styles.emptyTitle}>{search.trim() ? "No matching cards" : "Your cards, all in one place"}</Text>
        <Text style={styles.hint}>{search.trim() ? "Try a different name or company." : "Create a personal card or business cards for your team."}</Text>
        <PxButton mode="contained" color="primary" onPress={search.trim() ? () => setSearch("") : createCard}>{search.trim() ? "Clear search" : "Create your first card"}</PxButton>
      </View>}
      ListFooterComponent={error ? <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PxButton disabled={refreshing} onPress={() => void refreshCards()}>Try again</PxButton></View> : null}
    />}
    </View>
  </GeneralLayout>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Keeps adjacent pages visible and promotes the same mounted preview through each swipe.
function CardDeck({ cards, height, onIndexChange }: { cards: RemoteCard[]; height: number; onIndexChange: (index: number) => void }) {
  const [index, setIndex] = useState(0);
  const [moving, setMoving] = useState(false);
  const [width, setWidth] = useState(1);
  const page = useRef(new Animated.Value(0)).current;
  const animating = useRef(false);
  const gestureAxis = useRef<"horizontal" | "vertical">("horizontal");
  const cardHeight = Math.max(0, height - spacing.md * 2 - 24);

  // Applies the settled value to newly attached native animation nodes before painting.
  useLayoutEffect(() => { page.setValue(index); onIndexChange(index); }, [index, page, onIndexChange]);
  useEffect(() => () => { page.stopAnimation(); }, [page]);

  // Returns an incomplete swipe to the current card.
  const settle = (): void => {
    Animated.spring(page, { toValue: index, useNativeDriver: true, friction: 8 }).start(({ finished }) => { if (finished) setMoving(false); });
  };//func ends

  // Moves only to an existing neighboring page, retaining its preview and blur overlay.
  const advance = (step: number): void => {
    const target = index + step;
    if (animating.current) return;
    if (target < 0 || target >= cards.length) { settle(); return; };//if ends
    animating.current = true; setMoving(true);
    Animated.timing(page, { toValue: target, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) { setIndex(target); setMoving(false); };//if ends
      animating.current = false;
    });
  };//func ends

  const pan = useMemo(() => PanResponder.create({
    // Claim movement from the card pressable so vertical drags cannot open its preview.
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      if (animating.current || (Math.abs(gesture.dx) <= 8 && Math.abs(gesture.dy) <= 8)) return false;
      gestureAxis.current = Math.abs(gesture.dx) > Math.abs(gesture.dy) ? "horizontal" : "vertical";
      return true;
    },
    onPanResponderGrant: () => {
      page.stopAnimation(); setMoving(true);
    },
    onPanResponderMove: (_, gesture) => {
      if (gestureAxis.current === "horizontal") page.setValue(Math.max(0, Math.min(cards.length - 1, index - gesture.dx / width)));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gestureAxis.current === "vertical") { settle(); return; };//if ends
      if (Math.abs(gesture.dx) > width * 0.22 || Math.abs(gesture.vx) > 0.6) advance(gesture.dx < 0 ? 1 : -1);
      else settle();
    },
    onPanResponderTerminate: settle
  }), [index, width, cards.length, page]);
  const neighbors = cards.map((card, cardIndex) => ({ card, cardIndex })).filter(item => Math.abs(item.cardIndex - index) <= 1);

  //Default Return
  return <View style={styles.deck} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={styles.deckCards} {...pan.panHandlers} accessibilityRole="adjustable" accessibilityLabel={`${cards[index].name}, card ${index + 1} of ${cards.length}`} accessibilityActions={[...(index < cards.length - 1 ? [{ name: "increment" as const, label: "Next card" }] : []), ...(index > 0 ? [{ name: "decrement" as const, label: "Previous card" }] : [])]} onAccessibilityAction={event => advance(event.nativeEvent.actionName === "increment" ? 1 : -1)}>
      {[-1, 1].filter(side => index + side >= 0 && index + side < cards.length).map(side => <View key={`placeholder-${side}`} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.deckLayer, styles.deckPlaceholder, side > 0 && styles.nextPlaceholder, {
        height: cardHeight,
        transform: [{ translateX: side * 16 }, { translateY: -4 }, { rotate: `${side * 3}deg` }, { scale: 0.96 }]
      }]}><View style={styles.placeholderWash} /></View>)}
      {neighbors.map(({ card, cardIndex }) => {
        const active = cardIndex === index;
        const side = Math.sign(cardIndex - index);
        const inputRange = [cardIndex - 1, cardIndex, cardIndex + 1];
        return <Animated.View key={card.uid} pointerEvents={active ? "auto" : "none"} accessibilityElementsHidden={!active} importantForAccessibility={active ? "auto" : "no-hide-descendants"} style={[styles.deckLayer, {
          zIndex: active ? 3 : 2,
          opacity: moving ? page.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" }) : active ? 1 : 0,
          transform: !moving ? [{ translateX: active ? 0 : side * 16 }, { translateY: active ? 0 : -4 }, { rotate: `${active ? 0 : side * 3}deg` }, { scale: active ? 1 : 0.96 }] : [
            { translateX: page.interpolate({ inputRange, outputRange: active ? [width * 1.2, 0, -width * 1.2] : [16, 0, -16], extrapolate: "clamp" }) },
            { translateY: page.interpolate({ inputRange, outputRange: active ? [0, 0, 0] : [-4, 0, -4], extrapolate: "clamp" }) },
            { rotate: page.interpolate({ inputRange, outputRange: active ? ["8deg", "0deg", "-8deg"] : ["3deg", "0deg", "-3deg"], extrapolate: "clamp" }) },
            { scale: page.interpolate({ inputRange, outputRange: active ? [1, 1, 1] : [0.96, 1, 0.96], extrapolate: "clamp" }) }
          ]
        }]}>
          <CardPreview card={card} height={cardHeight} onPress={() => router.push({ pathname: "/digital_cards/modify", params: { uid: card.uid, mode: "preview" } })} />
        </Animated.View>;
      })}
    </View>
  </View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Shows a saved card's existing profile layout in a preview bounded by the list viewport.
function CardPreview({ card, height, onPress }: CardRowProps & { height: number }) {
  const preview = useMemo(() => restoreDigitalCard(card, createDigitalCard({ userId: card.user_id, defaults: QR_DEFAULTS, uid: card.uid })), [card]);
  const Layout = getDigitalCardLayout(preview.layout);
  //Default Return
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${card.name || card.fullname}`} onPress={onPress} style={[styles.card, styles.previewCard, { height }]}>
    <View style={styles.previewTarget}>
    <View pointerEvents="none" style={styles.previewBody} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Layout data={getDigitalCardLayoutData(preview)} primaryColor={preview.primaryColor} isPreview /></View>
    <View style={styles.previewFooter}><Text numberOfLines={1} style={[styles.cardTitle, styles.previewName]}>{card.name || card.fullname}</Text><ChevronRight size={20} strokeWidth={1.25} color={colors.mute.main} /></View>
    </View>
  </Pressable>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Displays a saved card's label, person and company with its current publication status.
function CardRow({ card, onPress }: CardRowProps) {
  const uri = card.photo?.url || card.photo_url;
  //Default Return
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${card.name || card.fullname}`} onPress={onPress} style={styles.card}>
    <View style={[styles.accent, { backgroundColor: card.primary_color }]} />
    <View style={styles.cardBody}>
      {uri ? <Image source={{ uri }} style={styles.avatar} /> : <View style={styles.avatar}><ContactRound size={28} strokeWidth={1.25} color={colors.mute.main} /></View>}
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardTitle}>{card.name || "My Card"}</Text>
        <Text numberOfLines={1} style={styles.person}>{card.fullname}</Text>
        {card.company || card.position ? <Text numberOfLines={2} style={styles.hint}>{[card.position, card.company].filter(Boolean).join(" · ")}</Text> : null}
        <View style={[styles.status, card.status === "published" && styles.published]}><Text style={[styles.statusText, card.status === "published" && styles.publishedText]}>{card.status === "published" ? "Published" : "Unpublished"}</Text></View>
      </View>
      <ChevronRight size={20} strokeWidth={1.25} color={colors.mute.main} />
    </View>
  </Pressable>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { gap: 0 },
  header: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.white.main },
  heading: { flex: 1, gap: spacing.xxs },
  title: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h5 },
  caption: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  addButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  deck: { flex: 1, overflow: "hidden", paddingTop: spacing.xs },
  deckCards: { flex: 1 },
  deckPlaceholder: { zIndex: 0, overflow: "hidden", borderRadius: radii.xl + spacing.sm + 1, borderWidth: 1, borderColor: colors.border.main, backgroundColor: colors.neutral.light, shadowColor: colors.mute.main, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  nextPlaceholder: { backgroundColor: colors.mute.light },
  placeholderWash: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.white.main, opacity: 0.45 },
  deckLayer: { position: "absolute", top: spacing.md, left: spacing.xl, right: spacing.xl },
  results: { flex: 1, minHeight: 0 },
  modeToggle: { borderRadius: radii.lg, borderWidth: 1, borderColor: "transparent" },
  previewCard: { borderRadius: radii.xl + spacing.sm + 1 },
  previewTarget: { flex: 1 },
  previewBody: { flex: 1, overflow: "hidden" },
  previewFooter: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.main },
  previewName: { flex: 1 },
  toolbarCount: { position: "absolute", left: 0, right: 0, textAlign: "center", color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  viewIcons: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacing.xs },
  searchToggle: { marginRight: "auto", borderRadius: radii.lg, borderWidth: 1, borderColor: "transparent" },
  searchToggleActive: { borderColor: colors.border.main, backgroundColor: colors.white.main },
  viewIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  search: { padding: spacing.md, paddingBottom: spacing.xs, gap: spacing.xs },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.md, gap: spacing.sm },
  card: { overflow: "hidden", backgroundColor: colors.white.main, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl },
  accent: { height: spacing.xxs },
  cardBody: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  avatar: { width: 60, height: 60, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream.dark },
  cardCopy: { flex: 1, gap: spacing.xxs },
  cardTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  person: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  status: { alignSelf: "flex-start", borderRadius: radii.pill, backgroundColor: colors.cream.dark, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, marginTop: spacing.xxs },
  published: { backgroundColor: colors.success.surface },
  publishedText: { color: colors.success.dark },
  statusText: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  message: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  feedback: { paddingVertical: spacing.md, gap: spacing.sm, alignItems: "center" },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
