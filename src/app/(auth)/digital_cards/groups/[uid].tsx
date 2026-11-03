import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronRight, ContactRound, Settings, Trash2, UsersRound } from "lucide-react-native";
import { Alert, FlatList, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxSkeleton } from "@/components/elements/PxSkeleton";
import { PxSelect } from "@/components/form/PxSelect";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import type { DigitalCardAnalyticsPeriod } from "@/helpers/digital_cards/analytics/api";
import DigitalCardContactItem from "@/helpers/digital_cards/contacts/components/DigitalCardContactItem";
import { deleteGroup, getGroup, getGroupAnalytics, getGroupCards, getGroupContacts, getGroupUsers, removeGroupCard, removeGroupUser } from "@/helpers/digital_cards/groups/api";
import GroupAddDialog from "@/helpers/digital_cards/groups/dialogs/GroupAddDialog";
import GroupFormDialog from "@/helpers/digital_cards/groups/dialogs/GroupFormDialog";
import type { DigitalCardGroup, GroupAnalytics, GroupCard, GroupContact, GroupUser } from "@/helpers/digital_cards/groups/types";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { useUser } from "@/utils/auth/AuthUserContext";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

type Tab = "cards" | "members" | "contacts" | "analytics";
type GroupRow = GroupCard | GroupUser | GroupContact;
const metrics = [
  { key: "card_views", label: "Card views" }, { key: "qr_card_views", label: "QR card views" },
  { key: "contact_downloads_started", label: "Contact downloads started" }, { key: "contacts_submitted", label: "Contacts submitted" }
] as const;

/* ------------------ BREAK ------------------ */

