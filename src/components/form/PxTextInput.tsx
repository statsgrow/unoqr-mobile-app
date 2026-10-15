import { useState, type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { Controller, type FieldValues } from "react-hook-form";
import { Text, TextInput } from "react-native-paper";

import { PxIcon, type PxIconName } from "@/components/elements/PxIcon";
import { colors, radii, spacing } from "@/theme/tokens";

import { PxFormField, type PxFormBinding, type PxFormFieldOptions } from "./PxFormField";

/* ------------------ BREAK ------------------ */

type PaperInputProps = ComponentProps<typeof TextInput>;
type PxInputType = "text" | "email" | "password" | "number";
type PxTextInputSize = "small" | "medium" | "large";
export type PxLeftAdornment = { text?: string; icon?: PxIconName };
export type PxTextInputProps<T extends FieldValues = FieldValues> = PxFormBinding<T, string> & PxFormFieldOptions
  & Omit<PaperInputProps, "value" | "onChangeText" | "label" | "error" | "style" | "mode"> & {
    type?: PxInputType;
    size?: PxTextInputSize;
    leftAdornment?: PxLeftAdornment;
    inputStyle?: PaperInputProps["style"];
    onChangeText?: (value: string) => void;
  };
type InputElementProps<T extends FieldValues> = { props: PxTextInputProps<T>; value: string; change: (value: string) => void; blur?: () => void; inputRef?: (instance: unknown) => void; fieldError?: string | boolean };

/* ------------------ BREAK ------------------ */

// Reuses the existing input appearance with RHF or controlled values and a page-owned outer width.
export function PxTextInput<T extends FieldValues = FieldValues>(props: PxTextInputProps<T>) {
  if (props.RHF) {
    //Default Return
    return <Controller control={props.RHF.control} name={props.name} rules={props.rules} render={({ field, fieldState }) => (
      <InputElement props={props} value={String(field.value ?? "")} change={(value) => { field.onChange(value); props.onChangeText?.(value); }} blur={field.onBlur} inputRef={field.ref} fieldError={fieldState.error?.message || fieldState.invalid} />
    )} />;//return ends
  };//if ends

  //Default Return
  return <InputElement props={props} value={props.value} change={(value) => props.onChangeText?.(value)} />;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders the unchanged input shell, focus state and adornment with typed native event handlers.
function InputElement<T extends FieldValues>({ props, value, change, blur, inputRef, fieldError }: InputElementProps<T>) {
  const [focused, setFocused] = useState(false);
  const { RHF, name, rules, value: controlledValue, label, lable, fullWidth, helperText, error, style, type = "text", size = "medium", leftAdornment, inputStyle, contentStyle, onChangeText, onFocus, onBlur, disabled = false, ...nativeProps } = props;
  const resolvedError = fieldError || error;
  const active = focused && !resolvedError;
  const dimensions = inputSizeStyles[size];

  //Default Return
  return (
    <PxFormField label={label} lable={lable} fullWidth={fullWidth} helperText={helperText} error={resolvedError} style={style}>
      <View style={[styles.inputShell, active && styles.activeShell, resolvedError && styles.errorShell, disabled && styles.disabled]}>
        {leftAdornment?.text || leftAdornment?.icon ? <View style={[styles.adornment, active && styles.activeAdornment, resolvedError && styles.errorAdornment]}>
          {leftAdornment.icon ? <PxIcon name={leftAdornment.icon} size={dimensions.iconSize} color={colors.neutral.main} /> : null}
          {leftAdornment.text ? <Text style={[styles.prefix, { fontSize: dimensions.fontSize, lineHeight: dimensions.lineHeight }]}>{leftAdornment.text}</Text> : null}
        </View> : null}
        <View style={styles.inputPane}>
          <TextInput
            {...resolveInputProps(type)}
            {...nativeProps}
            ref={inputRef}
            accessibilityLabel={nativeProps.accessibilityLabel ?? label ?? lable ?? name}
            dense mode="flat"
            value={value}
            onChangeText={change}
            onFocus={(event) => { setFocused(true); onFocus?.(event); }}
            onBlur={(event) => { setFocused(false); blur?.(); onBlur?.(event); }}
            disabled={disabled}
            error={false}
            underlineColor="transparent" activeUnderlineColor="transparent" outlineColor="transparent" activeOutlineColor="transparent"
            style={[styles.input, { minHeight: dimensions.height, fontSize: dimensions.fontSize, lineHeight: dimensions.lineHeight }, inputStyle]}
            contentStyle={[styles.inputContent, { paddingLeft: dimensions.paddingLeft, paddingVertical: dimensions.paddingVertical }, contentStyle]}
          />
        </View>
      </View>
    </PxFormField>
  );//return ends
};//func ends

// Selects the same keyboard and capitalization defaults as the existing input component.
function resolveInputProps(type: PxInputType): Pick<PaperInputProps, "keyboardType" | "secureTextEntry" | "autoCapitalize" | "autoCorrect"> {
  if (type === "email") return { keyboardType: "email-address", secureTextEntry: false, autoCapitalize: "none", autoCorrect: false };
  if (type === "number") return { keyboardType: "numeric", secureTextEntry: false, autoCapitalize: "none", autoCorrect: false };
  if (type === "password") return { keyboardType: "default", secureTextEntry: true, autoCapitalize: "none", autoCorrect: false };
  return { keyboardType: "default", secureTextEntry: false, autoCapitalize: "sentences", autoCorrect: false };
};//func ends

/* ------------------ BREAK ------------------ */

const inputSizeStyles = {
  small: { height: 40, paddingLeft: 10, paddingVertical: 8, iconSize: 16, fontSize: 14, lineHeight: 18 },
  medium: { height: 48, paddingLeft: 12, paddingVertical: 10, iconSize: 18, fontSize: 16, lineHeight: 20 },
  large: { height: 56, paddingLeft: 14, paddingVertical: 13, iconSize: 20, fontSize: 18, lineHeight: 22 }
} as const;

const styles = StyleSheet.create({
  inputShell: { flexDirection: "row", alignItems: "stretch", borderWidth: 1.5, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main, overflow: "hidden" },
  activeShell: { borderColor: colors.primary.main },
  errorShell: { borderColor: colors.error.main },
  disabled: { opacity: 0.7 },
  adornment: { minWidth: 54, paddingHorizontal: spacing.sm, gap: 6, justifyContent: "center", alignItems: "center", backgroundColor: colors.line.light, borderRightWidth: 1, borderRightColor: colors.border.main },
  activeAdornment: { borderRightColor: colors.primary.main },
  errorAdornment: { borderRightColor: colors.error.main },
  inputPane: { flex: 1, minWidth: 0, overflow: "hidden" },
  input: { backgroundColor: colors.white.main, paddingHorizontal: 0 },
  inputContent: { paddingLeft: spacing.sm, paddingVertical: 0 },
  prefix: { color: colors.neutral.main, fontWeight: "600" }
});
