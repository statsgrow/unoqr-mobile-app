import { useState } from "react";
import { Check, ChevronDown } from "lucide-react-native";
import { Controller, type FieldValues } from "react-hook-form";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { TextInput } from "react-native-paper";

import { PxModal } from "@/components/elements/PxModal";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

import { PxFormField, type PxFormBinding, type PxFormFieldOptions } from "./PxFormField";
import { PxTextInput } from "./PxTextInput";

/* ------------------ BREAK ------------------ */

type PhoneCountry = { emoji: string; code: string; country: string; shortCode: string; min: number; max: number };
export type PxPhoneInputProps<T extends FieldValues = FieldValues> = PxFormBinding<T, string> & PxFormFieldOptions & {
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  defaultCountryCode?: string;
  onChangeText?: (value: string) => void;
};//export ends

type PhoneInputElementProps<T extends FieldValues> = {
  props: PxPhoneInputProps<T>;
  value: string;
  change: (value: string) => void;
  blur?: () => void;
  inputRef?: (instance: unknown) => void;
  fieldError?: string | boolean;
};

/* ------------------ BREAK ------------------ */

// Connects an international phone number to RHF or controlled state with shared field feedback.
export function PxPhoneInput<T extends FieldValues = FieldValues>(props: PxPhoneInputProps<T>) {
  if (props.RHF) {
    //Default Return
    return <Controller control={props.RHF.control} name={props.name} rules={props.rules} render={({ field, fieldState }) => (
      <PhoneInputElement props={props} value={String(field.value ?? "")} change={(value) => { field.onChange(value); props.onChangeText?.(value); }} blur={field.onBlur} inputRef={field.ref} fieldError={fieldState.error?.message || fieldState.invalid} />
    )} />;//return ends
  };//if ends

  //Default Return
  return <PhoneInputElement props={props} value={props.value} change={(value) => props.onChangeText?.(value)} />;//return ends
};//export ends

export default PxPhoneInput;//export ends

/* ------------------ BREAK ------------------ */

