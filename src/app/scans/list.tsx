import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItemInfo
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Text } from "react-native-paper";

import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { getAllScans } from "@/helpers/scans/db/getQueries";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScanRecord = Awaited<ReturnType<typeof getAllScans>>[number];

type ScanListState = {
  records: ScanRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

/* ------------------ BREAK ------------------ */

// Renders saved scan history with local SQLite-backed search and refresh controls.
export default function ScansListScreen() {
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
    () => filterScans(listState.records, searchText),
    [listState.records, searchText]
  );

  //Default Return
  return (
    <GeneralLayout scroll={false} bodyStyle={styles.layoutBody}>
      <View style={styles.screen}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.eyebrow}>SCAN HISTORY</Text>
            <Text style={styles.title}>My Scans</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{listState.records.length}</Text>
          </View>
        </View>

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
              <EmptyScansState hasSearch={Boolean(searchText.trim())} error={listState.error} />
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

// Filters scan records using their searchable local database fields.
function filterScans(records: ScanRecord[], searchText: string): ScanRecord[] {
  const normalizedSearch = searchText.trim().toLocaleLowerCase();

  if (!normalizedSearch) {
    return records;
  };//if ends

  return records.filter((record) =>
    [record.value, record.status, record.location]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch))
  );
};//func ends

/* ------------------ BREAK ------------------ */

// Renders one saved scan as a compact history card.
function renderScanItem({ item }: ListRenderItemInfo<ScanRecord>) {
  const displayUrl = getDisplayUrl(item.value);
  const statusColor = getStatusColor(item.status);

  //Default Return
  return (
    <View style={styles.scanCard}>
      <View style={styles.scanIcon}>
        <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.secondary.main} />
      </View>
      <View style={styles.scanContent}>
        <Text numberOfLines={1} style={styles.scanTitle}>{displayUrl}</Text>
        <Text numberOfLines={1} style={styles.scanUrl}>{item.value}</Text>
        <View style={styles.scanMetaRow}>
          <Text style={styles.scanDate}>{formatScanDate(item.created_at)}</Text>
          {item.location ? (
            <>
              <View style={styles.metaDot} />
              <Text numberOfLines={1} style={styles.scanLocation}>{item.location}</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text numberOfLines={1} style={[styles.statusText, { color: statusColor }]}>
          {formatStatus(item.status)}
        </Text>
      </View>
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Displays the appropriate empty or error state for the scan list.
function EmptyScansState({ hasSearch, error }: { hasSearch: boolean; error: string | null }) {
  const icon = error ? "alert-circle-outline" : hasSearch ? "magnify" : "history";
  const title = error ? "Unable to load scans" : hasSearch ? "No scans found" : "No scans yet";
  const message = error
    ?? (hasSearch
      ? "Try searching with another URL, status or location."
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

// Converts a stored scan status into a readable label.
function formatStatus(status: string): string {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};//func ends

/* ------------------ BREAK ------------------ */

// Selects a semantic badge color for the scan processing status.
function getStatusColor(status: string): string {
  const normalizedStatus = status.toLocaleLowerCase();

  if (["complete", "completed", "processed", "synced", "success"].includes(normalizedStatus)) {
    return colors.success.dark;
  };//if ends

  if (["failed", "error"].includes(normalizedStatus)) {
    return colors.error.main;
  };//if ends

  return colors.warning.dark;
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  layoutBody: {
    flex: 1
  },
  screen: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.cream.main
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  eyebrow: {
    marginBottom: spacing.xxs,
    color: colors.secondary.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    letterSpacing: 1.8
  },
  title: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h4
  },
  countBadge: {
    minWidth: 42,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  countText: {
    color: colors.secondary.dark,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body2
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
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  scanIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.light
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
  scanUrl: {
    marginTop: spacing.xxs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
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
  statusBadge: {
    maxWidth: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill
  },
  statusText: {
    flexShrink: 1,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.caption
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