// Shows a group's shared dashboard while restricting all management actions to its API-confirmed owner.
export default function DigitalCardGroupScreen() {
  const user = useUser();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const [group, setGroup] = useState<DigitalCardGroup | null>(null);
  const [tab, setTab] = useState<Tab>("cards");
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [count, setCount] = useState(0);
  const [from, setFrom] = useState(0);
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
  const [period, setPeriod] = useState<DigitalCardAnalyticsPeriod>("30");
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [groupRevision, setGroupRevision] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [addKind, setAddKind] = useState<"cards" | "members" | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  const owner = group?.user_id === user.id;

  // Prevents a completed mutation from updating a page that has already left the navigation stack.
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Reauthorizes access whenever the group page regains focus, including after membership removal.
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setGroup(null); setRows([]); setAnalytics(null); setFrom(0); setLoadingGroup(true); setLoading(true); setError(null); setActionError(null);
    void getGroup(uid, controller.signal).then(loaded => {
      if (!controller.signal.aborted) { setGroup(loaded); setTab(current => loaded.user_id !== user.id && current === "members" ? "cards" : current); };//if ends
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "This group could not be opened." }).message);
    }).finally(() => { if (!controller.signal.aborted) setLoadingGroup(false); });
    return () => controller.abort();//return ends
  }, [uid, user.id, groupRevision]));

  // Reads only the active tab, cancelling old pages and date ranges before displaying newer data.
  useEffect(() => {
    if (!group) return;
    const controller = new AbortController();
    setLoading(true); setError(null);
    if (tab === "analytics") setAnalytics(null);
    // Keeps analytics and paginated list responses on their distinct typed API contracts.
    async function load(): Promise<void> {
      try {
        if (tab === "analytics") {
          const data = await getGroupAnalytics(group!.uid, period, controller.signal);
          if (!controller.signal.aborted) setAnalytics(data);
        } else {
          const page = tab === "cards" ? await getGroupCards(group!.uid, from, controller.signal)
            : tab === "members" ? await getGroupUsers(group!.uid, from, controller.signal)
              : await getGroupContacts(group!.uid, from, controller.signal);
          if (!controller.signal.aborted) {
            setRows(current => from === 0 ? page.data : [...new Map([...current, ...page.data].map(row => [row.id, row])).values()]);
            setCount(page.count);
          };//if ends
        };//if ends
      } catch (cause: unknown) {
        if (!controller.signal.aborted) setError(GetError({ error: cause, message: "This group's information could not be loaded." }).message);
      } finally { if (!controller.signal.aborted) setLoading(false); };//try-catch ends
    };//func ends
    void load();
    return () => controller.abort();//return ends
  }, [group, tab, from, period, revision]);

  // Reloads the current tab from its first page without keeping another tab's records visible.
  function refresh(): void { setLoading(true); setError(null); setRows([]); setCount(0); setFrom(0); setAnalytics(null); setRevision(value => value + 1); };//func ends

  // Confirms and serializes owner-only removals before asking the API to change any links.
  function confirmRemoval(kind: "group" | "card" | "member", identity?: string): void {
    if (!owner || busy) return;
    const message = kind === "group" ? "This removes the group and its memberships. Cards and accounts will remain."
      : kind === "card" ? "This removes the card from this group. The card and its other groups will remain."
        : "This member will lose access to this group's cards, contacts and analytics.";
    Alert.alert(kind === "group" ? "Delete group?" : kind === "card" ? "Remove card from group?" : "Remove group member?", message, [
      { text: "Cancel", style: "cancel" },
      { text: kind === "group" ? "Delete group" : "Remove", style: "destructive", onPress: () => void remove(kind, identity) }
    ]);
  };//func ends

  // Updates local lists only after the API accepts the exact owner-scoped removal.
  async function remove(kind: "group" | "card" | "member", identity?: string): Promise<void> {
    if (!group || !owner || locked.current) return;
    locked.current = true; setBusy(true); setActionError(null);
    try {
      if (kind === "group") await deleteGroup(group.uid);
      else if (identity && kind === "card") await removeGroupCard(group.uid, identity);
      else if (identity) await removeGroupUser(group.uid, identity);
      if (!mounted.current) return;
      if (kind === "group") router.replace("/digital_cards/groups");
      else refresh();
    } catch (cause: unknown) {
      if (mounted.current) setActionError(GetError({ error: cause, message: "Your change could not be saved." }).message);
    } finally { locked.current = false; if (mounted.current) setBusy(false); };//try-catch ends
  };//func ends

  // Opens only supported contact destinations without allowing submitted URLs to launch arbitrary schemes.
  async function openContact(kind: "email" | "mobile", value: string): Promise<void> {
    try { await Linking.openURL(kind === "email" ? `mailto:${encodeURIComponent(value)}` : `tel:${value.replace(/[^+0-9]/g, "")}`); }
    catch { setActionError("This contact could not be opened on your device."); };//try-catch ends
  };//func ends

  const tabs: { value: Tab; label: string }[] = [{ value: "cards", label: "Cards" }, { value: "contacts", label: "Contacts" }, { value: "analytics", label: "Analytics" }, ...(owner ? [{ value: "members" as const, label: "Members" }] : [])];

  //Default Return
  return <>
    <GeneralLayout scroll={false} edges={[]} topView={<View>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/digital_cards/groups")} />
        <View style={styles.headingCopy}><Text numberOfLines={1} style={styles.title}>{group?.name || "Card group"}</Text>{group ? <Text style={styles.caption}>{owner ? "Owner" : "Member · View only"}</Text> : null}</View>
        {owner ? <Pressable accessibilityRole="button" accessibilityLabel="Group settings" disabled={busy} onPress={() => { setActionError(null); setEditOpen(true); }} style={styles.iconButton}><Settings size={22} strokeWidth={1.25} color={colors.primary.main} /></Pressable> : null}
      </View>
      {group ? <View style={styles.tabs} accessibilityRole="tablist">{tabs.map(item => <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: tab === item.value }} onPress={() => { if (tab !== item.value) { setTab(item.value); refresh(); } }} style={[styles.tab, tab === item.value && styles.activeTab]}><Text style={[styles.tabText, tab === item.value && styles.activeText]}>{item.label}</Text></Pressable>)}</View> : null}
    </View>} bottomNav={owner && (tab === "cards" || tab === "members") ? <View style={styles.actions}><PxButton mode="contained" color="primary" fullWidth disabled={busy || loadingGroup} onPress={() => setAddKind(tab === "members" ? "members" : "cards")}>{tab === "members" ? "Add member" : "Add existing card"}</PxButton>{tab === "cards" ? <PxButton mode="outlined" fullWidth disabled={busy || loadingGroup} onPress={() => router.push({ pathname: "/digital_cards/modify", params: { new: "1", mode: "edit", group_uid: group.uid } })}>Create a new card</PxButton> : null}</View> : undefined}>
      {actionError ? <Text accessibilityRole="alert" style={[styles.error, styles.feedback]}>{actionError}</Text> : null}
      {loadingGroup ? <View style={styles.content}><PxSkeleton width="40%" height={fontSizes.h6} />{tab === "analytics" ? <GroupAnalyticsSkeleton /> : <GroupRowsSkeleton tab={tab} />}</View> : !group ? <View style={styles.message}><Text accessibilityRole="alert" style={styles.error}>{error || "This group is unavailable."}</Text><PxButton onPress={() => setGroupRevision(value => value + 1)}>Try again</PxButton></View> : tab === "analytics" ? <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}>
        <Text style={styles.sectionHeading}>Group Analytics</Text>
        <PxSelect label="Date range" value={period} onValueChange={value => { if (value === period) return; setLoading(true); setAnalytics(null); setPeriod(value as DigitalCardAnalyticsPeriod); }} options={[{ label: "Last 7 days", value: "7" }, { label: "Last 30 days", value: "30" }, { label: "All time", value: "all" }]} />
        {loading ? <GroupAnalyticsSkeleton /> : error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PxButton onPress={refresh}>Try again</PxButton></> : analytics ? <>
          <Text style={styles.name}>{analytics.cards.length} {analytics.cards.length === 1 ? "card" : "cards"}</Text>
          <View style={styles.metrics}>{metrics.map(metric => <View key={metric.key} style={styles.metric}><Text style={styles.metricValue}>{analytics.summary[metric.key].toLocaleString()}</Text><Text style={styles.hint}>{metric.label}</Text></View>)}</View>
        </> : null}
      </ScrollView> : <FlatList data={rows} keyExtractor={row => row.id} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading && rows.length > 0 && from === 0} onRefresh={refresh} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}
        ListHeaderComponent={<View style={styles.intro}><Text style={styles.sectionHeading}>{tab === "cards" ? "Group Cards" : tab === "contacts" ? "Group Contacts" : "Group Members"}</Text></View>}
        renderItem={({ item }) => tab === "cards" ? <GroupCardRow link={item as GroupCard} busy={busy} onPreview={() => router.push({ pathname: "/digital_cards/modify", params: { uid: (item as GroupCard).card.uid, group_uid: group.uid, mode: "preview" } })} onRemove={owner ? () => confirmRemoval("card", (item as GroupCard).card.uid) : undefined} />
          : tab === "members" ? <GroupMemberRow membership={item as GroupUser} userId={user.id} busy={busy} onRemove={() => confirmRemoval("member", item.id)} />
            : <DigitalCardContactItem contact={item as GroupContact} sourceName={(item as GroupContact).card.fullname || (item as GroupContact).card.name} showAvailability onEmail={() => void openContact("email", (item as GroupContact).email)} onMobile={() => void openContact("mobile", (item as GroupContact).mobile)} onPress={owner ? () => router.push({ pathname: "/digital_cards/[card_uid]/contacts/view_single", params: { card_uid: (item as GroupContact).card.uid, contact_id: item.id } }) : undefined} />}
        ListEmptyComponent={!loading && !error ? <View style={styles.message}><Text style={styles.hint}>{tab === "cards" ? "No cards in this group yet." : tab === "members" ? "No members added yet. You already have owner access." : "No contacts submitted yet."}</Text></View> : null}
        ListFooterComponent={<View style={styles.feedback}>{loading ? <GroupRowsSkeleton tab={tab} /> : error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PxButton onPress={() => setRevision(value => value + 1)}>Try again</PxButton></> : rows.length < count ? <PxButton mode="outlined" onPress={() => setFrom(rows.length)}>Load more</PxButton> : null}</View>}
      />}
    </GeneralLayout>
    {owner && group ? <><GroupFormDialog group={group} open={editOpen} setOpen={setEditOpen} onDelete={() => confirmRemoval("group")} deleting={busy} deleteError={actionError} onSaved={saved => { setGroup(saved); refresh(); }} /><GroupAddDialog kind={addKind || "cards"} groupUid={group.uid} ownerId={user.id} open={addKind !== null} setOpen={value => { if (!value) setAddKind(null); }} onSaved={refresh} linkedCardUids={tab === "cards" ? (rows as GroupCard[]).map(row => row.card.uid) : []} /></> : null}
  </>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Displays one linked card with separate preview and owner-only unlink actions.
