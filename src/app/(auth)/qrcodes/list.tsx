import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ChevronRight, Plus, QrCode as QrCodeIcon, Search, X } from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from "react-native";

import { redirect } from "@/utils/general/Redirect";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { TopNav } from "@/components/layout/TopNav";
import { getAllQrCodes } from "@/helpers/qrcodes/db/getQr";
import type { QrCode } from "@/helpers/qrcodes/db/initQrCodes";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type QrListState = {
  records: QrCode[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

/* ------------------ BREAK ------------------ */

// Lists saved QR codes with search, refresh, and access to their existing form.
export default function QrCodesListScreen() {
  const [search, setSearch] = useState("");
  const [state, setState] = useState<QrListState>({ records: [], loading: true, refreshing: false, error: null });

  // Reloads saved QR codes with the most recently created entries first.
  const loadQrCodes = useCallback(async (refreshing = false): Promise<void> => {
    setState((current) => ({ ...current, loading: !refreshing, refreshing, error: null }));
    try {
      const records = await getAllQrCodes();
      records.sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at));
      setState({ records, loading: false, refreshing: false, error: null });
    } catch (error: unknown) {
      console.error("Unable to load saved QR codes:", error);
      setState((current) => ({ ...current, loading: false, refreshing: false, error: "Could not load your QR codes. Pull down to try again." }));
    };//try-catch ends
  }, []);

  useFocusEffect(useCallback(() => {
    void loadQrCodes();
  }, [loadQrCodes]));

  const records = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.records.filter((record) => `${record.name} ${record.content} ${record.content_type || ""}`.toLowerCase().includes(query));
  }, [state.records, search]);

  //Default Return
  return (
    <GeneralLayout scroll={false} edges={["left", "right", "bottom"]} topView={<TopNav title="My QR codes" />} bodyStyle={styles.body}>
      <View style={styles.screen}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>Your QR collection</Text>
            <Text style={styles.description}>Open a QR code to edit or download it.</Text>
          </View>
          <Pressable accessibilityLabel="Create QR code" accessibilityRole="button" onPress={() => redirect("push", "/qrcodes/create")} style={styles.createButton}>
            <Plus size={20} color={colors.white.main} />
            <Text style={styles.createText}>Create</Text>
          </Pressable>
        </View>
        <View style={styles.searchShell}>
          <Search size={20} color={colors.mute.main} />
          <TextInput accessibilityLabel="Search saved QR codes" autoCorrect={false} value={search} onChangeText={setSearch} placeholder="Search name or content" placeholderTextColor={colors.mute.light} style={styles.searchInput} returnKeyType="search" />
          {search ? <Pressable accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setSearch("")} hitSlop={spacing.xs}><X size={18} color={colors.mute.main} /></Pressable> : null}
        </View>
        {state.loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.secondary.main} />
            <Text style={styles.description}>Loading your QR codes...</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(record) => record.id}
            renderItem={renderQrItem}
            contentContainerStyle={[styles.list, records.length === 0 && styles.emptyList]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void loadQrCodes(true)} colors={[colors.secondary.main]} tintColor={colors.secondary.main} />}
            ListEmptyComponent={(
              <View style={styles.center}>
                <QrCodeIcon size={48} strokeWidth={1.25} color={colors.mute.light} />
                <Text style={styles.emptyTitle}>{state.error ? "QR codes unavailable" : search.trim() ? "No QR codes found" : "No QR codes yet"}</Text>
                <Text style={styles.emptyCopy}>{state.error || (search.trim() ? "Try another name or search term." : "Create your first QR code to see it here.")}</Text>
              </View>
            )}
          />
        )}
      </View>
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Shows one QR name, content summary, and creation date as an editable saved entry.
function renderQrItem({ item }: ListRenderItemInfo<QrCode>) {
  //Default Return
  return (
    <Pressable accessibilityLabel={`Edit ${item.name || "My Qr"}`} accessibilityRole="button" onPress={() => redirect("push", { pathname: "/qrcodes/create", params: { id: item.id } })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.qrIcon}><QrCodeIcon size={28} strokeWidth={1.5} color={colors.neutral.main} /></View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardName}>{item.name || "My Qr"}</Text>
        <Text numberOfLines={2} style={styles.cardContent}>{item.content || "Add content to finish this QR code"}</Text>
        <View style={styles.metadata}>
          <Text style={styles.type}>{item.content ? item.content_type === "vcard" ? "vCard" : item.content_type || "Static QR" : "Draft"}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</Text>
        </View>
      </View>
      <ChevronRight size={20} strokeWidth={1.5} color={colors.mute.light} />
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.cream.main },
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headingCopy: { flex: 1, gap: spacing.xxs },
  title: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  createButton: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, paddingHorizontal: spacing.sm, minHeight: 44, borderRadius: radii.pill, backgroundColor: colors.secondary.main },
  createText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  searchShell: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.pill, backgroundColor: colors.white.main },
  searchInput: { flex: 1, minHeight: 48, color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  list: { paddingBottom: spacing.lg, gap: spacing.sm },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.md },
  emptyTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  emptyCopy: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  pressed: { opacity: 0.7 },
  qrIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.cream.dark },
  cardCopy: { flex: 1, gap: spacing.xxs },
  cardName: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  cardContent: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  metadata: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  type: { color: colors.secondary.dark, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption, textTransform: "capitalize" },
  date: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption }
});
