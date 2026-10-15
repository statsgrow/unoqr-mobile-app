import { StyleSheet } from "react-native";
import type { FieldValues } from "react-hook-form";

import { fontSizes, spacing } from "@/theme/tokens";

import { PxTextInput, type PxTextInputProps } from "./PxTextInput";

/* ------------------ BREAK ------------------ */

export type PxTextAreaProps<T extends FieldValues = FieldValues> = PxTextInputProps<T>;

/* ------------------ BREAK ------------------ */

// Reuses the shared field and RHF feedback while retaining the current multiline input appearance.
export function PxTextArea<T extends FieldValues = FieldValues>(props: PxTextAreaProps<T>) {
  //Default Return
  return <PxTextInput {...props} multiline numberOfLines={props.numberOfLines ?? 4} inputStyle={[styles.input, props.inputStyle]} contentStyle={[styles.content, props.contentStyle]} />;//return ends
};//export ends

export default PxTextArea;

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  input: { minHeight: 112, fontSize: fontSizes.body1, lineHeight: 20 },
  content: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.sm, textAlignVertical: "top" }
});
