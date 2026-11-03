import { useEffect, useState } from "react";
import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import DigitalCardContactItem from "@/helpers/digital_cards/contacts/components/DigitalCardContactItem";
import { PxButton } from "@/components/elements/PxButton";
import { PxSkeleton } from "@/components/elements/PxSkeleton";
import { colors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";
import { getGroupCardContacts } from "@/helpers/digital_cards/groups/api";
import GetError from "@/utils/general/Error";

import { getDigitalCardContacts, type DigitalCardContact } from "./api";

/* ------------------ BREAK ------------------ */

type DigitalCardContactsProps = { uid: string; groupUid?: string };

/* ------------------ BREAK ------------------ */

// Lists the current card's submitted contacts with owner authorization, refresh and pagination.
export default function DigitalCardContacts({ uid, groupUid }: DigitalCardContactsProps) {
  const [contacts, setContacts] = useState<DigitalCardContact[]>([]);
  const [count, setCount] = useState(0);
  const [from, setFrom] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Cancels stale contact requests when changing tabs or refreshing the first page.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const request = groupUid ? getGroupCardContacts(uid, groupUid, from, controller.signal) : getDigitalCardContacts({ uid, from, signal: controller.signal });
    void request.then((response) => {
      if (controller.signal.aborted) return;
      setContacts(current => from === 0 ? response.data : [...current, ...response.data]);
      setCount(response.count);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Submitted contacts could not be loaded." }).message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();//return ends
  }, [uid, groupUid, from, reloadKey]);

  // Clears the previous contacts immediately so refresh displays only the loading skeletons.
  function refreshContacts(): void {
    setContacts([]);
    setCount(0);
    setLoading(true);
    setError(null);
    setFrom(0);
    setReloadKey(key => key + 1);
  };//func ends

  // Requests the next page only while more saved submissions remain.
  function loadMoreContacts(): void {
    if (!loading && contacts.length < count) setFrom(contacts.length);
  };//func ends

  // Retries the failed page without resetting the current list position.
  function retryContacts(): void { setReloadKey(key => key + 1); };//func ends

  //Default Return
  return <FlatList
    style={styles.root}
    contentContainerStyle={styles.content}
    data={contacts}
    keyExtractor={contact => contact.id}
    renderItem={({ item }) => <DigitalCardContactItem contact={item} showDetails={Boolean(groupUid)} onPress={groupUid ? undefined : () => router.push({ pathname: "/digital_cards/[card_uid]/contacts/view_single", params: { card_uid: uid, contact_id: item.id } })} />}
    refreshControl={<RefreshControl refreshing={loading && contacts.length > 0 && from === 0} onRefresh={refreshContacts} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}
    ListHeaderComponent={<View style={styles.heading}>
      <Text style={styles.title}>Submitted contacts</Text>
      {contacts.length > 0 ? <Text style={styles.count}>{count.toLocaleString()}</Text> : null}
    </View>}
    ListEmptyComponent={!loading && !error ? <Text style={styles.message}>No contacts have been submitted for this card yet.</Text> : null}
    ListFooterComponent={<View style={styles.feedback}>
      {loading ? <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading submitted contacts" accessibilityState={{ busy: true }} style={styles.loader}>
        {[1, 0.8, 0.6].map(opacity => <PxSkeleton key={opacity} width="100%" height={44 + 2 * (spacing.xxs + spacing.md + 1)} opacity={opacity} />)}
      </View> : error ? <>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <PxButton onPress={retryContacts}>Try again</PxButton>
      </> : contacts.length < count ? <PxButton mode="outlined" onPress={loadMoreContacts}>Load more</PxButton> : null}
    </View>}
  />;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingBottom: spacing.xs },
  title: { flex: 1, color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  count: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  message: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  feedback: { gap: spacing.md, alignItems: "center" },
  loader: { width: "100%", gap: spacing.sm },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" }
});
