import { Download, Mail, MapPin, Phone } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

import SocialIcon from "./SocialIcon";
import type { DigitalCardFooterProps, DigitalCardLayoutProps } from "./types";

/* ------------------ BREAK ------------------ */

type CardBodyProps = DigitalCardLayoutProps & { centered?: boolean; dark?: boolean; minimal?: boolean; hasCover?: boolean };
type ContactRowProps = { kind: "phone" | "email" | "address"; value: string; dark: boolean; onOpenLink?: (url: string) => void };

/* ------------------ BREAK ------------------ */

// Shares identity, social links and contact rows between all four native layouts.
export function CardBody({ data, primaryColor, onOpenLink, centered = false, dark = false, minimal = false, hasCover = false }: CardBodyProps) {
  const textColor = dark ? colors.white.main : colors.primary.main;
  const mutedColor = dark ? colors.neutral.light : colors.mute.main;
  const initials = data.fullname.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("");
  //Default Return
  return <View style={[styles.body, hasCover && styles.coverBody]}>
    <View style={[styles.avatar, centered && styles.centeredAvatar, minimal && styles.squareAvatar, dark && { borderColor: primaryColor }]}>
      <Text accessibilityElementsHidden={Boolean(data.photo)} importantForAccessibility={data.photo ? "no-hide-descendants" : "auto"} style={[styles.initials, { color: primaryColor }]}>{initials}</Text>
      {data.photo ? <Image source={data.photo} resizeMode="cover" style={styles.photo} /> : null}
    </View>
    <View style={[styles.identity, centered && styles.centeredIdentity, minimal && [styles.minimalIdentity, { borderLeftColor: primaryColor }]]}>
      <Text style={[styles.name, { color: textColor }, centered && styles.centeredText]}>{data.fullname}</Text>
      {data.position ? <Text style={[styles.position, { color: mutedColor }, centered && styles.centeredText]}>{data.position}</Text> : null}
      {data.company ? <Text style={[styles.company, { color: mutedColor }, centered && styles.centeredText]}>{data.company}</Text> : null}
    </View>
    {data.bio ? <Text style={[styles.bio, { color: textColor }, centered && styles.centeredText]}>{data.bio}</Text> : null}
    {data.socialLinks.length ? <View style={[styles.socials, centered && styles.centeredSocials]}>
      {data.socialLinks.map((link, index) => <Pressable key={index} accessibilityRole="link" accessibilityLabel={link.label} onPress={() => onOpenLink?.(link.url)} style={[styles.social, { borderColor: centered ? textColor : primaryColor }]}>
        <SocialIcon label={link.label} color={textColor} />
      </Pressable>)}
    </View> : null}
    {data.phones.some((phone) => phone.value.trim()) || data.emails.some((email) => email.value.trim()) || data.address ? <View style={[styles.contacts, dark && styles.darkContacts]}>
      {data.phones.filter((phone) => phone.value.trim()).map((phone, index) => <ContactRow key={`phone-${index}`} kind="phone" value={phone.value} dark={dark} onOpenLink={onOpenLink} />)}
      {data.emails.filter((email) => email.value.trim()).map((email, index) => <ContactRow key={`email-${index}`} kind="email" value={email.value} dark={dark} onOpenLink={onOpenLink} />)}
      {data.address ? <ContactRow kind="address" value={data.address} dark={dark} onOpenLink={onOpenLink} /> : null}
    </View> : null}
  </View>;//return ends
};//export ends

// Hides the card footer for layout samples and keeps real card contact actions available.
export function CardFooter({ primaryColor, allowSaveContact, onSaveContact, saving = false, isPreview = false }: DigitalCardFooterProps) {
  if (isPreview) return null;
  //Default Return
  return <View style={styles.footer}>
    {allowSaveContact ? <Pressable accessibilityRole="button" disabled={saving} onPress={onSaveContact} style={[styles.saveContact, { backgroundColor: primaryColor }]}>
      {saving ? <PxCircularProgress color={colors.white.main} size={20} /> : <Download size={20} color={colors.white.main} strokeWidth={1.25} />}
      <Text style={styles.saveText}>{saving ? "Saving…" : "Save Contact"}</Text>
    </Pressable> : null}
    <View style={styles.brand}><Text style={styles.brandText}>Made with</Text><UnoQrLogo width={70} /></View>
  </View>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Opens phone, email and map actions with readable multiline contact values.
function ContactRow({ kind, value, dark, onOpenLink }: ContactRowProps) {
  const Icon = kind === "phone" ? Phone : kind === "email" ? Mail : MapPin;
  const url = kind === "phone" ? `tel:${value.replace(/[^+\d]/g, "")}` : kind === "email" ? `mailto:${value}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
  const color = dark ? colors.neutral.light : colors.neutral.main;
  //Default Return
  return <Pressable accessibilityRole="link" onPress={() => onOpenLink?.(url)} style={styles.contact}>
    <Icon size={20} strokeWidth={1.25} color={color} />
    <Text style={[styles.contactText, { color }]}>{value}</Text>
  </Pressable>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg + spacing.xxs, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  coverBody: { marginTop: -56, paddingTop: 0 },
  avatar: { width: 112, height: 112, borderRadius: radii.pill, borderWidth: 4, borderColor: colors.white.main, backgroundColor: colors.cream.main, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  centeredAvatar: { alignSelf: "center" },
  squareAvatar: { borderRadius: radii.xl },
  photo: { position: "absolute", width: "100%", height: "100%" },
  initials: { fontSize: fontSizes.h3, fontFamily: fontFamilies.primaryBold },
  identity: { marginTop: spacing.lg },
  centeredIdentity: { alignItems: "center" },
  minimalIdentity: { borderLeftWidth: 4, paddingLeft: spacing.md },
  name: { fontSize: fontSizes.h3, lineHeight: 38, fontFamily: fontFamilies.primaryBold },
  position: { marginTop: spacing.sm, fontSize: fontSizes.body1, lineHeight: 24, fontFamily: fontFamilies.primaryRegular },
  company: { marginTop: spacing.xxs, fontSize: fontSizes.body1, lineHeight: 24, fontFamily: fontFamilies.primaryRegular },
  bio: { marginTop: spacing.lg + spacing.xxs, fontSize: fontSizes.button, lineHeight: 28, fontFamily: fontFamilies.primaryRegular },
  centeredText: { textAlign: "center" },
  socials: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.lg },
  centeredSocials: { justifyContent: "center" },
  social: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: radii.pill },
  contacts: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line.main },
  darkContacts: { borderTopColor: colors.primary.light },
  contact: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48, paddingVertical: spacing.xs },
  contactText: { flex: 1, fontSize: fontSizes.button, lineHeight: 24, fontFamily: fontFamilies.primaryRegular },
  footer: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md, backgroundColor: colors.cream.main },
  saveContact: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, minHeight: 48, padding: spacing.sm, borderRadius: radii.lg },
  saveText: { fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button, color: colors.white.main },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  brandText: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption }
});
