import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DigitalCardContact } from "@/helpers/digital_cards/contacts/api";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type Props = {
  contact: DigitalCardContact;
  sourceName?: string;
  onPress?: () => void;
  showDetails?: boolean;
  showAvailability?: boolean;
  onEmail?: () => void;
  onMobile?: () => void;
};

/* ------------------ BREAK ------------------ */

// Reuses the same initial avatar, contact name and date row in card previews and group contacts.
export default function DigitalCardContactItem({ contact, sourceName, onPress, showDetails = false, showAvailability = false, onEmail, onMobile }: Props) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "?";

  //Default Return
  return <Pressable accessible={Boolean(onPress)} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={onPress ? `View contact ${name || "Contact"}` : undefined} onPress={onPress} style={styles.contact}>
    <View style={styles.avatarFrame}><View style={styles.avatar}><Text style={styles.initial}>{initial}</Text></View></View>
    <View style={styles.details}>
      <Text style={styles.name}>{name || "Contact"}</Text>
      {sourceName ? <Text numberOfLines={1} style={styles.secondary}>From {sourceName}</Text> : null}
      <Text style={styles.secondary}>{new Date(contact.created_at).toLocaleString()}</Text>
      {showDetails && contact.email ? <Text selectable style={styles.secondary}>{contact.email}</Text> : null}
      {showDetails && contact.mobile ? <Text selectable style={styles.secondary}>{contact.mobile}</Text> : null}
      {showAvailability && (contact.email?.trim() || contact.mobile?.trim()) ? <View style={styles.chips}>
        {contact.email?.trim() ? <Pressable accessibilityRole={onEmail ? "button" : undefined} accessibilityLabel="Email contact" onPress={event => { event.stopPropagation(); onEmail?.(); }} style={styles.chip}><Text style={styles.chipText}>Email</Text></Pressable> : null}
        {contact.mobile?.trim() ? <Pressable accessibilityRole={onMobile ? "button" : undefined} accessibilityLabel="Call contact" onPress={event => { event.stopPropagation(); onMobile?.(); }} style={styles.chip}><Text style={styles.chipText}>Mobile</Text></Pressable> : null}
      </View> : null}
    </View>
    {onPress ? <ChevronRight size={20} strokeWidth={1.25} color={colors.mute.main} /> : null}
  </Pressable>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  contact: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  avatarFrame: { padding: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.neutral.light },
  avatar: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: colors.black.light },
  initial: { color: colors.white.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6 },
  details: { flex: 1, gap: spacing.xs },
  name: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1 },
  secondary: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { borderRadius: radii.pill, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, backgroundColor: colors.line.light },
  chipText: { color: colors.mute.dark, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption }
});
