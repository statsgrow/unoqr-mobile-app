import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

import { getDigitalCardContacts, type DigitalCardContact } from "./api";

/* ------------------ BREAK ------------------ */

type DigitalCardContactsProps = { uid: string };
type ContactRowProps = { uid: string; contact: DigitalCardContact };

/* ------------------ BREAK ------------------ */

// Lists the current card's submitted contacts with owner authorization, refresh and pagination.
export default function DigitalCardContacts({ uid }: DigitalCardContactsProps) {
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
    void getDigitalCardContacts({ uid, from, signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      setContacts(current => from === 0 ? response.data : [...current, ...response.data]);
      setCount(response.count);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Submitted contacts could not be loaded." }).message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();//return ends
  }, [uid, from, reloadKey]);

  // Replaces the list with the latest first page while retaining visible contacts during refresh.
  function refreshContacts(): void {
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
    renderItem={({ item }) => <ContactRow uid={uid} contact={item} />}
    refreshControl={<RefreshControl refreshing={loading && contacts.length > 0 && from === 0} onRefresh={refreshContacts} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />}
    ListHeaderComponent={<View style={styles.heading}>
      <Text style={styles.title}>Submitted contacts</Text>
      {contacts.length > 0 ? <Text style={styles.count}>{count.toLocaleString()}</Text> : null}
    </View>}
    ListEmptyComponent={!loading && !error ? <Text style={styles.message}>No contacts have been submitted for this card yet.</Text> : null}
    ListFooterComponent={<View style={styles.feedback}>
      {loading ? <View accessibilityRole="progressbar" accessibilityLabel="Loading submitted contacts" style={styles.loader}>
        <PxCircularProgress size={32} color={colors.secondary.main} />
      </View> : error ? <>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <PxButton onPress={retryContacts}>Try again</PxButton>
      </> : contacts.length < count ? <PxButton mode="outlined" onPress={loadMoreContacts}>Load more</PxButton> : null}
    </View>}
  />;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Displays a contact's initial avatar, name and submission time with a centered navigation chevron.
function ContactRow({ uid, contact }: ContactRowProps) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const initial = Array.from(contact.first_name.trim())[0]?.toLocaleUpperCase() ?? "?";

  //Default Return
  return <Pressable accessibilityRole="button" accessibilityLabel={`View contact ${name || "Contact"}`} onPress={() => router.push({ pathname: "/digital_cards/[card_uid]/contacts/view_single", params: { card_uid: uid, contact_id: contact.id } })} style={styles.contact}>
    <View style={styles.avatarFrame}><View style={styles.avatar}><Text style={styles.initial}>{initial}</Text></View></View>
    <View style={styles.contactDetails}>
      <Text style={styles.name}>{name || "Contact"}</Text>
      <Text style={styles.date}>{new Date(contact.created_at).toLocaleString()}</Text>
    </View>
    <ChevronRight size={20} strokeWidth={1.25} color={colors.mute.main} />
  </Pressable>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingBottom: spacing.xs },
  title: { flex: 1, color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.h6 },
  count: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  contact: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  avatarFrame: { padding: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.neutral.light },
  avatar: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: colors.black.light },
  initial: { color: colors.white.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6 },
  contactDetails: { flex: 1, gap: spacing.xs },
  name: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  date: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  message: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  feedback: { gap: spacing.md, alignItems: "center" },
  loader: { paddingVertical: spacing.xl },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" }
});
