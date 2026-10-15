import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput as NativeTextInput, useWindowDimensions, View } from "react-native";
import { Controller, type FieldValues } from "react-hook-form";
import { Text } from "react-native-paper";
import { Check, ChevronDown, X } from "lucide-react-native";

import { PxIcon } from "@/components/elements/PxIcon";
import { PxModal } from "@/components/elements/PxModal";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

import { PxFormField, type PxFormBinding, type PxFormFieldOptions } from "./PxFormField";
import type { PxLeftAdornment } from "./PxTextInput";

/* ------------------ BREAK ------------------ */

export type PxSelectOption = { label: string; value: string };
export type PxSelectProps<T extends FieldValues = FieldValues> = PxFormBinding<T, string> & PxFormFieldOptions & {
  options: readonly PxSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  leftAdornment?: PxLeftAdornment;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (value: string) => void;
};
type SelectSearchInputProps = { value: string; onChangeText: (value: string) => void; ready: boolean };

type SelectElementProps<T extends FieldValues> = { props: PxSelectProps<T>; value: string; change: (value: string) => void; blur?: () => void; inputRef?: (instance: unknown) => void; fieldError?: string | boolean };

/* ------------------ BREAK ------------------ */

// Connects label/value options to RHF or controlled state using the shared searchable PxModal.
export function PxSelect<T extends FieldValues = FieldValues>(props: PxSelectProps<T>) {
  if (props.RHF) {
    //Default Return
    return <Controller control={props.RHF.control} name={props.name} rules={props.rules} render={({ field, fieldState }) => (
      <SelectElement props={props} value={String(field.value ?? "")} change={(value) => { field.onChange(value); props.onValueChange?.(value); }} blur={field.onBlur} inputRef={field.ref} fieldError={fieldState.error?.message || fieldState.invalid} />
    )} />;//return ends
  };//if ends

  //Default Return
  return <SelectElement props={props} value={props.value} change={(value) => props.onValueChange?.(value)} />;//return ends
};//export ends

export default PxSelect;

/* ------------------ BREAK ------------------ */

// Displays the selected label with a fixed search header above the select's scrolling options.
function SelectElement<T extends FieldValues>({ props, value, change, blur, inputRef, fieldError }: SelectElementProps<T>) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const bodyRef = useRef<View | null>(null);
  const optionsRef = useRef<ScrollView | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [searchReady, setSearchReady] = useState(false);
  const [search, setSearch] = useState("");
  const { options, label, lable, helperText, error, style, fullWidth, placeholder = "Select an option", disabled = false, leftAdornment, onOpenChange } = props;
  const selected = options.find((option) => option.value === value);
  const visibleOptions = useMemo(() => filteredOptions(options, search), [options, search]);
  const resolvedError = fieldError || error;
  const resolvedLabel = label ?? lable;

  // Fits the select body to the existing modal viewport without duplicating its header or inset spacing.
  const measureViewport = useCallback((): void => {
    const body = bodyRef.current;
    const content = body?.parentElement;
    const viewport = content?.parentElement;
    if (!body || !content || !viewport) return;
    const surroundingHeight = content.clientHeight - body.clientHeight;
    setViewportHeight(Math.max(0, viewport.clientHeight - surroundingHeight));
  }, []);//callback ends

  // Rechecks available space when the sheet opens, rotates or settles after showing its search.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(measureViewport);
    // Measures the final viewport after PxModal finishes animating its keyboard clearance.
    let settledTimer: ReturnType<typeof setTimeout> | undefined;
    const measureAfterKeyboard = (): void => {
      requestAnimationFrame(measureViewport);
      clearTimeout(settledTimer);
      settledTimer = setTimeout(() => requestAnimationFrame(measureViewport), 300);
    };//func ends
    const showSubscription = Keyboard.addListener("keyboardDidShow", measureAfterKeyboard);
    const hideSubscription = Keyboard.addListener("keyboardDidHide", measureAfterKeyboard);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settledTimer);
      showSubscription.remove();
      hideSubscription.remove();
    };//cleanup ends
  }, [open, screenHeight, screenWidth, searchReady, measureViewport]);//useEffect ends

  // Returns filtered results to the top without moving the fixed search header.
  const handleSearchChange = (value: string): void => {
    setSearch(value);
    optionsRef.current?.scrollTo({ y: 0, animated: false });
  };//func ends

  // Opens the selector after dismissing any parent field's keyboard.
  const openSelect = (): void => {
    Keyboard.dismiss();
    setViewportHeight(undefined);
    setOpen(true);
    onOpenChange?.(true);
  };//func ends

  // Closes the selector and clears its temporary search without changing the chosen value.
  const closeSelect = (): void => {
    Keyboard.dismiss();
    setOpen(false);
    setSearchReady(false);
    setSearch("");
    blur?.();
    onOpenChange?.(false);
  };//func ends

  //Default Return
  return <PxFormField label={resolvedLabel} helperText={helperText} error={resolvedError} style={style} fullWidth={fullWidth}>
    <Pressable ref={inputRef} accessibilityRole="button" accessibilityLabel={resolvedLabel ?? placeholder} accessibilityValue={{ text: selected?.label ?? placeholder }} accessibilityState={{ disabled, expanded: open }} disabled={disabled} onPress={openSelect} style={[styles.inputShell, resolvedError && styles.errorShell, disabled && styles.disabled]}>
      {leftAdornment?.icon || leftAdornment?.text ? <View style={styles.adornment}>
        {leftAdornment.icon ? <PxIcon name={leftAdornment.icon} size={18} color={colors.neutral.main} /> : null}
        {leftAdornment.text ? <Text style={styles.prefix}>{leftAdornment.text}</Text> : null}
      </View> : null}
      <View style={styles.valuePane}>
        <Text numberOfLines={1} style={[styles.valueText, !selected && styles.placeholder]}>{selected?.label ?? placeholder}</Text>
        <ChevronDown size={20} strokeWidth={1.25} color={colors.neutral.main} />
      </View>
    </Pressable>
    <PxModal visible={open} name={resolvedLabel ?? "Select an option"} height={screenHeight * 0.7} keyboardAvoiding onRequestClose={closeSelect} onShow={() => setSearchReady(true)}>
      <View ref={bodyRef} collapsable={false} onLayout={measureViewport} style={[styles.modalBody, { height: viewportHeight }]}>
        <View style={styles.searchHeader}>
          <SelectSearchInput value={search} onChangeText={handleSearchChange} ready={searchReady} />
        </View>
        <ScrollView ref={optionsRef} style={styles.optionsScroll} contentContainerStyle={styles.optionsContent} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator>
        {visibleOptions.map((option) => {
          const isSelected = option.value === value;
          //Default Return
          return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: isSelected, disabled }} disabled={disabled} onPress={() => { change(option.value); closeSelect(); }} style={[styles.option, isSelected && styles.selectedOption]}>
            <Text style={[styles.optionText, isSelected && styles.selectedText]}>{option.label}</Text>
            {isSelected ? <Check size={18} strokeWidth={1.25} color={colors.primary.main} /> : null}
          </Pressable>;//return ends
        })}
        {visibleOptions.length === 0 ? <Text style={styles.empty}>No matching options found.</Text> : null}
        </ScrollView>
      </View>
    </PxModal>
  </PxFormField>;//return ends
};//func ends