function GroupCardRow({ link, busy, onPreview, onRemove }: { link: GroupCard; busy: boolean; onPreview: () => void; onRemove?: () => void }) {
  const { card } = link;
  //Default Return
  return <View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${card.fullname || card.name}`} onPress={onPreview} style={styles.cardLink}>
      {card.photo_url ? <Image source={{ uri: card.photo_url }} style={styles.avatar} /> : <View style={styles.avatar}><ContactRound size={24} strokeWidth={1.25} color={colors.mute.main} /></View>}
      <View style={styles.copy}><Text style={styles.name}>{card.fullname || card.name}</Text><Text style={styles.hint}>{[card.position, card.company].filter(Boolean).join(" · ")}</Text><Text style={styles.caption}>{card.status === "published" ? "Published" : "Unpublished"}</Text></View>
      <ChevronRight size={18} strokeWidth={1.25} color={colors.mute.main} />
    </Pressable>
    {onRemove ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${card.fullname || card.name} from group`} disabled={busy} onPress={onRemove} style={styles.iconButton}><Trash2 size={18} strokeWidth={1.25} color={colors.error.main} /></Pressable> : null}
  </View>;//return ends
};//func ends

// Shows the account identifier supplied by the API and supports removing deleted-account memberships.
function GroupMemberRow({ membership, userId, busy, onRemove }: { membership: GroupUser; userId: string; busy: boolean; onRemove: () => void }) {
  //Default Return
  return <View style={styles.row}>
    <UsersRound size={22} strokeWidth={1.25} color={colors.secondary.main} />
    <View style={styles.copy}><Text style={styles.name}>{membership.user_id === userId ? "You" : membership.user_id ? "Member" : "Deleted account"}</Text><Text selectable style={styles.caption}>{membership.user_id || "Account no longer exists"}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Remove group member" disabled={busy} onPress={onRemove} style={styles.iconButton}><Trash2 size={18} strokeWidth={1.25} color={colors.error.main} /></Pressable>
  </View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Reserves card, contact or membership row dimensions with the preview's three fading skeletons.
function GroupRowsSkeleton({ tab }: { tab: Exclude<Tab, "analytics"> }) {
  const height = tab === "contacts" ? 44 + 2 * (spacing.xxs + spacing.md + 1) + 2 * (fontSizes.caption + spacing.xs)
    : (tab === "cards" ? 64 : 44) + 2 * (spacing.sm + 1);
  //Default Return
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={`Loading group ${tab}`} accessibilityState={{ busy: true }} style={styles.loadingRows}>
    {[1, 0.8, 0.6].map(opacity => <PxSkeleton key={opacity} width="100%" height={height} opacity={opacity} />)}
  </View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Mirrors the preview analytics metric grid while the group's selected date range loads.
function GroupAnalyticsSkeleton() {
  //Default Return
  return <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading group analytics" accessibilityState={{ busy: true }} style={styles.loadingRows}>
    <PxSkeleton width={80} height={fontSizes.body1} />
    <View style={styles.metrics}>{metrics.map(metric => <View key={metric.key} style={styles.metricSkeleton}><PxSkeleton width="100%" height={spacing.xl * 3 + spacing.sm} /></View>)}</View>
  </View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  headingCopy: { flex: 1, gap: spacing.xxs },
  title: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle },
  iconButton: { minHeight: 44, minWidth: 40, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", margin: spacing.md, padding: spacing.xxs, backgroundColor: colors.cream.dark, borderRadius: radii.pill },
  tab: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: radii.pill },
  activeTab: { backgroundColor: colors.primary.main },
  tabText: { fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption, color: colors.mute.dark },
  activeText: { color: colors.white.main },
  content: { padding: spacing.md, gap: spacing.sm },
  sectionHeading: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  intro: { gap: spacing.xs, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.white.main, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, padding: spacing.sm },
  cardLink: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 64 },
  avatar: { width: 48, height: 48, borderRadius: radii.lg, backgroundColor: colors.cream.dark, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: spacing.xxs },
  name: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  caption: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  message: { flex: 1, padding: spacing.lg, minHeight: 140, alignItems: "center", justifyContent: "center", gap: spacing.md },
  feedback: { paddingVertical: spacing.md, alignItems: "center", gap: spacing.sm },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  actions: { gap: spacing.xs },
  loadingRows: { width: "100%", gap: spacing.sm },
  metricSkeleton: { width: "47%", flexGrow: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { width: "47%", flexGrow: 1, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, padding: spacing.md, gap: spacing.xs, backgroundColor: colors.white.main },
  metricValue: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h4 }
});
