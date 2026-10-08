import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ChevronLeft, ChevronRight, CloudAlert, CloudCheck, ContactRound, Globe2, Phone, Plus, QrCode as QrCodeIcon, Search, Type, X, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Animated, AppState, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItemInfo, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { redirect } from "@/utils/general/Redirect";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { TopNav } from "@/components/layout/TopNav";
import { PxButton } from "@/components/elements/PxButton";
import { PxDialog } from "@/components/elements/PxDialog";
import { getAllQrCodes } from "@/helpers/qrcodes/db/getQr";
import type { QrCode } from "@/helpers/qrcodes/db/initQrCodes";
import type { QrContentType } from "@/helpers/qrcodes/create/QrContent";
import { QR_HISTORY_SYNC_WINDOW_MS, restoreUserQrCodes } from "@/helpers/qrcodes/QrSync";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type QrListState = {
  records: QrCode[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

type CloudQrState = {
  status: "idle" | "loading" | "completed" | "error" | "unavailable";
  received: number;
  total: number | null;
  error: string | null;
};

type QrTypeFilterScrollerProps = {
  types: string[];
  selectedType: string;
  onSelect: (type: string) => void;
};

const qrTypeIcons: Record<QrContentType, LucideIcon> = {
  website: Globe2,
  vcard: ContactRound,
  phone: Phone,
  text: Type
};

/* ------------------ BREAK ------------------ */

// Lists saved QR codes with search, refresh, and access to their existing form.
export default function QrCodesListScreen() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const searchPinProgress = useRef(new Animated.Value(0)).current;
  const isSearchPinnedRef = useRef(false);
  const [isSearchPinned, setIsSearchPinned] = useState(false);
  const [headingHeight, setHeadingHeight] = useState(44 + spacing.xs * 2);
  const cloudControllerRef = useRef<AbortController | null>(null);
  const [cloudState, setCloudState] = useState<CloudQrState>({ status: "idle", received: 0, total: null, error: null });
  const [isCloudDialogOpen, setIsCloudDialogOpen] = useState(false);
  const [state, setState] = useState<QrListState>({ records: [], loading: true, refreshing: false, error: null });

  // Collapses the totals and widens the fixed search after scrolling past 100 pixels.
  const handleListScroll = useCallback(({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const offset = nativeEvent.contentOffset.y;
    const pinned = isSearchPinnedRef.current ? offset > 60 : offset >= 100;
    if (pinned === isSearchPinnedRef.current) return;
    isSearchPinnedRef.current = pinned;
    setIsSearchPinned(pinned);
    Animated.timing(searchPinProgress, { toValue: pinned ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [searchPinProgress]);

  // Stops the header transition when the list screen unmounts.
  useEffect(() => () => searchPinProgress.stopAnimation(), [searchPinProgress]);

  // Reloads saved QR codes with the most recently created entries first.
  const loadQrCodes = useCallback(async (refreshing = false, background = false): Promise<void> => {
    setState((current) => ({ ...current, loading: refreshing || background ? current.loading : true, refreshing, error: null }));
    try {
      const records = await getAllQrCodes();
      records.sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
      setState({ records, loading: false, refreshing: false, error: null });
    } catch (error: unknown) {
      console.error("Unable to load saved QR codes:", error);
      setState((current) => ({ ...current, loading: false, refreshing: false, error: "Could not load your QR codes. Pull down to try again." }));
    };//try-catch ends
  }, []);

  // Fetches saved account QRs through GET and shows progress while SQLite pages arrive.
  const loadCloudQrCodes = useCallback(async (force = false): Promise<void> => {
    if (cloudControllerRef.current) return;
    const controller = new AbortController();
    cloudControllerRef.current = controller;
    setCloudState({ status: "loading", received: 0, total: null, error: null });
    try {
      const completed = await restoreUserQrCodes({
        force,
        signal: controller.signal,
        onPage: async () => { if (!controller.signal.aborted) await loadQrCodes(false, true); },
        onProgress: (received, total) => {
          if (!controller.signal.aborted) setCloudState({ status: "loading", received, total, error: null });
        }
      });
      if (!controller.signal.aborted) {
        setCloudState((current) => ({ ...current, status: completed ? "completed" : "unavailable" }));
      };//if ends
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setCloudState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Unable to download your saved QR codes." }));
      };//if ends
    } finally {
      if (cloudControllerRef.current === controller) cloudControllerRef.current = null;
    };//try-catch ends
  }, [loadQrCodes]);

  useFocusEffect(useCallback(() => {
    void loadQrCodes();
    let syncTimer: ReturnType<typeof setInterval> | null = null;
    let checksStarted = false;
    let checkGeneration = 0;

    // Runs cloud checks only while this list is focused and the app is active.
    const startCloudChecks = (): void => {
      if (checksStarted) return;
      checksStarted = true;
      const generation = ++checkGeneration;
      void loadCloudQrCodes().then(() => {
        if (generation !== checkGeneration) return;
        syncTimer = setInterval(() => { void loadCloudQrCodes(); }, QR_HISTORY_SYNC_WINDOW_MS);
      });
    };//func ends

    // Stops periodic checks and cancels downloads when the list is no longer visible.
    const stopCloudChecks = (): void => {
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = null;
      checksStarted = false;
      checkGeneration += 1;
      cloudControllerRef.current?.abort();
      cloudControllerRef.current = null;
    };//func ends

    if (AppState.currentState === "active") startCloudChecks();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") startCloudChecks();
      else stopCloudChecks();
    });
    return () => {
      stopCloudChecks();
      subscription.remove();
    };
  }, [loadQrCodes, loadCloudQrCodes]));

  const records = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.records.filter((record) =>
      (selectedType === "all" || getQrFilterType(record) === selectedType)
      && `${record.name} ${record.content} ${record.content_type || ""}`.toLowerCase().includes(query)
    );
  }, [state.records, search, selectedType]);
  const availableTypes = useMemo(() => ["all", ...new Set(state.records.map(getQrFilterType))], [state.records]);

  //Default Return
  return (
    <GeneralLayout scroll={false} edges={["left", "right", "bottom"]} topView={<TopNav title="My QR codes" />} bodyStyle={styles.body}>
      <View style={styles.screen}>
        <Animated.View style={[styles.searchControls, {
          paddingHorizontal: searchPinProgress.interpolate({ inputRange: [0, 1], outputRange: [spacing.lg, spacing.md] }),
          backgroundColor: searchPinProgress.interpolate({ inputRange: [0, 1], outputRange: [colors.cream.main, colors.white.main] }),
          shadowOpacity: searchPinProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
          elevation: searchPinProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 5] })
        }]}>
        <Animated.View
          pointerEvents={isSearchPinned ? "none" : "auto"}
          accessibilityElementsHidden={isSearchPinned}
          importantForAccessibility={isSearchPinned ? "no-hide-descendants" : "auto"}
          style={[styles.headingClip, {
            height: searchPinProgress.interpolate({ inputRange: [0, 1], outputRange: [headingHeight + spacing.xs, 0] }),
            opacity: searchPinProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{ translateY: searchPinProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -spacing.sm] }) }]
          }]}
        >
        <View style={styles.heading} onLayout={({ nativeEvent }) => setHeadingHeight(nativeEvent.layout.height)}>
          <View style={styles.headingCopy}>
            <Text style={styles.description}>Total QRs</Text>
            <Text style={styles.title}>{Math.max(cloudState.total ?? 0, state.records.length).toLocaleString()}</Text>
          </View>
          <Pressable
            accessibilityLabel={`${cloudState.status === "loading" ? "Downloading cloud QRs" : cloudState.status === "completed" ? "Cloud QRs downloaded" : "Cloud QRs need attention"}. Show cloud status.`}
            accessibilityRole="button"
            hitSlop={spacing.xs}
            onPress={() => setIsCloudDialogOpen(true)}
            style={styles.cloudStatus}
          >
            {cloudState.status === "loading" ? <ActivityIndicator size="small" color={colors.secondary.main} />
              : cloudState.status === "completed" ? <CloudCheck size={22} strokeWidth={1.25} color={colors.success.dark} />
                : <CloudAlert size={22} strokeWidth={1.25} color={colors.warning.dark} />}
          </Pressable>
          <Pressable accessibilityLabel="Create QR code" accessibilityRole="button" onPress={() => redirect("push", "/qrcodes/create")} style={styles.createButton}>
            <Plus size={20} strokeWidth={1.25} color={colors.white.main} />
            <Text style={styles.createText}>Create</Text>
          </Pressable>
        </View>
        </Animated.View>
        <View style={styles.searchShell}>
          <Search size={20} strokeWidth={1.25} color={colors.mute.main} />
          <TextInput accessibilityLabel="Search saved QR codes" autoCorrect={false} value={search} onChangeText={setSearch} placeholder="Search name or content" placeholderTextColor={colors.mute.light} style={styles.searchInput} returnKeyType="search" />
          {search ? <Pressable accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setSearch("")} hitSlop={spacing.xs}><X size={18} strokeWidth={1.25} color={colors.mute.main} /></Pressable> : null}
        </View>
        <QrTypeFilterScroller types={availableTypes} selectedType={selectedType} onSelect={setSelectedType} />
        </Animated.View>
        {state.loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.secondary.main} />
            <Text style={styles.description}>Loading your QR codes...</Text>
          </View>
        ) : (
          <FlatList
            style={styles.listViewport}
            data={records}
            keyExtractor={(record) => record.id}
            renderItem={renderQrItem}
            contentContainerStyle={[styles.list, records.length === 0 && styles.emptyList]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void loadQrCodes(true)} colors={[colors.secondary.main]} tintColor={colors.secondary.main} />}
            ListEmptyComponent={(
              <View style={styles.center}>
                <QrCodeIcon size={48} strokeWidth={1.25} color={colors.mute.light} />
                <Text style={styles.emptyTitle}>{state.error ? "QR codes unavailable" : search.trim() || selectedType !== "all" ? "No QR codes found" : "No QR codes yet"}</Text>
                <Text style={styles.emptyCopy}>{state.error || (search.trim() || selectedType !== "all" ? "Try another type or search term." : "Create your first QR code to see it here.")}</Text>
              </View>
            )}
          />
        )}
      </View>
      <PxDialog open={isCloudDialogOpen} setOpen={setIsCloudDialogOpen} title="Cloud QR history">
        <View style={styles.cloudDialog} accessibilityLiveRegion="polite">
          <Text style={styles.title}>
            {cloudState.status === "loading" ? "Downloading saved QRs…" : cloudState.status === "completed" ? "Saved QRs are on this device" : cloudState.status === "unavailable" ? "Cloud history unavailable" : "Cloud history needs attention"}
          </Text>
          <Text style={styles.description}>
            {cloudState.total !== null ? `${cloudState.received.toLocaleString()} of ${cloudState.total.toLocaleString()} QRs downloaded. ` : ""}
            {cloudState.status === "error" ? `${cloudState.error} Your local QRs remain available.`
              : cloudState.status === "unavailable" ? "Sign in on the mobile app to download your account's saved QRs."
                : cloudState.status === "completed" ? "Your account's saved QRs are available here for offline access."
                  : "Downloading your account's saved QRs. QRs already downloaded are available here."}
          </Text>
          <PxButton disabled={cloudState.status === "loading"} loading={cloudState.status === "loading"} onPress={() => void loadCloudQrCodes(true)}>Sync Again</PxButton>
        </View>
      </PxDialog>
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Groups unfinished QRs as drafts and saved content by its QR type.
function getQrFilterType(record: QrCode): string {
  return record.content ? record.content_type || "text" : "draft";
};//func ends