// Renders the select's taller search field with its clear action inside the input border.
function SelectSearchInput({ value, onChangeText, ready }: SelectSearchInputProps) {
  const [focused, setFocused] = useState(false);

  //Default Return
  return <View style={[styles.searchShell, focused && styles.focusedSearch]}>
    {ready ? <NativeTextInput
      accessibilityLabel="Search options"
      value={value}
      onChangeText={onChangeText}
      placeholder="Search options"
      placeholderTextColor={colors.mute.main}
      selectionColor={colors.secondary.main}
      autoFocus
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={styles.searchInput}
    /> : <View style={styles.searchInput} />}
    <Pressable accessibilityRole="button" accessibilityLabel="Clear option search" disabled={!value} onPress={() => onChangeText("")} style={styles.clearButton}>
      <X size={20} strokeWidth={1.25} color={value ? colors.primary.main : colors.mute.light} />
    </Pressable>
  </View>;//return ends
};//func ends

// Filters options by label or value without changing the array supplied by the page.
function filteredOptions(options: readonly PxSelectOption[], search: string): readonly PxSelectOption[] {
  const text = search.trim().toLowerCase();
  if (!text) return options;
  return options.filter((option) => option.label.toLowerCase().includes(text) || option.value.toLowerCase().includes(text));
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  inputShell: { flexDirection: "row", alignItems: "stretch", borderWidth: 1.5, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main, overflow: "hidden" },
  errorShell: { borderColor: colors.error.main },
  disabled: { opacity: 0.7 },
  adornment: { minWidth: 54, paddingHorizontal: spacing.sm, gap: 6, justifyContent: "center", alignItems: "center", backgroundColor: colors.line.light, borderRightWidth: 1, borderRightColor: colors.border.main },
  prefix: { color: colors.neutral.main, fontSize: 13, fontWeight: "600" },
  valuePane: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  valueText: { flex: 1, color: colors.primary.main, fontSize: 16 },
  placeholder: { color: colors.mute.main },
  modalBody: { minHeight: 0 },
  searchHeader: { flexShrink: 0, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  searchShell: { height: 54, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main, overflow: "hidden" },
  focusedSearch: { borderColor: colors.primary.main },
  searchInput: { flex: 1, minWidth: 0, height: "100%", paddingHorizontal: spacing.sm, color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body1 },
  clearButton: { width: 44, height: "100%", alignItems: "center", justifyContent: "center" },
  optionsScroll: { flex: 1, minHeight: 0 },
  optionsContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  option: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: radii.lg, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  selectedOption: { backgroundColor: colors.line.light },
  optionText: { flex: 1, fontSize: 15, color: colors.primary.main },
  selectedText: { fontWeight: "700" },
  empty: { paddingVertical: spacing.lg, color: colors.mute.main, textAlign: "center" }
});
