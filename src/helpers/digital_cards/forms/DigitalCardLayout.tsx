import { useEffect } from "react";
import Svg, { ClipPath, Defs, Path } from "react-native-svg";
import { Check, Download, Globe, Mail, MapPin, Phone } from "lucide-react-native";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CalendlyIcon from "@/assets/svg/digital-cards/calendly.svg";
import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { BottomNav } from "@/components/layout/BottomNav";
import type { DigitalCardLayoutType } from "@/helpers/digital_cards/model";
import QrColorPicker from "@/helpers/qrcodes/create/QrColorPicker";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type DigitalCardLayoutProps = {
  refreshing: boolean;
  onRefresh: () => void;
  layout: DigitalCardLayoutType;
  primaryColor: string;
  onDraftChange: (layout: DigitalCardLayoutType, primaryColor: string) => void;
  onSave: (layout: DigitalCardLayoutType, primaryColor: string) => Promise<void>;
};
type LayoutFormValues = { layout: DigitalCardLayoutType; primaryColor: string };
type LayoutOption = { value: DigitalCardLayoutType; label: string; portrait: ImageSourcePropType };
type LayoutPreviewProps = { layout: DigitalCardLayoutType; portrait: ImageSourcePropType; primaryColor: string };
type DemoIdentityProps = { centered?: boolean; light?: boolean };
type DemoContactsProps = { light?: boolean };
type DemoSocialsProps = { primaryColor: string; centered: boolean; light: boolean };
type DemoFooterProps = { primaryColor: string };

const LAYOUT_OPTIONS: LayoutOption[] = [
  { value: "modern", label: "Modern", portrait: require("@/assets/images/digital-cards/indian-male.webp") },
  { value: "centered", label: "Centered", portrait: require("@/assets/images/digital-cards/american-female.webp") },
  { value: "spotlight", label: "Spotlight", portrait: require("@/assets/images/digital-cards/african-male.webp") },
  { value: "minimal", label: "Minimal", portrait: require("@/assets/images/digital-cards/russian-female.webp") }
];
const PREVIEW_WIDTH = 184;
const PREVIEW_HEIGHT = 310;
const PRIMARY_COLORS = [colors.secondary.main, "#315E9C", "#214D3A", "#5B2A69", "#C04A74", "#953B24", "#D68A16"];

/* ------------------ BREAK ------------------ */

