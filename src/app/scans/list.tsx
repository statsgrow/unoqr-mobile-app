import { useCallback, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text } from "react-native-paper";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";

import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { UpiPaymentIcon } from "@/helpers/scans/components/UpiPaymentIcon";
import { getAllScans } from "@/helpers/scans/db/getQueries";
import { getScanTypeInit, normalizeScanType } from "@/helpers/scans/identifiers";
import { getScanCrawlError, getScanStatusColor, getScanStatusLabel } from "@/helpers/scans/status";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = Awaited<ReturnType<typeof getAllScans>>[number];

type ScanListState = {
  records: ScanRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

type ScanTypeFilter = {
  type: string;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  count: number;
};

type TypeFilterScrollerProps = {
  filters: ScanTypeFilter[];
  selectedType: string;
};

/* ------------------ BREAK ------------------ */

// Renders saved scan history with local SQLite-backed search and refresh controls.
export default function ScansListScreen() {
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const typeFilter = getRouteParam(params.type);
  const normalizedTypeFilter = typeFilter ? normalizeScanType(typeFilter) : "";
  const typeFilterInit = normalizedTypeFilter ? getScanTypeInit(normalizedTypeFilter) : null;
  const [searchText, setSearchText] = useState("");
  const [listState, setListState] = useState<ScanListState>({
    records: [],
    loading: true,
    refreshing: false,
    error: null
  });

  // Loads the latest scan rows from the on-device database.
  const loadScans = useCallback(async (refreshing = false) => {
    setListState((currentState) => ({
      ...currentState,
      loading: refreshing ? currentState.loading : true,
      refreshing,
      error: null
    }));

    try {
      const records = await getAllScans();
      const sortedRecords = [...records].sort(
        (firstRecord, secondRecord) =>
          new Date(secondRecord.created_at).getTime() - new Date(firstRecord.created_at).getTime()
      );

      setListState({ records: sortedRecords, loading: false, refreshing: false, error: null });
    } catch (error) {
      console.error("Error loading saved scans:", error);
      setListState((currentState) => ({
        ...currentState,
        loading: false,
        refreshing: false,
        error: "We could not load your saved scans."
      }));
    };//try ends
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadScans();
    }, [loadScans])
  );

  const filteredRecords = useMemo(
    () => filterScans(listState.records, searchText, normalizedTypeFilter),
    [listState.records, normalizedTypeFilter, searchText]
  );
  const availableTypeFilters = useMemo(
    () => createAvailableTypeFilters(listState.records),
    [listState.records]
  );

  //Default Return
  return (
    <GeneralLayout scroll={false} bodyStyle={styles.layoutBody}>
      <View style={styles.screen}>
        <PageHeader title="My Scans" />

        <View style={styles.filterControls}>
          <View style={styles.searchShell}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.mute.main} />
            <TextInput
              accessibilityLabel="Search saved scans"
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search value, status or location"
              placeholderTextColor={colors.mute.light}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {searchText ? (
              <MaterialCommunityIcons
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                name="close-circle"
                size={20}
                color={colors.mute.main}
                onPress={() => setSearchText("")}
              />
            ) : null}
          </View>

          {availableTypeFilters.length > 0 ? (
            <TypeFilterScroller
              filters={availableTypeFilters}
              selectedType={normalizedTypeFilter}
            />
          ) : null}
        </View>

        {listState.loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.secondary.main} />
            <Text style={styles.stateText}>Loading your scans…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRecords}
            keyExtractor={(record) => record.id}
            renderItem={renderScanItem}
            ItemSeparatorComponent={ScanSeparator}
            ListEmptyComponent={
              <EmptyScansState
                hasSearch={Boolean(searchText.trim())}
                typeLabel={typeFilterInit?.label ?? null}
                error={listState.error}
              />
            }
            contentContainerStyle={[
              styles.listContent,
              filteredRecords.length === 0 && styles.emptyListContent
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={listState.refreshing}
                onRefresh={() => void loadScans(true)}
                colors={[colors.secondary.main]}
                tintColor={colors.secondary.main}
              />
            }
          />
        )}
      </View>
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Keeps available type chips on one line with measured previous and next controls.
function TypeFilterScroller({ filters, selectedType }: TypeFilterScrollerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const canScrollLeft = scrollOffset > 4;
  const canScrollRight = scrollOffset + viewportWidth < contentWidth - 4;

  // Tracks the visible chip viewport after arrow controls take their space.
  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    setViewportWidth(nativeEvent.layout.width);
  };//func ends

  // Tracks manual and animated chip scrolling to toggle each arrow accurately.
  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(nativeEvent.contentOffset.x);
  };//func ends

  // Moves the chip row by most of its visible width in the requested direction.
  const handleArrowPress = (direction: "left" | "right") => {
    const scrollStep = Math.max(140, viewportWidth * 0.75);
    const maximumOffset = Math.max(0, contentWidth - viewportWidth);
    const requestedOffset = direction === "right"
      ? scrollOffset + scrollStep
      : scrollOffset - scrollStep;
    const nextOffset = Math.min(maximumOffset, Math.max(0, requestedOffset));

    scrollRef.current?.scrollTo({ x: nextOffset, animated: true });
  };//func ends

  //Default Return
  return (
    <View style={styles.typeFilterScroller}>
      {canScrollLeft ? (
        <TypeScrollButton direction="left" onPress={() => handleArrowPress("left")} />
      ) : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        onContentSizeChange={(width) => setContentWidth(width)}
        onLayout={handleLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.typeFilterScroll}
        contentContainerStyle={styles.typeFilterContent}
      >
        {filters.map((filter) => (
          <TypeFilterChip
            key={filter.type}
            filter={filter}
            selected={filter.type === selectedType}
          />
        ))}
      </ScrollView>

      {canScrollRight ? (
        <TypeScrollButton direction="right" onPress={() => handleArrowPress("right")} />
      ) : null}
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Renders one directional control for the horizontal type-chip scroller.
function TypeScrollButton({
  direction,
  onPress
}: {
  direction: "left" | "right";
  onPress: () => void;
}) {
  //Default Return
  return (
    <View style={styles.typeScrollControl}>
      <TypeScrollFade direction={direction} />
      <Pressable
        accessibilityLabel={`Scroll scan types ${direction}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.typeScrollButton, pressed && styles.typeScrollButtonPressed]}
      >
        <MaterialCommunityIcons
        name={direction === "left" ? "chevron-left" : "chevron-right"}
        size={21}
        color={colors.mute.main}
        />
      </Pressable>
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Fades each chip-row edge from cream near its arrow to transparent over the chips.
function TypeScrollFade({ direction }: { direction: "left" | "right" }) {
  const gradientId = `type-scroll-${direction}`;
  const isLeft = direction === "left";

  //Default Return
  return (
    <Svg
      pointerEvents="none"
      width={64}
      height={44}
      style={[styles.typeScrollFade, isLeft ? styles.leftTypeScrollFade : styles.rightTypeScrollFade]}
    >
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <Stop
            offset="0"
            stopColor={colors.cream.dark}
            stopOpacity={isLeft ? 0.86 : 0}
          />
          <Stop
            offset="1"
            stopColor={colors.cream.dark}
            stopOpacity={isLeft ? 0 : 0.86}
          />
        </SvgLinearGradient>
      </Defs>
      <Rect width={64} height={44} fill={`url(#${gradientId})`} />
    </Svg>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Displays one available SQLite scan type as a selectable filter chip.
function TypeFilterChip({ filter, selected }: { filter: ScanTypeFilter; selected: boolean }) {
  // Applies or clears the selected type through the list route query.
  const handlePress = () => {
    if (selected) {
      router.replace("/scans/list");
      return;
    };//if ends

    router.setParams({ type: filter.type });
  };//func ends

  //Default Return
  return (
    <Pressable
      accessibilityLabel={`${selected ? "Clear" : "Filter by"} ${filter.label}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.typeFilterChip,
        selected && styles.selectedTypeFilterChip,
        pressed && styles.typeFilterChipPressed
      ]}
    >
      <Text style={[styles.typeFilterText, selected && styles.selectedTypeFilterText]}>
        {filter.label}
      </Text>
      {selected ? (
        <MaterialCommunityIcons name="close" size={16} color={colors.secondary.main} />
      ) : null}
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Builds count-ranked filter chips only for scan types that exist in SQLite.
function createAvailableTypeFilters(records: ScanRecord[]): ScanTypeFilter[] {
  const countsByType = new Map<string, number>();

  records.forEach((record) => {
    const scanType = normalizeScanType(record.type);
    countsByType.set(scanType, (countsByType.get(scanType) || 0) + 1);
  });

  return [...countsByType.entries()]
    .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])
    .map(([type, count]) => {
      const typeInit = getScanTypeInit(type);
      return { type, count, label: typeInit.label, icon: typeInit.icon };
    });
};//func ends

/* ------------------ BREAK ------------------ */

// Filters scan records using their searchable local database fields.
function filterScans(records: ScanRecord[], searchText: string, typeFilter: string): ScanRecord[] {
  const normalizedSearch = searchText.trim().toLocaleLowerCase();
  const typeRecords = typeFilter
    ? records.filter((record) => normalizeScanType(record.type) === typeFilter)
    : records;

  if (!normalizedSearch) {
    return typeRecords;
  };//if ends

  return typeRecords.filter((record) =>
    [
      record.value,
      record.status,
      record.sync_status,
      record.metadata?.title,
      record.input_url,
      record.final_url,
      getLocationText(record.location)
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch))
  );
};//func ends

/* ------------------ BREAK ------------------ */

// Renders one saved scan as a compact history card.
function renderScanItem({ item }: ListRenderItemInfo<ScanRecord>) {
  const scanTypeInit = getScanTypeInit(item.type);
  const isUpiPayment = item.type === "upi_payment" || /^upi:\/\/pay(?:\?|$)/i.test(item.value);
  const displayTitle = item.metadata?.title
    || (item.type === "url" || item.type === "file"
      ? getDisplayUrl(item.final_url || item.input_url || item.value)
      : scanTypeInit.label);
  const location = getLocationText(item.location);
  const crawlError = getScanCrawlError(item.crawl_status, item.metadata?.error);
  const status = crawlError ? "failed" : item.status || "pending";
  const statusColor = getScanStatusColor(status);

  //Default Return
  return (
    <Pressable
      accessibilityHint="Shows all metadata collected for this scan"
      accessibilityLabel={`Open scan ${displayTitle}`}
      accessibilityRole="button"
      onPress={() => router.push(`/scans/${item.id}/view`)}
      style={({ pressed }) => [styles.scanCard, pressed && styles.scanCardPressed]}
    >
      {isUpiPayment ? (
        <UpiPaymentIcon size={46} />
      ) : (
        <View style={styles.scanIcon}>
          <MaterialCommunityIcons name={scanTypeInit.icon} size={24} color={colors.primary.main} />
        </View>
      )}
      <View style={styles.scanContent}>
        <Text numberOfLines={1} style={styles.scanTitle}>{displayTitle}</Text>
        <View style={styles.scanMetaRow}>
          <Text style={styles.scanDate}>{formatScanDate(item.created_at)}</Text>
          {location ? (
            <>
              <View style={styles.metaDot} />
              <Text numberOfLines={1} style={styles.scanLocation}>{location}</Text>
            </>
          ) : null}
        </View>
        {crawlError ? (
          <Text numberOfLines={2} style={styles.scanError}>{crawlError}</Text>
        ) : null}
      </View>
      <View
        accessible
        accessibilityLabel={`Status: ${getScanStatusLabel(status)}`}
        style={[styles.statusDot, { backgroundColor: statusColor }]}
      />
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.mute.light} />
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Displays the appropriate empty or error state for the scan list.
function EmptyScansState({
  hasSearch,
  typeLabel,
  error
}: {
  hasSearch: boolean;
  typeLabel: string | null;
  error: string | null;
}) {
  const icon = error ? "alert-circle-outline" : hasSearch ? "magnify" : typeLabel ? "filter-outline" : "history";
  const title = error
    ? "Unable to load scans"
    : hasSearch
      ? "No scans found"
      : typeLabel
        ? `No ${typeLabel} scans`
        : "No scans yet";
  const message = error
    ?? (hasSearch
      ? "Try searching with another URL, status or location."
      : typeLabel
        ? `Your saved ${typeLabel} scans will appear here.`
        : "Your saved QR scans will appear here after your first scan.");

  //Default Return
  return (
    <View style={styles.centerState}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={30} color={colors.secondary.main} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Converts an Expo query parameter into one scalar scan type value.
function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
};//func ends

/* ------------------ BREAK ------------------ */

// Adds consistent spacing between adjacent scan cards.
function ScanSeparator() {
  //Default Return
  return <View style={styles.separator} />;
};//func ends

/* ------------------ BREAK ------------------ */

// Extracts a readable host label from a scanned URL or value.
function getDisplayUrl(value: string): string {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.hostname.replace(/^www\./, "") || value;
  } catch {
    return value;
  };//try ends
};//func ends

/* ------------------ BREAK ------------------ */

// Combines the structured scan location into one searchable display value.
function getLocationText(location: ScanRecord["location"]): string | null {
  if (!location) return null;

  const parts = [location.city, location.state, location.country, location.pincode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
};//func ends

/* ------------------ BREAK ------------------ */

// Formats a stored timestamp for compact display in scan history.
function formatScanDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  };//if ends

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  layoutBody: {
    flex: 1
  },
  screen: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.lg * 0.6,
    backgroundColor: colors.cream.main
  },
  filterControls: {
    gap: spacing.xs
  },
  searchShell: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  typeFilterScroller: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    overflow: "hidden",
    borderRadius: radii.pill
  },
  typeFilterScroll: {
    minWidth: 0,
    flex: 1
  },
  typeFilterContent: {
    flexDirection: "row",
    gap: spacing.xs
  },
  typeScrollControl: {
    position: "relative",
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  typeScrollFade: {
    position: "absolute",
    top: 0
  },
  leftTypeScrollFade: {
    left: 0
  },
  rightTypeScrollFade: {
    right: 0
  },
  typeScrollButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.pill,
    backgroundColor: "rgba(250, 247, 242, 0.88)",
    zIndex: 1
  },
  typeScrollButtonPressed: {
    backgroundColor: colors.cream.dark
  },
  typeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.pill,
    backgroundColor: colors.white.main
  },
  selectedTypeFilterChip: {
    borderColor: colors.secondary.light,
    backgroundColor: colors.secondary.light
  },
  typeFilterText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  selectedTypeFilterText: {
    color: colors.secondary.dark,
    fontFamily: fontFamilies.primarySemiBold
  },
  typeFilterChipPressed: {
    opacity: 0.7
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body1
  },
  listContent: {
    paddingBottom: spacing.xl
  },
  emptyListContent: {
    flexGrow: 1
  },
  separator: {
    height: spacing.sm
  },
  scanCard: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  scanCardPressed: {
    opacity: 0.72
  },
  scanIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.neutral.light,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  scanContent: {
    minWidth: 0,
    flex: 1
  },
  scanTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body1
  },
  scanMetaRow: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs
  },
  scanDate: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption
  },
  metaDot: {
    width: 3,
    height: 3,
    marginHorizontal: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.mute.light
  },
  scanLocation: {
    minWidth: 0,
    flex: 1,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  scanError: {
    marginTop: spacing.xs,
    color: colors.error.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: radii.pill
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl
  },
  emptyIcon: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  emptyTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1,
    textAlign: "center"
  },
  stateText: {
    maxWidth: 290,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    textAlign: "center"
  }
});
