import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ArrowUpRight, ChevronRight, ContactRound } from "lucide-react-native";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { HomeAnalytics } from "@/components/home/HomeAnalytics";
import { getDigitalCard, type RemoteCard } from "@/helpers/digital_cards/api/cards";
import { GeneralLayout } from "@/components/layout/GeneralLayout";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { redirect } from "@/utils/general/Redirect";

/* ------------------ BREAK ------------------ */

// Renders the app home route inside the shared general layout.
export default function HomeScreen() {
  const [loadingCard, setLoadingCard] = useState(true);
  const [card, setCard] = useState<RemoteCard | null>(null);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);

  // Loads the account's saved card on Home entry and after returning from its editor.
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingCard(true);
    void getDigitalCard().then(saved => {
      if (active) setCard(saved);
    }).catch(() => {
      console.warn("Unable to refresh the Home digital card.");
    }).finally(() => {
      if (active) setLoadingCard(false);
    });
    return () => { active = false; };
  }, []));

  //Default Return
  return (
    <GeneralLayout scroll={false}>
      <HomeAnalytics topContent={(
        <Pressable
          disabled={loadingCard}
          accessibilityState={{ busy: loadingCard, disabled: loadingCard }}
          accessibilityLabel={loadingCard ? "Loading your Digital Business Card" : card ? `View ${card.name}’s Digital Business Card` : "Create Digital Business Card"}
          accessibilityRole="button"
          onPress={() => redirect("push", "/digital_cards/modify")}
          style={({ pressed }) => [styles.digitalCard, pressed && styles.pressed]}
        >
          <View pointerEvents="none" style={styles.cardPattern} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.patternWash} />
            <View style={[styles.patternRing, styles.patternRingOuter]} />
            <View style={[styles.patternRing, styles.patternRingInner]} />
          </View>
          {/* Keeps the original content height as the sizing reference for both states. */}
          <View style={[styles.createContent, (card || loadingCard) && styles.hiddenContent]} accessibilityElementsHidden={Boolean(card) || loadingCard} importantForAccessibility={card || loadingCard ? "no-hide-descendants" : "auto"}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardIcon}>
                <ContactRound size={22} strokeWidth={1.25} color={colors.secondary.main} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Create Digital Business Card</Text>
                <Text style={styles.cardDescription}>Your details. Your QR. One card to share.</Text>
              </View>
            </View>
            <View style={styles.cardAction}>
              <View style={styles.freePill}>
                <Text style={styles.freeText}>Free</Text>
              </View>
              <View style={styles.cardActionLabel}>
                <Text style={styles.cardActionText}>Get started</Text>
                <ArrowUpRight size={18} strokeWidth={1.25} color={colors.white.main} />
              </View>
            </View>
          </View>
          {loadingCard ? <View style={styles.savedCard}>
            <View style={styles.avatarBorder}>
              <View style={[styles.avatar, styles.loadingAvatar]}>
                <ActivityIndicator color={colors.white.main} />
              </View>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardHeading}>My Digital Business Card</Text>
              <Text style={styles.cardDescription}>Loading your card…</Text>
            </View>
          </View> : card ? <View style={styles.savedCard}>
            <View style={styles.avatarBorder}>
            <View style={styles.avatar}>
              {card.photo_url && failedPhoto !== card.photo_url ? <Image source={{ uri: card.photo_url }} style={styles.avatarImage} onError={() => setFailedPhoto(card.photo_url)} /> : <Text style={styles.avatarInitial}>{card.name.trim().slice(0, 1).toUpperCase()}</Text>}
            </View>
            </View>
            <View style={styles.cardContent}>
              <Text numberOfLines={1} style={styles.cardHeading}>My Digital Business Card</Text>
              <Text numberOfLines={1} style={styles.cardTitle}>{card.name}</Text>
              {card.position ? <Text numberOfLines={1} style={styles.cardDescription}>{card.position}</Text> : null}
            </View>
            <ChevronRight size={24} strokeWidth={1.25} color={colors.white.main} />
          </View> : null}
        </Pressable>
      )} />
    </GeneralLayout>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  digitalCard: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.xl, overflow: "hidden", backgroundColor: colors.neutral.dark },
  cardPattern: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden" },
  patternWash: { position: "absolute", width: 220, height: 220, bottom: -170, left: -40, borderRadius: radii.pill, backgroundColor: colors.neutral.light, opacity: 0.06 },
  patternRing: { position: "absolute", borderRadius: radii.pill, borderWidth: 1, borderColor: colors.neutral.light, opacity: 0.12 },
  patternRingOuter: { width: 280, height: 280, top: -190, right: -80 },
  patternRingInner: { width: 220, height: 220, top: -160, right: -50 },
  createContent: { gap: spacing.sm },
  hiddenContent: { opacity: 0 },
  savedCard: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  cardHeading: { color: colors.neutral.light, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.caption },
  avatarBorder: { padding: 3, borderWidth: 1, borderColor: colors.white.main, borderRadius: radii.pill },
  avatar: { width: 56, height: 56, borderRadius: radii.pill, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.secondary.light },
  loadingAvatar: { backgroundColor: "transparent" },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarInitial: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h5 },
  pressed: { opacity: 0.8 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardIcon: { width: spacing.xl + spacing.xs, height: spacing.xl + spacing.xs, alignItems: "center", justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.secondary.light },
  cardContent: { flex: 1, gap: spacing.xxs },
  freePill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.secondary.light },
  freeText: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption },
  cardTitle: { color: colors.white.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.subtitle1 },
  cardDescription: { color: colors.neutral.light, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  cardAction: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardActionLabel: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  cardActionText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body2 }
});