// Shows the current frontend card designs and saves the chosen layout and primary color.
export default function DigitalCardLayout({ refreshing, onRefresh, layout, primaryColor, onDraftChange, onSave }: DigitalCardLayoutProps) {
  const form = useForm<LayoutFormValues>({ defaultValues: { layout, primaryColor } });
  const selectedLayout = form.watch("layout");
  const selectedColor = form.watch("primaryColor");
  const { errors, isSubmitting, isDirty } = form.formState;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const optionWidth = (width - insets.left - insets.right - spacing.md * 2 - spacing.sm) / 2;

  // Shares unsaved appearance choices with the parent Preview action.
  useEffect(() => {
    const subscription = form.watch(() => { const values = form.getValues(); onDraftChange(values.layout, values.primaryColor); });
    return () => subscription.unsubscribe();
  }, [form, onDraftChange]);

  // Saves the layout and primary color without changing any of the dummy preview content.
  const handleSave = async (values: LayoutFormValues): Promise<void> => {
    form.clearErrors("root.save");
    try {
      await onSave(values.layout, values.primaryColor);
      form.reset(values);
    } catch (saveError: unknown) {
      form.setError("root.save", { type: "manual", message: saveError instanceof Error ? saveError.message : "Your card appearance could not be saved. Try again." });
    };//try-catch ends
  };//func ends

  // Updates the draft layout immediately without saving it.
  const handleSelect = (nextLayout: DigitalCardLayoutType): void => {
    form.setValue("layout", nextLayout, { shouldDirty: true });
  };//func ends

  // Applies the draft primary color to every sample preview.
  const handleColorChange = (nextColor: string): void => {
    form.setValue("primaryColor", nextColor, { shouldDirty: true });
  };//func ends

  //Default Return
  return (
    <View style={styles.root}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary.main} colors={[colors.secondary.main]} />} contentContainerStyle={[styles.content, { paddingBottom: Math.max(spacing.md, insets.bottom) }]} showsVerticalScrollIndicator={false}>
      <View pointerEvents={isSubmitting ? "none" : "auto"}>
        <QrColorPicker
          name="Primary"
          color={selectedColor}
          onChangeColor={handleColorChange}
          presets={PRIMARY_COLORS}
          hint="Black, white and grey stay fixed."
        />
      </View>
      <View style={styles.grid}>
        {LAYOUT_OPTIONS.map((option) => {
          const selected = option.value === selectedLayout;
          //Default Return
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label + " card layout"}
              accessibilityState={{ checked: selected, disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={() => handleSelect(option.value)}
              style={({ pressed }) => [styles.option, { width: optionWidth }, selected && styles.selectedOption, pressed && styles.pressedOption]}
            >
              <View pointerEvents="none" style={styles.preview}>
                <View style={[styles.previewCanvas, { transform: [{ scale: (optionWidth - 4) / PREVIEW_WIDTH }] }]}>
                  <LayoutPreview layout={option.value} portrait={option.portrait} primaryColor={selectedColor} />
                </View>
              </View>
              <View style={[styles.optionFooter, selected && styles.selectedOptionFooter]}>
                <Text style={[styles.optionLabel, selected && styles.selectedOptionLabel]}>{option.label}</Text>
              </View>
              {selected ? (
                <View style={styles.selectedBadge}>
                  <Check size={14} strokeWidth={1.25} color={colors.white.main} />
                </View>
              ) : null}
            </Pressable>
          );//return ends
        })}
      </View>
    </ScrollView>
    <BottomNav hideMenu={true} footerAction={<View style={styles.footer}>
      {errors.root?.save?.message ? <Text accessibilityRole="alert" style={styles.errorText}>{errors.root.save.message}</Text> : null}
      {isDirty || isSubmitting ? <Pressable accessibilityRole="button" disabled={isSubmitting || refreshing} onPress={() => void form.handleSubmit(handleSave)()} style={styles.saveButton}>
        {isSubmitting ? <ActivityIndicator color={colors.white.main} /> : null}
        <Text style={styles.saveText}>{isSubmitting ? "Saving…" : "Save Now"}</Text>
      </Pressable> : null}
    </View>} />
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Mirrors the frontend profile layouts with social links beneath the bio and a fixed sample footer.
function LayoutPreview({ layout, portrait, primaryColor }: LayoutPreviewProps) {
  const centered = layout === "centered";
  const dark = layout === "spotlight";
  const minimal = layout === "minimal";
  const hasCover = layout === "modern" || centered;

  //Default Return
  return (
    <View style={styles.previewScreen}>
      <View style={[styles.cardSurface, dark && styles.darkCard]}>
        {layout === "modern" ? <View style={[styles.modernCover, { backgroundColor: primaryColor }]} /> : null}
        {centered ? <View style={styles.coverHost}>
          <Svg width="100%" height="100%" viewBox="0 0 600 160" preserveAspectRatio="none">
            <Defs><ClipPath id="centeredCover"><Path d="M0 0H600V120Q300 200 0 120Z" /></ClipPath></Defs>
            <Path d="M0 0H600V120Q300 200 0 120Z" fill={primaryColor} />
            <Path d="M-40 15 C80 100 150 -35 270 35 S450 125 640 25 M-40 50 C80 135 150 0 270 70 S450 160 640 60 M-40 85 C80 170 150 35 270 105 S450 195 640 95" clipPath="url(#centeredCover)" fill="none" stroke={getPreviewPatternColor(primaryColor)} strokeWidth={2} opacity={0.65} />
          </Svg>
        </View> : null}
        {dark ? <View style={[styles.spotlightAccent, { backgroundColor: primaryColor }]} /> : null}
        <View style={[styles.cardBody, hasCover && styles.coverBody]}>
          <Image source={portrait} style={[styles.demoAvatar, centered && styles.centeredAvatar, minimal && styles.minimalAvatar, dark && { borderColor: primaryColor }]} />
          <View style={[styles.identityArea, minimal && { borderLeftWidth: 2, borderColor: primaryColor, paddingLeft: 6 }]}><DemoIdentity centered={centered} light={dark} /></View>
          <Text style={[styles.demoBio, centered && styles.centeredText, dark && styles.lightMutedText]}>Making meaningful connections.</Text>
          <DemoSocials primaryColor={primaryColor} centered={centered} light={dark} />
          <View style={[styles.contactsArea, dark && styles.darkDivider]}><DemoContacts light={dark} /></View>
        </View>
      </View>
      <DemoFooter primaryColor={primaryColor} />
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Uses the same light-or-dark shade mixing as the frontend centered cover and OG image.
function getPreviewPatternColor(primaryColor: string): string {
  const channels = [1, 3, 5].map(offset => parseInt(primaryColor.slice(offset, offset + 2), 16));
  const brightness = (channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114) / 255;
  const target = brightness < 0.5 ? 255 : 0;
  return `rgb(${channels.map(value => Math.round(value + (target - value) * 0.3)).join(", ")})`;
};//func ends

// Displays the same sample identity so the layout arrangements are easy to compare.
function DemoIdentity({ centered = false, light = false }: DemoIdentityProps) {
  //Default Return
  return (
    <View style={[styles.demoIdentity, centered && styles.centeredIdentity]}>
      <Text numberOfLines={1} style={[styles.demoName, light && styles.lightText]}>John Doe</Text>
      <Text numberOfLines={1} style={[styles.demoPosition, light && styles.lightMutedText]}>Product Designer</Text>
      <Text numberOfLines={1} style={[styles.demoCompany, light && styles.lightMutedText]}>Acme Studio</Text>
    </View>
  );//return ends
};//func ends

// Shows phone, email and address in the frontend's contact order.
function DemoContacts({ light = false }: DemoContactsProps) {
  const color = light ? colors.neutral.light : colors.mute.main;
  //Default Return
  return (
    <View style={styles.demoContacts}>
      <View style={styles.demoContactRow}><Phone size={9} strokeWidth={1.25} color={color} /><Text numberOfLines={1} style={[styles.demoContactText, light && styles.lightMutedText]}>+1 (555) 010-2020</Text></View>
      <View style={styles.demoContactRow}><Mail size={9} strokeWidth={1.25} color={color} /><Text numberOfLines={1} style={[styles.demoContactText, light && styles.lightMutedText]}>john@example.com</Text></View>
      <View style={styles.demoContactRow}><MapPin size={9} strokeWidth={1.25} color={color} /><Text numberOfLines={1} style={[styles.demoContactText, light && styles.lightMutedText]}>123 Market Street</Text></View>
    </View>
  );//return ends
};//func ends

// Shows primary-colored Website and Calendly pills directly below the sample bio.
function DemoSocials({ primaryColor, centered, light }: DemoSocialsProps) {
  //Default Return
  return (
    <View style={[styles.demoSocials, centered && styles.centeredSocials]}>
      <View style={[styles.demoSocial, { borderColor: primaryColor }]}><Globe size={8} strokeWidth={1.25} color={primaryColor} /><Text style={[styles.demoSocialText, light && styles.lightText]}>Website</Text></View>
      <View style={[styles.demoSocial, { borderColor: primaryColor }]}><CalendlyIcon width={8} height={8} color={primaryColor} /><Text style={[styles.demoSocialText, light && styles.lightText]}>Calendly</Text></View>
    </View>
  );//return ends
};//func ends

// Keeps Save contact and official UNOQR branding below the sample profile content.
function DemoFooter({ primaryColor }: DemoFooterProps) {
  //Default Return
  return (
    <View style={styles.demoFooter}>
      <View style={[styles.demoButton, { backgroundColor: primaryColor }]}><Download size={9} strokeWidth={1.25} color={colors.white.main} /><Text style={styles.demoButtonText}>Save contact</Text></View>
      <View style={styles.demoBrandRow}><Text style={styles.demoBrandText}>Made with</Text><UnoQrLogo width={33} /></View>
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: { padding: spacing.md, gap: spacing.xs },
  saveButton: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radii.lg, backgroundColor: colors.secondary.main },
  saveText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.button },
  content: { padding: spacing.md, gap: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: { position: "relative", overflow: "hidden", borderWidth: 2, borderColor: colors.border.main, borderRadius: radii.xl, backgroundColor: colors.white.main },
  selectedOption: { borderColor: colors.secondary.main },
  pressedOption: { opacity: 0.85 },
  preview: { aspectRatio: PREVIEW_WIDTH / PREVIEW_HEIGHT, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  previewCanvas: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT },
  optionFooter: { minHeight: 30, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderColor: colors.line.main, backgroundColor: colors.white.main },
  selectedOptionFooter: { borderColor: colors.secondary.light, backgroundColor: colors.secondary.light },
  optionLabel: { color: colors.mute.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption },
  selectedOptionLabel: { color: colors.secondary.dark },
  selectedBadge: { position: "absolute", top: spacing.xs, right: spacing.xs, width: 24, height: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.white.main, borderRadius: radii.pill, backgroundColor: colors.secondary.main, zIndex: 2 },
  errorText: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  previewScreen: { flex: 1, backgroundColor: colors.cream.main },
  cardSurface: { flex: 1, margin: 5, marginBottom: 0, overflow: "hidden", borderWidth: 0.5, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main },
  darkCard: { backgroundColor: colors.primary.main, borderColor: colors.primary.light },
  modernCover: { height: 49 },
  coverHost: { height: 49 },
  spotlightAccent: { height: 3 },
  cardBody: { padding: 10, gap: 9 },
  coverBody: { marginTop: -22, paddingTop: 0 },
  demoAvatar: { width: 44, height: 44, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.white.main, backgroundColor: colors.white.main },
  centeredAvatar: { alignSelf: "center" },
  minimalAvatar: { borderRadius: radii.sm, borderWidth: 0.5, borderColor: colors.border.main },
  identityArea: { marginTop: 1 },
  demoIdentity: { gap: 1 },
  demoName: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.subtitle2, lineHeight: 18 },
  demoPosition: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: 8, lineHeight: 10 },
  demoCompany: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: 7, lineHeight: 9 },
  demoBio: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: 7.5, lineHeight: 11 },
  contactsArea: { borderTopWidth: 0.5, borderColor: colors.border.light, paddingTop: 8 },
  darkDivider: { borderColor: colors.primary.light },
  demoContacts: { gap: 7 },
  demoContactRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  demoContactText: { flex: 1, color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: 7, lineHeight: 10 },
  demoSocials: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  centeredSocials: { justifyContent: "center" },
  demoSocial: { minHeight: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 6, borderWidth: 0.5, borderRadius: radii.pill },
  demoSocialText: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: 6.5 },
  demoFooter: { padding: 6, gap: 6, backgroundColor: colors.cream.main },
  demoButton: { minHeight: 25, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: radii.sm },
  demoButtonText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: 7 },
  demoBrandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  demoBrandText: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: 6 },
  centeredIdentity: { alignItems: "center" },
  centeredText: { textAlign: "center" },
  lightText: { color: colors.white.main },
  lightMutedText: { color: colors.neutral.light }
});
