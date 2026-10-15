import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { FieldPath, FieldValues, RegisterOptions, UseFormReturn } from "react-hook-form";
import { HelperText, Text } from "react-native-paper";

import { colors, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

export type PxFormBinding<T extends FieldValues, Value> =
  | { RHF: UseFormReturn<T>; name: FieldPath<T>; rules?: RegisterOptions<T, FieldPath<T>>; value?: never }
  | { RHF?: never; name?: string; rules?: never; value: Value };

export type PxFormFieldOptions = {
  label?: string;
  lable?: string;
  fullWidth?: boolean;
  helperText?: string;
  error?: string | boolean;
  style?: StyleProp<ViewStyle>;
};

type PxFormFieldProps = PxFormFieldOptions & { children: ReactNode };

/* ------------------ BREAK ------------------ */

// Keeps labels, width and validation feedback consistent while pages control the outer wrapper.
export function PxFormField({ children, label, lable, fullWidth = true, helperText, error, style }: PxFormFieldProps) {
  const resolvedLabel = label ?? lable;
  const message = typeof error === "string" ? error : helperText;

  //Default Return
  return (
    <View style={[styles.wrapper, fullWidth && styles.fullWidth, style]}>
      {resolvedLabel ? <Text style={styles.label}>{resolvedLabel}</Text> : null}
      {children}
      {message ? <HelperText accessibilityRole={error ? "alert" : undefined} type={error ? "error" : "info"} padding="none" style={styles.helperText}>{message}</HelperText> : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xxs, minWidth: 0 },
  fullWidth: { width: "100%" },
  label: { color: colors.neutral.main, marginLeft: spacing.xxs, lineHeight: 16, fontSize: 13, fontWeight: "600" },
  helperText: { marginTop: 0, lineHeight: 16, marginLeft: spacing.xxs, paddingBottom: 3 }
});
