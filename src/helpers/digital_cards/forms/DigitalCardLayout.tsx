import { useEffect } from "react";
import QRCode from "qrcode";
import Svg, { Path, Rect } from "react-native-svg";
import { Check, Download, Globe, Mail, MapPin, Phone } from "lucide-react-native";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
type DemoButtonProps = { primaryColor: string; outlined?: boolean };

const LAYOUT_OPTIONS: LayoutOption[] = [
  { value: "modern", label: "Modern", portrait: require("@/assets/images/digital-cards/indian-male.png") },
  { value: "centered", label: "Centered", portrait: require("@/assets/images/digital-cards/american-female.png") },
  { value: "spotlight", label: "Spotlight", portrait: require("@/assets/images/digital-cards/african-male.png") },
  { value: "minimal", label: "Minimal", portrait: require("@/assets/images/digital-cards/russian-female.png") }
];
const PREVIEW_WIDTH = 184;
const PREVIEW_HEIGHT = 310;
const PRIMARY_COLORS = [colors.secondary.main, "#315E9C", "#214D3A", "#5B2A69", "#C04A74", "#953B24", "#D68A16"];

/* ------------------ BREAK ------------------ */

// Shows four sample cards with one editable primary color and saves their appearance locally.
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

// Renders four distinct card compositions using consistent John Doe example details.
function LayoutPreview({ layout, portrait, primaryColor }: LayoutPreviewProps) {
  if (layout === "modern") {
    //Default Return
    return (
      <View style={styles.modern}>
        <View style={styles.modernCover}>
          <View style={[styles.coverCircle, { backgroundColor: primaryColor }]} />
          <View style={[styles.coverRing, { borderColor: primaryColor }]} />
        </View>
        <View style={styles.modernBody}>
          <Image source={portrait} style={styles.modernAvatar} />
          <DemoIdentity />
          <Text style={styles.demoBio}>Turning ideas into meaningful connections.</Text>
          <DemoContacts />
          <DemoSocials />
          <DemoQr /><View style={styles.buttonArea}><DemoButton primaryColor={primaryColor} /></View>
        </View>
      </View>
    );//return ends
  };//if ends

  if (layout === "centered") {
    //Default Return
    return (
      <View style={styles.centered}>
        <View style={[styles.centeredHalo, { backgroundColor: primaryColor + "22" }]} />
        <Image source={portrait} style={styles.centeredAvatar} />
        <DemoIdentity centered />
        <Text style={[styles.demoBio, styles.centeredText]}>Let's create something great together.</Text>
        <DemoSocials />
        <View style={styles.centeredContacts}><DemoContacts /></View>
        <DemoQr /><View style={styles.centeredButtonArea}><DemoButton primaryColor={primaryColor} /></View>
      </View>
    );//return ends
  };//if ends

  if (layout === "spotlight") {
    //Default Return
    return (
      <View style={styles.spotlight}>
        <View style={styles.spotlightHero}>
          <Image source={portrait} style={styles.spotlightPhoto} />
          <View style={styles.spotlightIdentity}><DemoIdentity light /></View>
        </View>
        <View style={styles.spotlightBody}>
          <Text style={[styles.demoBio, styles.lightText]}>Good ideas start with a conversation.</Text>
          <DemoContacts light />
          <DemoSocials light />
          <DemoQr /><View style={styles.buttonArea}><DemoButton primaryColor={primaryColor} /></View>
        </View>
      </View>
    );//return ends
  };//if ends

  //Default Return
  return (
    <View style={styles.minimal}>
      <View style={styles.minimalHeader}>
        <Image source={portrait} style={styles.minimalAvatar} />
        <Text style={styles.demoBrand}>ACME{"\n"}STUDIO</Text>
      </View>
      <View style={[styles.minimalIdentity, { borderColor: primaryColor }]}><DemoIdentity /></View>
      <Text style={styles.demoBio}>Designing thoughtful experiences.</Text>
      <View style={styles.minimalDivider} />
      <DemoContacts />
      <View style={styles.minimalDivider} />
      <DemoSocials />
      <DemoQr /><View style={styles.buttonArea}><DemoButton primaryColor={primaryColor} outlined /></View>
    </View>
  );//return ends
};//func ends