// Displays national digits and selects their dial code through the shared searchable PxModal.
function PhoneInputElement<T extends FieldValues>({ props, value, change, blur, inputRef, fieldError }: PhoneInputElementProps<T>) {
  const { label, lable, helperText, error, fullWidth, style, placeholder, disabled = false, defaultCountryCode = "91", maxLength = 15 } = props;
  const [country, setCountry] = useState<PhoneCountry>(() => phoneCountries.find(item => item.code === sanitizeDigits(defaultCountryCode)) ?? phoneCountries[0]);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const digits = sanitizeDigits(value);
  const storedCountry = phoneCountries.find(item => item.code === value?.split("-")[0]);
  const activeCountry = storedCountry ?? (digits && !digits.startsWith(country.code) ? findCountryFromFullNumber(digits) ?? country : country);
  const nationalNumber = digits.startsWith(activeCountry.code) ? digits.slice(activeCountry.code.length) : digits;
  const keyword = search.trim().toLowerCase().replace(/^\+/, "");
  const filteredCountries = phoneCountries.filter(item => `${item.country} ${item.shortCode} ${item.code}`.toLowerCase().includes(keyword));
  const resolvedError = fieldError || error;
  const active = focused && !resolvedError;

  // Accepts pasted international values and keeps a cleared optional phone field empty.
  function updateNumber(input: string): void {
    const nextDigits = sanitizeDigits(input);
    if (input.trim().startsWith("+") || /^\d{1,3}-/.test(input.trim())) {
      const storedCode = input.trim().split("-")[0];
      const detected = phoneCountries.find(item => item.code === storedCode) ?? findCountryFromFullNumber(nextDigits);
      if (detected) {
        setCountry(detected);
        change(formatInternationalNumber(detected, nextDigits.slice(detected.code.length), maxLength));
      } else {
        change(formatInternationalNumber(activeCountry, nextDigits, maxLength));
      };//if ends
      return;
    };//if ends
    change(formatInternationalNumber(activeCountry, nextDigits, maxLength));
  };//func ends

  // Dismisses the phone keyboard before opening the country selection sheet.
  function openCountries(): void {
    Keyboard.dismiss();
    setSearch("");
    setOpen(true);
  };//func ends

  // Clears country search and returns validation focus to the parent field on dismissal.
  function closeCountries(): void {
    Keyboard.dismiss();
    setOpen(false);
    setSearch("");
    blur?.();
  };//func ends

  // Changes the dial code while preserving national digits and leaving empty values empty.
  function selectCountry(nextCountry: PhoneCountry): void {
    setCountry(nextCountry);
    if (nationalNumber) change(formatInternationalNumber(nextCountry, nationalNumber, maxLength));
    closeCountries();
  };//func ends

  //Default Return
  return <PxFormField label={label ?? lable} helperText={helperText} error={resolvedError} fullWidth={fullWidth} style={style}>
    <View style={[styles.inputShell, active && styles.activeShell, resolvedError && styles.errorShell, disabled && styles.disabled]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Country code: ${activeCountry.country} +${activeCountry.code}`} accessibilityState={{ disabled, expanded: open }} disabled={disabled} onPress={openCountries} style={[styles.adornment, active && styles.activeAdornment, resolvedError && styles.errorAdornment]}>
        <Text style={styles.prefix}>+{activeCountry.code}</Text>
        <ChevronDown size={16} strokeWidth={1.25} color={colors.neutral.main} />
      </Pressable>
      <View style={styles.inputPane}>
        <TextInput ref={inputRef} accessibilityLabel={label ?? lable ?? props.name ?? "Phone number"} dense mode="flat" value={nationalNumber} onChangeText={updateNumber} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); blur?.(); }} placeholder={placeholder} disabled={disabled} keyboardType="number-pad" maxLength={maxLength} autoComplete="tel-national" autoCapitalize="none" autoCorrect={false} error={false} underlineColor="transparent" activeUnderlineColor="transparent" outlineColor="transparent" activeOutlineColor="transparent" style={styles.input} contentStyle={styles.inputContent} />
      </View>
    </View>
    <PxModal open={open} setOpen={closeCountries} name="Select country code" height="full">
      <View style={styles.modalBody}>
        <PxTextInput label="Search countries" value={search} onChangeText={setSearch} placeholder="Country or dial code" autoCapitalize="none" autoCorrect={false} />
        <View style={styles.countryList}>
          {filteredCountries.map(item => <Pressable key={item.shortCode} accessibilityRole="button" accessibilityLabel={`${item.country} +${item.code}`} accessibilityState={{ selected: item.shortCode === activeCountry.shortCode }} onPress={() => selectCountry(item)} style={[styles.countryItem, item.shortCode === activeCountry.shortCode && styles.selectedCountry]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.countryName}>{item.country}</Text>
            <Text style={styles.countryCode}>+{item.code}</Text>
            <View style={styles.check}>{item.shortCode === activeCountry.shortCode ? <Check size={18} strokeWidth={1.25} color={colors.primary.main} /> : null}</View>
          </Pressable>)}
          {filteredCountries.length === 0 ? <Text style={styles.empty}>No countries found.</Text> : null}
        </View>
      </View>
    </PxModal>
  </PxFormField>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Removes formatting from phone and dial-code values.
function sanitizeDigits(value: string): string { return value.replace(/\D/g, ""); };//func ends

// Resolves the longest supported dial-code prefix for a full international number.
function findCountryFromFullNumber(digits: string): PhoneCountry | null {
  return countriesByCodeLength.find(country => digits.startsWith(country.code)) ?? null;
};//func ends

// Formats national digits using the field limit independently of country metadata.
function formatInternationalNumber(country: PhoneCountry, nationalNumber: string, maxLength: number = 15): string {
  const digits = sanitizeDigits(nationalNumber).slice(0, maxLength);
  return digits ? `${country.code}-${digits}` : "";
};//func ends

/* ------------------ BREAK ------------------ */

// Country data for this input's dial-code picker.
const phoneCountries: PhoneCountry[] = [
  { emoji: "🇺🇸", code: "1", country: "United States / Canada / Caribbean", shortCode: "US", min: 10, max: 10 },
  { emoji: "🇷🇺", code: "7", country: "Russia / Kazakhstan", shortCode: "RU", min: 10, max: 10 },
  { emoji: "🇪🇬", code: "20", country: "Egypt", shortCode: "EG", min: 10, max: 10 },
  { emoji: "🇿🇦", code: "27", country: "South Africa", shortCode: "ZA", min: 9, max: 9 },
  { emoji: "🇳🇪", code: "227", country: "Niger", shortCode: "NE", min: 8, max: 8 },
  { emoji: "🇬🇷", code: "30", country: "Greece", shortCode: "GR", min: 10, max: 10 },
  { emoji: "🇳🇱", code: "31", country: "Netherlands", shortCode: "NL", min: 9, max: 9 },
  { emoji: "🇧🇪", code: "32", country: "Belgium", shortCode: "BE", min: 9, max: 9 },
  { emoji: "🇫🇷", code: "33", country: "France", shortCode: "FR", min: 9, max: 9 },
  { emoji: "🇪🇸", code: "34", country: "Spain", shortCode: "ES", min: 9, max: 9 },
  { emoji: "🇭🇺", code: "36", country: "Hungary", shortCode: "HU", min: 9, max: 9 },
  { emoji: "🇮🇹", code: "39", country: "Italy", shortCode: "IT", min: 9, max: 10 },
  { emoji: "🇷🇸", code: "381", country: "Serbia", shortCode: "RS", min: 8, max: 9 },
  { emoji: "🇵🇹", code: "351", country: "Portugal", shortCode: "PT", min: 9, max: 9 },
  { emoji: "🇷🇴", code: "40", country: "Romania", shortCode: "RO", min: 9, max: 9 },
  { emoji: "🇨🇭", code: "41", country: "Switzerland", shortCode: "CH", min: 9, max: 9 },
  { emoji: "🇦🇹", code: "43", country: "Austria", shortCode: "AT", min: 10, max: 10 },
  { emoji: "🇬🇧", code: "44", country: "United Kingdom", shortCode: "GB", min: 10, max: 10 },
  { emoji: "🇩🇰", code: "45", country: "Denmark", shortCode: "DK", min: 8, max: 8 },
  { emoji: "🇸🇪", code: "46", country: "Sweden", shortCode: "SE", min: 7, max: 13 },
  { emoji: "🇳🇴", code: "47", country: "Norway", shortCode: "NO", min: 8, max: 8 },
  { emoji: "🇵🇱", code: "48", country: "Poland", shortCode: "PL", min: 9, max: 9 },
  { emoji: "🇩🇪", code: "49", country: "Germany", shortCode: "DE", min: 10, max: 11 },
  { emoji: "🇧🇷", code: "55", country: "Brazil", shortCode: "BR", min: 10, max: 11 },
  { emoji: "🇦🇺", code: "61", country: "Australia", shortCode: "AU", min: 9, max: 9 },
  { emoji: "🇳🇿", code: "64", country: "New Zealand", shortCode: "NZ", min: 8, max: 10 },
  { emoji: "🇸🇬", code: "65", country: "Singapore", shortCode: "SG", min: 8, max: 8 },
  { emoji: "🇹🇭", code: "66", country: "Thailand", shortCode: "TH", min: 9, max: 9 },
  { emoji: "🇯🇵", code: "81", country: "Japan", shortCode: "JP", min: 10, max: 11 },
  { emoji: "🇰🇷", code: "82", country: "South Korea", shortCode: "KR", min: 9, max: 11 },
  { emoji: "🇻🇳", code: "84", country: "Vietnam", shortCode: "VN", min: 9, max: 11 },
  { emoji: "🇨🇳", code: "86", country: "China", shortCode: "CN", min: 11, max: 11 },
  { emoji: "🇹🇷", code: "90", country: "Turkey", shortCode: "TR", min: 10, max: 10 },
  { emoji: "🇮🇳", code: "91", country: "India", shortCode: "IN", min: 10, max: 10 },
  { emoji: "🇵🇰", code: "92", country: "Pakistan", shortCode: "PK", min: 10, max: 10 },
  { emoji: "🇮🇷", code: "98", country: "Iran", shortCode: "IR", min: 10, max: 10 },
  { emoji: "🇬🇭", code: "233", country: "Ghana", shortCode: "GH", min: 9, max: 9 },
  { emoji: "🇺🇬", code: "256", country: "Uganda", shortCode: "UG", min: 9, max: 9 },
  { emoji: "🇸🇦", code: "966", country: "Saudi Arabia", shortCode: "SA", min: 9, max: 9 },
  { emoji: "🇦🇪", code: "971", country: "United Arab Emirates", shortCode: "AE", min: 9, max: 9 },
  { emoji: "🇳🇵", code: "977", country: "Nepal", shortCode: "NP", min: 10, max: 10 }
];

const countriesByCodeLength = [...phoneCountries].sort((first, second) => second.code.length - first.code.length);

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  inputShell: { flexDirection: "row", alignItems: "stretch", borderWidth: 1.5, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main, overflow: "hidden" },
  activeShell: { borderColor: colors.primary.main },
  errorShell: { borderColor: colors.error.main },
  disabled: { opacity: 0.7 },
  adornment: { minWidth: 80, paddingHorizontal: spacing.xs, gap: spacing.xxs, justifyContent: "center", alignItems: "center", flexDirection: "row", backgroundColor: colors.cream.main, borderRightWidth: 1, borderRightColor: colors.border.main },
  activeAdornment: { borderRightColor: colors.primary.main },
  errorAdornment: { borderRightColor: colors.error.main },
  emoji: { fontSize: fontSizes.body1, lineHeight: 20 },
  prefix: { color: colors.neutral.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.caption },
  inputPane: { flex: 1, overflow: "hidden" },
  input: { backgroundColor: colors.white.main, minHeight: 48, paddingHorizontal: 0, fontSize: fontSizes.body1 },
  inputContent: { paddingLeft: spacing.sm, fontFamily: fontFamilies.primaryRegular },
  modalBody: { paddingHorizontal: spacing.lg, gap: spacing.md },
  countryList: { gap: spacing.xxs },
  countryItem: { minHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radii.lg },
  selectedCountry: { backgroundColor: colors.line.light },
  countryName: { flex: 1, color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  countryCode: { color: colors.neutral.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  check: { width: 18 },
  empty: { paddingVertical: spacing.lg, color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
