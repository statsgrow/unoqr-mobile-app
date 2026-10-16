import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarDays, Plus, X } from "lucide-react-native";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { PxTextArea } from "@/components/form/PxTextArea";
import { PxTextInput } from "@/components/form/PxTextInput";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { getDigitalCardContact, updateDigitalCardContact, type DigitalCardContactDetails } from "@/helpers/digital_cards/contacts/api";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";
import { Toast } from "@/utils/general/Toast";

/* ------------------ BREAK ------------------ */

type ContactSearchParams = { card_uid?: string | string[]; contact_id?: string | string[] };
type ContactDetailFieldProps = { label: string; value: string };

/* ------------------ BREAK ------------------ */

// Shows an owner's submitted contact and saves private tags and notes through the card-scoped API.
export default function DigitalCardContactScreen() {
  const params = useLocalSearchParams<ContactSearchParams>();
  const cardUid = Array.isArray(params.card_uid) ? params.card_uid[0] : params.card_uid;
  const contactId = Array.isArray(params.contact_id) ? params.contact_id[0] : params.contact_id;
  const [contact, setContact] = useState<DigitalCardContactDetails | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const saveRequest = useRef<AbortController | null>(null);

  // Fetches only the requested card/contact pair and cancels both reads and saves on navigation.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setContact(null);
    setTags([]);
    setTagDraft("");
    setNotes("");
    setSaving(false);
    // Loads the submitted identity and its current owner annotations.
    const loadContact = async (): Promise<void> => {
      try {
        if (!cardUid || !contactId) throw new Error("This contact link is incomplete.");
        const data = await getDigitalCardContact({ uid: cardUid, contactId, signal: controller.signal });
        if (controller.signal.aborted) return;
        setContact(data);
        setTags(data.tags ?? []);
        setNotes(data.notes ?? "");
      } catch (cause: unknown) {
        if (!controller.signal.aborted) setLoadError(GetError({ error: cause, message: "This contact could not be loaded." }).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      };//try-catch ends
    };//func ends
    void loadContact();
    return () => {
      controller.abort();
      saveRequest.current?.abort();
      saveRequest.current = null;
    };//return ends
  }, [cardUid, contactId, reloadKey]);

  // Reloads the saved contact through the layout's native pull-to-refresh control.
  function refreshContact(): void {
    if (loading || saving || saveRequest.current) return;
    Keyboard.dismiss();
    setReloadKey(key => key + 1);
  };//func ends

  // Returns to the contacts tab or the card preview when opening from a direct link.
  function goBack(): void {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/digital_cards/modify", params: { tab: "contacts" } });
  };//func ends

  // Adds one trimmed tag without duplicating an existing label.
  function addTag(): void {
    setTags(current => appendContactTag(current, tagDraft));
    setTagDraft("");
    setSaveError(null);
  };//func ends

  // Removes a tag from the pending annotations without changing the saved contact yet.
  function removeTag(tag: string): void {
    setTags(current => current.filter(value => value !== tag));
    setSaveError(null);
  };//func ends

  // Saves annotations, including any typed pending tag, and displays only API-confirmed values.
  async function saveContact(): Promise<void> {
    if (!cardUid || !contactId || !contact || saveRequest.current) return;
    const controller = new AbortController();
    saveRequest.current = controller;
    setSaving(true);
    setSaveError(null);
    Keyboard.dismiss();
    try {
      const data = await updateDigitalCardContact({ uid: cardUid, contactId, annotations: { tags: appendContactTag(tags, tagDraft), notes }, signal: controller.signal });
      if (controller.signal.aborted) return;
      setContact(data);
      setTags(data.tags ?? []);
      setNotes(data.notes ?? "");
      setTagDraft("");
      Toast.success({ message: "Contact tags and notes saved." });
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        const message = GetError({ error: cause, message: "Your changes could not be saved." }).message;
        setSaveError(message);
        Toast.error({ message });
      };//if ends
    } finally {
      if (!controller.signal.aborted) {
        saveRequest.current = null;
        setSaving(false);
      };//if ends
    };//try-catch ends
  };//func ends

  const fullName = contact ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") : "";
  const initial = Array.from(contact?.first_name.trim() ?? "")[0]?.toLocaleUpperCase() ?? "?";

  //Default Return
  return <GeneralLayout
    edges={["left", "right"]}
    pullToRefreshEnabled={!saving}
    refreshing={loading && reloadKey > 0}
    onRefresh={refreshContact}
    topView={<View style={styles.header}><HeaderBackButton onPress={goBack} /><Text style={styles.headerTitle}>Contact details</Text></View>}
    bodyStyle={styles.body}
    bottomNav={contact ? <View><PxButton fullWidth loading={saving} onPress={() => void saveContact()}>Save changes</PxButton></View> : null}
  >
    {loading ? <View accessibilityRole="progressbar" accessibilityLabel="Loading contact" style={styles.feedback}>
      <PxCircularProgress size={36} color={colors.secondary.main} />
    </View> : loadError ? <View style={styles.feedback}>
      <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
      <PxButton onPress={() => setReloadKey(key => key + 1)}>Try again</PxButton>
    </View> : contact ? <>
      <View style={styles.profile}>
        <View style={styles.avatarFrame}><View accessibilityLabel={fullName || "Contact"} style={styles.avatar}><Text style={styles.initial}>{initial}</Text></View></View>
        <Text style={styles.name}>{fullName || contact.email || contact.mobile || "Contact"}</Text>
        <View style={styles.submitted}><CalendarDays size={16} strokeWidth={1.25} color={colors.mute.main} /><Text style={styles.submittedDate}>{new Date(contact.created_at).toLocaleString()}</Text></View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact information</Text>
        <View style={styles.names}>
          <ContactDetailField label="First name" value={contact.first_name} />
          <ContactDetailField label="Last name" value={contact.last_name} />
        </View>
        <ContactDetailField label="Email" value={contact.email} />
        <ContactDetailField label="Mobile" value={contact.mobile} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
        {tags.length > 0 ? <View style={styles.tags}>
          {tags.map(tag => <Pressable key={tag} accessibilityRole="button" accessibilityLabel={`Remove tag ${tag}`} disabled={saving} onPress={() => removeTag(tag)} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text><X size={16} strokeWidth={1.25} color={colors.neutral.dark} />
          </Pressable>)}
        </View> : null}
        <View style={styles.tagInput}>
          <PxTextInput value={tagDraft} onChangeText={setTagDraft} autoCapitalize="none" placeholder="Add a tag" accessibilityLabel="New contact tag" fullWidth={false} style={styles.tagField} disabled={saving} returnKeyType="done" onSubmitEditing={addTag} />
          <Pressable accessibilityRole="button" accessibilityLabel="Add tag" disabled={saving || !/[a-z0-9]/i.test(tagDraft)} onPress={addTag} style={[styles.addTag, (saving || !/[a-z0-9]/i.test(tagDraft)) && styles.disabled]}><Plus size={22} strokeWidth={1.25} color={colors.white.main} /></Pressable>
        </View>
      </View>
      <PxTextArea label="Notes" value={notes} onChangeText={setNotes} disabled={saving} placeholder="Add a note about this contact" />
      {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
    </> : null}
  </GeneralLayout>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Keeps lowercase letters, numbers and spaces, removing empty and duplicate tags before saving.
function appendContactTag(tags: string[], value: string): string[] {
  return [...new Set([...tags, value].map(tag => tag.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/ +/g, " ").trim()).filter(Boolean))];
};//func ends

/* ------------------ BREAK ------------------ */

// Shows a submitted field without allowing the owner to overwrite visitor-provided identity.
function ContactDetailField({ label, value }: ContactDetailFieldProps) {
  //Default Return
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text selectable style={styles.detailValue}>{value || "—"}</Text></View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.sm, backgroundColor: colors.white.main },
  headerTitle: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.navigationTitle },
  body: { padding: spacing.md, gap: spacing.lg },
  profile: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  avatarFrame: { padding: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.neutral.light },
  avatar: { width: 88, height: 88, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: colors.black.light },
  initial: { color: colors.white.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h2 },
  name: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h4, textAlign: "center" },
  submitted: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  submittedDate: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  section: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.white.main, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl },
  sectionTitle: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  names: { flexDirection: "row", gap: spacing.md },
  detail: { flexGrow: 1, flexShrink: 1, gap: spacing.xxs },
  detailLabel: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  detailValue: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body1 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tag: { minHeight: 36, maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.line.light },
  tagText: { flexShrink: 1, color: colors.neutral.dark, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  tagInput: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  tagField: { flex: 1 },
  addTag: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.primary.main },
  disabled: { opacity: 0.4 },
  feedback: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.md },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, textAlign: "center" }
});