// Adds a sample QR to every layout option without using the user's unpublished destination.
function DemoQr() {
  const qr = QRCode.create("https://unoqr.com", { errorCorrectionLevel: "M" }).modules;
  const size = qr.size + 8;
  let path = "";
  for (let row = 0; row < qr.size; row += 1) {
    for (let column = 0; column < qr.size; column += 1) {
      if (qr.get(row, column)) path += `M${column + 4} ${row + 4}h1v1h-1z`;
    }
  }
  //Default Return
  return <View style={styles.demoQr}><Svg width={44} height={44} viewBox={`0 0 ${size} ${size}`}><Rect width={size} height={size} fill={colors.white.main} /><Path d={path} fill={colors.black.main} /></Svg></View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

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

// Displays sample contact rows that are visual previews rather than live contact actions.
function DemoContacts({ light = false }: DemoContactsProps) {
  const color = light ? colors.neutral.light : colors.mute.main;
  //Default Return
  return (
    <View style={styles.demoContacts}>
      <View style={styles.demoContactRow}><Mail size={9} strokeWidth={1.25} color={color} /><Text numberOfLines={1} style={[styles.demoContactText, light && styles.lightMutedText]}>john@example.com</Text></View>
      <View style={styles.demoContactRow}><Phone size={9} strokeWidth={1.25} color={color} /><Text numberOfLines={1} style={[styles.demoContactText, light && styles.lightMutedText]}>+1 (555) 010-2020</Text></View>
      <View style={styles.demoContactRow}><MapPin size={9} strokeWidth={1.25} color={color} /><Text numberOfLines={1} style={[styles.demoContactText, light && styles.lightMutedText]}>123 Market Street</Text></View>
    </View>
  );//return ends
};//func ends

// Shows neutral miniature link icons without adding interactive buttons inside a layout option.
function DemoSocials({ light = false }: DemoContactsProps) {
  const color = light ? colors.white.main : colors.primary.main;
  //Default Return
  return (
    <View style={styles.demoSocials}>
      <View style={[styles.demoSocial, light && styles.darkSocial]}><Globe size={10} strokeWidth={1.25} color={color} /></View>
      <View style={[styles.demoSocial, light && styles.darkSocial]}><Mail size={10} strokeWidth={1.25} color={color} /></View>
      <View style={[styles.demoSocial, light && styles.darkSocial]}><Phone size={10} strokeWidth={1.25} color={color} /></View>
    </View>
  );//return ends
};//func ends

// Shows a compact noninteractive Save contact treatment in each card preview.
function DemoButton({ primaryColor, outlined = false }: DemoButtonProps) {
  const color = outlined ? colors.primary.main : colors.white.main;
  //Default Return
  return (
    <View style={[styles.demoButton, { backgroundColor: primaryColor }, outlined && styles.outlinedDemoButton]}>
      <Download size={9} strokeWidth={1.25} color={color} />
      <Text style={[styles.demoButtonText, outlined && styles.outlinedDemoButtonText]}>Save contact</Text>
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
  modern: { flex: 1, backgroundColor: colors.white.main },
  modernCover: { height: 58, overflow: "hidden", backgroundColor: colors.primary.main },
  coverCircle: { position: "absolute", width: 88, height: 88, borderRadius: radii.pill, right: -12, top: -42 },
  coverRing: { position: "absolute", width: 60, height: 60, borderRadius: radii.pill, right: 28, top: 24, borderWidth: 1 },
  modernBody: { flex: 1, gap: 6, padding: 10, paddingTop: 20 },
  modernAvatar: { position: "absolute", top: -28, left: 10, width: 44, height: 44, borderRadius: radii.pill, borderWidth: 3, borderColor: colors.white.main },
  demoIdentity: { gap: 1 },
  demoName: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.subtitle2, lineHeight: 18 },
  demoPosition: { color: colors.mute.main, fontFamily: fontFamilies.primaryMedium, fontSize: 8, lineHeight: 10 },
  demoCompany: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: 7, lineHeight: 9 },
  demoBio: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: 7.5, lineHeight: 11 },
  demoQr: { alignSelf: "center", backgroundColor: colors.white.main, borderRadius: radii.sm },
  demoContacts: { gap: 5 },
  demoContactRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  demoContactText: { flex: 1, color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: 7, lineHeight: 10 },
  demoSocials: { flexDirection: "row", gap: 5 },
  demoSocial: { width: 23, height: 23, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: colors.line.light },
  darkSocial: { backgroundColor: colors.primary.light },
  buttonArea: { marginTop: "auto" },
  demoButton: { minHeight: 25, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: radii.pill },
  demoButtonText: { color: colors.white.main, fontFamily: fontFamilies.primarySemiBold, fontSize: 7 },
  outlinedDemoButton: { borderWidth: 1, borderColor: colors.primary.main, backgroundColor: colors.white.main },
  outlinedDemoButtonText: { color: colors.primary.main },
  centered: { flex: 1, alignItems: "center", gap: 4, padding: 12, paddingTop: 16, backgroundColor: colors.cream.main },
  centeredHalo: { position: "absolute", top: -24, left: -20, right: -20, height: 105, borderBottomLeftRadius: 70, borderBottomRightRadius: 70 },
  centeredAvatar: { width: 48, height: 48, borderRadius: radii.pill, borderWidth: 3, borderColor: colors.white.main },
  centeredIdentity: { alignItems: "center" },
  centeredText: { textAlign: "center" },
  centeredContacts: { width: "100%", padding: 6, borderRadius: radii.md, backgroundColor: colors.white.main },
  centeredButtonArea: { marginTop: "auto", alignSelf: "stretch" },
  spotlight: { flex: 1, backgroundColor: colors.primary.main },
  spotlightHero: { height: "45%", overflow: "hidden" },
  spotlightPhoto: { width: "100%", height: "100%" },
  spotlightIdentity: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: colors.primary.main + "B8" },
  spotlightBody: { flex: 1, gap: 5, padding: 10 },
  lightText: { color: colors.white.main },
  lightMutedText: { color: colors.neutral.light },
  minimal: { flex: 1, gap: 6, padding: 12, backgroundColor: colors.white.main },
  minimalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  minimalAvatar: { width: 40, height: 40, borderRadius: radii.md },
  demoBrand: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: 7, lineHeight: 9, letterSpacing: 1 },
  minimalIdentity: { borderLeftWidth: 2, paddingLeft: 7 },
  minimalDivider: { height: 1, backgroundColor: colors.line.main }
});