// Gives each horizontal QR filter a readable chip label.
function getQrFilterLabel(type: string): string {
  const labels: Record<string, string> = { all: "All", website: "Website", vcard: "vCard", phone: "Phone", text: "Text", draft: "Draft" };
  return labels[type] ?? type;
};//func ends

/* ------------------ BREAK ------------------ */

// Adds measured previous and next buttons to the horizontally scrollable QR filters.
function QrTypeFilterScroller({ types, selectedType, onSelect }: QrTypeFilterScrollerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const canScrollLeft = scrollOffset > 4;
  const canScrollRight = scrollOffset + viewportWidth < contentWidth - 4;

  // Moves the chip row by most of its visible width without passing either edge.
  const scrollTypes = (direction: "left" | "right"): void => {
    const step = Math.max(140, viewportWidth * 0.75);
    const requested = scrollOffset + (direction === "right" ? step : -step);
    scrollRef.current?.scrollTo({ x: Math.max(0, Math.min(contentWidth - viewportWidth, requested)), animated: true });
  };//func ends

  //Default Return
  return (
    <View style={styles.typeFilters}>
      {canScrollLeft ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Scroll QR types left" onPress={() => scrollTypes("left")} style={({ pressed }) => [styles.typeScrollButton, pressed && styles.pressed]}>
          <ChevronLeft size={20} strokeWidth={1.25} color={colors.mute.main} />
        </Pressable>
      ) : null}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.typeFilterScroll}
        contentContainerStyle={styles.typeFilterContent}
        onLayout={({ nativeEvent }) => setViewportWidth(nativeEvent.layout.width)}
        onContentSizeChange={(width) => setContentWidth(width)}
        onScroll={({ nativeEvent }) => setScrollOffset(nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
      >
        {types.map((type) => (
          <Pressable key={type} accessibilityRole="button" accessibilityLabel={`${selectedType === type && type !== "all" ? "Clear QR filter:" : "Filter QRs:"} ${getQrFilterLabel(type)}`} accessibilityState={{ selected: selectedType === type }} onPress={() => onSelect(selectedType === type ? "all" : type)} style={({ pressed }) => [styles.typeChip, selectedType === type && styles.selectedTypeChip, pressed && styles.pressed]}>
            <Text style={[styles.typeChipText, selectedType === type && styles.selectedTypeChipText]}>{getQrFilterLabel(type)}</Text>
            {selectedType === type && type !== "all" ? <X size={16} strokeWidth={1.25} color={colors.secondary.main} /> : null}
          </Pressable>
        ))}
      </ScrollView>
      {canScrollRight ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Scroll QR types right" onPress={() => scrollTypes("right")} style={({ pressed }) => [styles.typeScrollButton, pressed && styles.pressed]}>
          <ChevronRight size={20} strokeWidth={1.25} color={colors.mute.main} />
        </Pressable>
      ) : null}
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Shows one QR name, content summary, and creation date as an editable saved entry.
function renderQrItem({ item }: ListRenderItemInfo<QrCode>) {
  const Icon = item.content_type ? qrTypeIcons[item.content_type] : QrCodeIcon;
  const vcardVersion = item.content_type === "vcard" ? item.content.match(/^VERSION:([^\r\n]+)/im)?.[1].trim() : undefined;
  const contentPreview = item.content_type === "vcard" && item.content ? vcardVersion ? `Version ${vcardVersion}` : "vCard" : item.content || "Add content to finish this QR code";

  //Default Return
  return (
    <Pressable accessibilityLabel={`Edit ${item.name || "My Qr"}`} accessibilityRole="button" onPress={() => redirect("push", { pathname: "/qrcodes/create", params: { id: item.id } })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.qrIcon}><Icon size={24} strokeWidth={1.25} color={colors.primary.main} /></View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardName}>{item.name || "My Qr"}</Text>
        <Text numberOfLines={2} style={styles.cardContent}>{contentPreview}</Text>
        <View style={styles.metadata}>
          <Text style={styles.type}>{item.content ? item.content_type === "vcard" ? "vCard" : item.content_type || "Static QR" : "Draft"}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</Text>
        </View>
      </View>
      <ChevronRight size={20} strokeWidth={1.25} color={colors.mute.light} />
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.cream.main },
  screen: { flex: 1 },
  searchControls: { paddingTop: spacing.sm, paddingBottom: spacing.md, zIndex: 1, shadowColor: colors.primary.main, shadowOffset: { width: 0, height: spacing.xs }, shadowRadius: spacing.sm },
  headingClip: { overflow: "hidden" },
  listViewport: { flex: 1, paddingHorizontal: spacing.lg },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headingCopy: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cloudStatus: { padding: spacing.xs },
  cloudDialog: { gap: spacing.sm },
  title: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  createButton: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, paddingHorizontal: spacing.sm, minHeight: 44, borderRadius: radii.pill, backgroundColor: colors.secondary.main },
  createText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  searchShell: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main },
  searchInput: { flex: 1, minHeight: 48, color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  typeFilters: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, marginTop: spacing.sm },
  typeFilterScroll: { flex: 1, minWidth: 0 },
  typeScrollButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.pill, backgroundColor: colors.white.main },
  typeFilterContent: { gap: spacing.xs },
  typeChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.pill, backgroundColor: colors.white.main },
  selectedTypeChip: { borderColor: colors.secondary.light, backgroundColor: colors.secondary.light },
  typeChipText: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  selectedTypeChipText: { color: colors.secondary.dark, fontFamily: fontFamilies.primarySemiBold },
  list: { paddingBottom: spacing.lg, gap: spacing.sm },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.md },
  emptyTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  emptyCopy: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  pressed: { opacity: 0.7 },
  qrIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.neutral.light, borderRadius: radii.lg, backgroundColor: colors.white.main },
  cardCopy: { flex: 1, gap: spacing.xxs },
  cardName: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  cardContent: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  metadata: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  type: { color: colors.secondary.dark, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption, textTransform: "capitalize" },
  date: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption }
});
