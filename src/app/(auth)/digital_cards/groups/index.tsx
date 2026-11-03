import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ChevronRight, Plus, UsersRound } from "lucide-react-native";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxSkeleton } from "@/components/elements/PxSkeleton";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { getGroups } from "@/helpers/digital_cards/groups/api";
import GroupFormDialog from "@/helpers/digital_cards/groups/dialogs/GroupFormDialog";
import type { DigitalCardGroupSummary } from "@/helpers/digital_cards/groups/types";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { useUser } from "@/utils/auth/AuthUserContext";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

// Opens owned and joined card groups with live pagination, group creation.
export default function DigitalCardGroupsScreen() {
  const user = useUser();
  const [joined, setJoined] = useState(false);
  const [groups, setGroups] = useState<DigitalCardGroupSummary[]>([]);
  const [from, setFrom] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  // Rechecks membership on return so revoked access and deleted groups are not retained as offline data.
  useFocusEffect(useCallback(() => { setFrom(0); setRevision(value => value + 1); }, [user.id]));

  // Cancels the previous account/list read when switching tabs or requesting another page.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    void getGroups({ joined, from, signal: controller.signal }).then(page => {
      if (controller.signal.aborted) return;
      setGroups(current => from === 0 ? page.data : [...new Map([...current, ...page.data].map(group => [group.uid, group])).values()]);
      setCount(page.count);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Groups could not be loaded. Check your connection and try again." }).message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();//return ends
  }, [joined, from, revision, user.id]);

  // Clears visible records before reloading the first page of the selected group category.
  function refresh(): void { setLoading(true); setGroups([]); setCount(0); setFrom(0); setRevision(value => value + 1); };//func ends

  //Default Return
  return <>
    <GeneralLayout scroll={false} edges={[]} bodyStyle={styles.body} topView={<View style={styles.header}>
      <HeaderBackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/digital_cards/list")} />
      <Text style={styles.title}>Card groups</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Create card group" onPress={() => setCreateOpen(true)} style={styles.iconButton}><Plus size={24} strokeWidth={1.25} color={colors.primary.main} /></Pressable>
    </View>}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {[false, true].map(value => <Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{ selected: joined === value }} onPress={() => { setLoading(true); setJoined(value); setGroups([]); setCount(0); setFrom(0); }} style={[styles.tab, joined === value && styles.selectedTab]}>
          <Text style={[styles.tabText, joined === value && styles.selectedText]}>{value ? "Joined groups" : "My groups"}</Text>
        </Pressable>)}
      </View>
      <FlatList data={groups} keyExtractor={group => group.uid} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading && groups.length > 0 && from === 0} onRefresh={refresh} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}
        ListHeaderComponent={<View style={styles.intro}>
          <Text style={styles.hint}>{count} {count === 1 ? "Group" : "Groups"}</Text>
        </View>}
        renderItem={({ item: group }) => <GroupRow group={group} owner={group.user_id === user.id} />}
        ListEmptyComponent={!loading && !error ? <View style={styles.empty}><UsersRound size={40} strokeWidth={1.25} color={colors.mute.main} /><Text style={styles.name}>{joined ? "No joined groups yet" : "Your teams start here"}</Text><Text style={styles.hint}>{joined ? "Ask the group owner to add you using your UnoQR sign-in email." : "Create a group such as Sales, Admin or Marketing."}</Text>{!joined ? <PxButton mode="contained" onPress={() => setCreateOpen(true)}>Create group</PxButton> : null}</View> : null}
        ListFooterComponent={<View style={styles.feedback}>{loading ? <GroupListSkeleton /> : error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PxButton onPress={() => setRevision(value => value + 1)}>Try again</PxButton></> : groups.length < count ? <PxButton mode="outlined" onPress={() => setFrom(groups.length)}>Load more</PxButton> : null}</View>}
      />
    </GeneralLayout>
    <GroupFormDialog open={createOpen} setOpen={setCreateOpen} onSaved={group => { setJoined(false); refresh(); router.push({ pathname: "/digital_cards/groups/[uid]", params: { uid: group.uid } }); }} />
  </>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Matches the group rows with three placeholders fading toward the bottom.
function GroupListSkeleton() {
  //Default Return
  return <View style={styles.skeletonList}>
    {[1, 0.8, 0.6].map(opacity => <PxSkeleton key={opacity} width="100%" height={116} opacity={opacity} />)}
  </View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Displays the photo previews delivered with the group list without additional requests.
function GroupRow({ group, owner }: { group: DigitalCardGroupSummary; owner: boolean }) {
  // Older deployments omit previews until the API update is deployed.
  const photos = group.card_avatars ?? [];
  const remaining = Math.max(0, (group.card_count ?? 0) - photos.length);

  //Default Return
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${group.name}`} onPress={() => router.push({ pathname: "/digital_cards/groups/[uid]", params: { uid: group.uid } })} style={styles.group}>
    <View style={styles.copyArea}>
      <View style={styles.groupHeading}><Text numberOfLines={1} style={[styles.name, styles.groupName]}>{group.name}</Text><View style={styles.roleChip}><Text style={styles.role}>{owner ? "Owner" : "Member"}</Text></View></View>
      {group.card_count > 0 ? <View style={styles.avatars} accessibilityLabel={`${group.card_count} cards in group`}>
        {photos.map((item, index) => <Image key={item.uid} source={{ uri: item.photo_url }} style={[styles.avatar, index > 0 && styles.overlap]} />)}
        {remaining > 0 ? <View style={[styles.avatar, styles.remainingAvatar, photos.length > 0 && styles.overlap]}><Text style={styles.remainingText}>{remaining}+</Text></View> : null}
      </View> : null}
    </View>
    <ChevronRight size={20} strokeWidth={1.25} color={colors.mute.main} />
  </Pressable>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { gap: 0 },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  title: { flex: 1, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle, color: colors.primary.main },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", margin: spacing.md, padding: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.cream.dark },
  tab: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: radii.pill },
  selectedTab: { backgroundColor: colors.primary.main },
  tabText: { color: colors.mute.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 },
  selectedText: { color: colors.white.main },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.md, gap: spacing.sm },
  intro: { marginBottom: spacing.xxs },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  group: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  groupHeading: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  groupName: { flexShrink: 1 },
  copyArea: { flex: 1, gap: spacing.xs },
  name: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  avatars: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 36, height: 36, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.white.main, backgroundColor: colors.cream.dark },
  overlap: { marginLeft: -10 },
  remainingAvatar: { alignItems: "center", justifyContent: "center", backgroundColor: colors.cream.dark },
  remainingText: { color: colors.mute.dark, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption },
  roleChip: { flexShrink: 0, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.secondary.light },
  role: { color: colors.secondary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  empty: { paddingVertical: spacing.xl, gap: spacing.md, alignItems: "center" },
  skeletonList: { width: "100%", gap: spacing.sm },
  feedback: { gap: spacing.sm, alignItems: "center" },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
