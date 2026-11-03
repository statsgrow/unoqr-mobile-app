import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { PxModal } from "@/components/elements/PxModal";
import { PxSelect } from "@/components/form/PxSelect";
import { PxTextInput } from "@/components/form/PxTextInput";
import { colors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

import { addGroupCard, addGroupUser, getOwnedGroupCandidates } from "../api";
import type { GroupCardSummary } from "../types";

/* ------------------ BREAK ------------------ */

type Props = { kind: "cards" | "members"; groupUid: string; ownerId: string; open: boolean; setOpen: (open: boolean) => void; onSaved: () => void; linkedCardUids: string[] };
type Values = { email: string };

/* ------------------ BREAK ------------------ */

// Adds an owned card or existing account while leaving API ownership and membership checks authoritative.
export default function GroupAddDialog({ kind, groupUid, ownerId, open, setOpen, onSaved, linkedCardUids }: Props) {
  const form = useForm<Values>({ defaultValues: { email: "" }, shouldUnregister: true });
  const [cards, setCards] = useState<GroupCardSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [from, setFrom] = useState(0);
  const [count, setCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Clears previous selections and validation every time the owner opens a fresh sheet.
  useEffect(() => {
    if (!open) return;
    form.reset({ email: "" }); setSelected(""); setCards([]); setFrom(0); setCount(0); setLoadedCount(0); setError(null);
    setReloadKey(key => key + 1);
  }, [open, kind, groupUid, form.reset]);

  // Fetches live owned identities so a missing local card never silently disappears from the selector.
  useEffect(() => {
    if (!open || kind !== "cards") return;
    const controller = new AbortController();
    setLoading(true); setError(null);
    void getOwnedGroupCandidates(ownerId, from, controller.signal).then(page => {
      if (controller.signal.aborted) return;
      setCards(current => from === 0 ? page.data : [...new Map([...current, ...page.data].map(card => [card.uid, card])).values()]);
      setCount(page.count); setLoadedCount(from + page.data.length);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Your cards could not be loaded." }).message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();//return ends
  }, [open, kind, groupUid, ownerId, from, reloadKey]);

  // Waits for API confirmation before refreshing the group's visible list.
  async function submit(values: Values): Promise<void> {
    if (saving) return;
    if (kind === "cards" && !selected) { setError("Choose a card to add."); return; };//if ends
    setSaving(true); setError(null);
    try {
      if (kind === "cards") await addGroupCard(groupUid, selected);
      else await addGroupUser(groupUid, values.email.trim().toLowerCase());
      onSaved(); setOpen(false);
    } catch (cause: unknown) {
      setError(GetError({ error: cause, message: kind === "cards" ? "The card could not be added." : "The member could not be added." }).message);
    } finally { setSaving(false); };//try-catch ends
  };//func ends

  const options = cards.filter(card => !linkedCardUids.includes(card.uid)).map(card => ({ label: `${card.fullname || card.name}${card.position ? ` · ${card.position}` : ""}`, value: card.uid }));

  //Default Return
  return <PxModal open={open} setOpen={value => { if (!saving) setOpen(value); }} name={kind === "cards" ? "Add card to group" : "Add group member"} footerAction={<View>
    <PxButton mode="contained" color="primary" fullWidth loading={saving} disabled={saving || (kind === "cards" && (!selected || loading))} onPress={form.handleSubmit(submit)}>{kind === "cards" ? "Add card" : "Add member"}</PxButton>
  </View>}>
    <View style={styles.body}>
      {kind === "cards" ? <>
        <Text style={styles.hint}>Choose a card you own. Cards can belong to more than one group.</Text>
        {options.length ? <PxSelect label="Digital card" value={selected} onValueChange={setSelected} options={options} /> : !loading && !error ? <Text style={styles.hint}>{count ? "All loaded cards are already in this group." : "Create a digital card before adding it to a group."}</Text> : null}
        {loading ? <PxCircularProgress size={28} color={colors.secondary.main} /> : loadedCount < count ? <PxButton onPress={() => setFrom(loadedCount)}>Load more cards</PxButton> : null}
        {error && !loading ? <PxButton onPress={() => setReloadKey(key => key + 1)}>Reload cards</PxButton> : null}
      </> : <>
        <Text style={styles.hint}>Members can view group cards, contacts and analytics. Only you can manage the group.</Text>
        <PxTextInput RHF={form} name="email" type="email" label="Member email" helperText="Enter the email they use to sign in to UnoQR. They must already have an account." rules={{ required: "Enter the member’s sign-in email.", validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || "Enter a valid email address." }} />
      </>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  </PxModal>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingHorizontal: spacing.lg },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
