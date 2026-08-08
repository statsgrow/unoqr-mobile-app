import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Controller, type FieldPath, type FieldValues, type RegisterOptions, type UseFormReturn } from "react-hook-form";
import { HelperText, Text, TextInput } from "react-native-paper";

import { colors, fonts } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

type PxTextAreaProps<TFieldValues extends FieldValues> = {
	name: FieldPath<TFieldValues>;
	RHF: UseFormReturn<TFieldValues>;
	label?: string;
	placeholder?: string;
	autoFocus?: boolean;
	disabled?: boolean;
	numberOfLines?: number;
	rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
};

/* ------------------ BREAK ------------------ */

// Renders a form-controlled multiline text area with validation feedback.
export function PxTextArea<TFieldValues extends FieldValues>({
	name,
	RHF,
	label,
	placeholder,
	autoFocus = false,
	disabled = false,
	numberOfLines = 4,
	rules
}: PxTextAreaProps<TFieldValues>) {
	//Default Return
	return (
		<Controller
			control={RHF.control}
			name={name}
			rules={rules}
			render={({ field, fieldState }) => (
				<TextAreaElement
					field={field}
					fieldState={fieldState}
					label={label}
					placeholder={placeholder}
					autoFocus={autoFocus}
					disabled={disabled}
					numberOfLines={numberOfLines}
				/>
			)}
		/>
	);//return ends
};//export ends

export default PxTextArea;

/* ------------------ BREAK ------------------ */

// Renders the styled multiline input and tracks its focused state.
function TextAreaElement({
	field,
	fieldState,
	label,
	placeholder,
	autoFocus,
	disabled,
	numberOfLines
}: any) {
	const [focused, setFocused] = useState(false);
	const hasError = Boolean(fieldState.error);
	const isActive = focused && !hasError;

	//Default Return
	return (
		<View style={styles.wrapper}>
			{label ? <Text style={styles.label}>{label}</Text> : null}

			<View style={[
				styles.inputShell,
				isActive && styles.inputShellActive,
				hasError && styles.inputShellError,
				disabled && styles.inputShellDisabled
			]}>
				<TextInput
					dense
					mode="flat"
					value={(field.value as string | undefined) || ""}
					onChangeText={field.onChange}
					onFocus={() => setFocused(true)}
					onBlur={() => {
						setFocused(false);
						field.onBlur();
					}}
					placeholder={placeholder}
					autoFocus={autoFocus}
					disabled={disabled}
					error={false}
					multiline
					numberOfLines={numberOfLines}
					autoCapitalize="sentences"
					autoCorrect={false}
					underlineColor="transparent"
					activeUnderlineColor="transparent"
					outlineColor="transparent"
					activeOutlineColor="transparent"
					style={styles.input}
					contentStyle={styles.inputContent}
				/>
			</View>

			{fieldState.error?.message ? (
				<HelperText type="error" padding="none" style={styles.helperText}>
					{fieldState.error.message}
				</HelperText>
			) : null}
		</View>
	);//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	wrapper: {
		gap: 4
	},
	inputShell: {
		width: "100%",
		borderWidth: 1.5,
		borderColor: colors.border.main,
		borderRadius: 12,
		backgroundColor: colors.white,
		overflow: "hidden"
	},
	inputShellActive: {
		borderColor: colors.primary
	},
	inputShellError: {
		borderColor: colors.danger.main
	},
	inputShellDisabled: {
		opacity: 0.7
	},
	input: {
		minHeight: 112,
		backgroundColor: colors.white,
		fontSize: fonts.sizes.md,
		lineHeight: 20
	},
	inputContent: {
		paddingHorizontal: 12,
		paddingTop: 12,
		paddingBottom: 12,
		textAlignVertical: "top"
	},
	label: {
		marginLeft: 4,
		color: colors.grey[500],
		fontSize: 13,
		fontWeight: "600",
		lineHeight: 16
	},
	helperText: {
		marginTop: 0,
		marginLeft: 4,
		paddingBottom: 3,
		lineHeight: 12
	}
});
