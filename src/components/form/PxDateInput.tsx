import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Controller, type FieldPath, type FieldValues, type RegisterOptions, type UseFormReturn } from "react-hook-form";
import { HelperText, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

type LeftAdornment = {
	text?: string;
	icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

type PxDateInputProps<TFieldValues extends FieldValues> = {
	name: FieldPath<TFieldValues>;
	RHF: UseFormReturn<TFieldValues>;
	leftAdornment?: LeftAdornment;
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
	maxLength?: number;
};

/* ------------------ BREAK ------------------ */

export function PxDateInput<TFieldValues extends FieldValues>({
	name,
	RHF,
	leftAdornment,
	label,
	placeholder = "DD/MM/YYYY",
	disabled = false,
	rules,
	maxLength = 10
}: PxDateInputProps<TFieldValues>) {
	return (
		<Controller
			control={RHF.control}
			name={name}
			rules={rules}
			render={({ field, fieldState }) => (
				<View style={{ gap: 4 }}>
					<DateInputElement
						field={field}
						fieldState={fieldState}
						label={label}
						placeholder={placeholder}
						disabled={disabled}
						leftAdornment={leftAdornment}
						maxLength={maxLength}
					/>

					{fieldState.error?.message ? (
						<HelperText type="error" padding="none" style={styles.helperText}>
							{fieldState.error.message}
						</HelperText>
					) : null}
				</View>
			)}
		/>
	);
}

/* ------------------ BREAK ------------------ */

function DateInputElement({ field, fieldState, label, placeholder, disabled, leftAdornment, maxLength }: any) {
	const [focused, setFocused] = useState(false);
	const hasError = Boolean(fieldState.error);
	const isActive = focused && !hasError;

	return (
		<>
			{label ? <Text style={styles.label}>{label}</Text> : null}
			<View style={[styles.inputShell, isActive && styles.inputShellActive, hasError && styles.inputShellError, disabled && styles.inputShellDisabled]}>
				{leftAdornment?.text || leftAdornment?.icon ? (
					<View style={[styles.adornment, isActive && styles.adornmentActive, hasError && styles.adornmentError, disabled && styles.adornmentDisabled]}>
						{leftAdornment?.icon ? <MaterialCommunityIcons name={leftAdornment.icon} size={18} color={colors.grey[500]} /> : null}
						{leftAdornment?.text ? <Text style={styles.prefix}>{leftAdornment.text}</Text> : null}
					</View>
				) : null}

				<View style={styles.inputPane}>
					<TextInput
						dense
						mode="flat"
						value={((field.value as string | undefined) || "").slice(0, maxLength)}
						onChangeText={(value) => field.onChange(formatDateInput(value, maxLength))}
						onFocus={() => setFocused(true)}
						onBlur={() => {
							setFocused(false);
							field.onBlur();
						}}
						placeholder={placeholder}
						style={styles.input}
						contentStyle={styles.inputContent}
						disabled={disabled}
						error={false}
						keyboardType="number-pad"
						autoCapitalize="none"
						autoCorrect={false}
						underlineColor="transparent"
						activeUnderlineColor="transparent"
						outlineColor="transparent"
						activeOutlineColor="transparent"
						maxLength={maxLength}
					/>
				</View>
			</View>
		</>
	);
}

/* ------------------ BREAK ------------------ */

function formatDateInput(value: string, maxLength: number) {
	const digitsOnly = value.replace(/\D/g, "").slice(0, 8);

	if (digitsOnly.length <= 2) {
		return digitsOnly;
	}

	if (digitsOnly.length <= 4) {
		return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`.slice(0, maxLength);
	}

	return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`.slice(0, maxLength);
}

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	inputShell: {
		flexDirection: "row",
		alignItems: "stretch",
		borderWidth: 1.5,
		borderColor: colors.border.main,
		borderRadius: 12,
		backgroundColor: colors.white,
		overflow: "hidden"
	},
	inputShellError: {
		borderColor: colors.danger.main
	},
	inputShellActive: {
		borderColor: colors.primary
	},
	inputShellDisabled: {
		opacity: 0.7
	},
	adornment: {
		minWidth: 54,
		paddingHorizontal: 12,
		gap: 6,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: colors.grey[50],
		borderRightWidth: 1,
		borderRightColor: colors.border.main,
		borderTopLeftRadius: 12,
		borderBottomLeftRadius: 12
	},
	adornmentError: {
		borderRightColor: colors.danger.main
	},
	adornmentActive: {
		borderRightColor: colors.primary
	},
	adornmentDisabled: {
		backgroundColor: colors.grey[100]
	},
	inputPane: {
		flex: 1,
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
		overflow: "hidden"
	},
	input: {
		backgroundColor: colors.white,
		minHeight: 48,
		paddingHorizontal: 0
	},
	inputContent: {
		paddingLeft: 12
	},
	label: {
		color: colors.grey[500],
		marginLeft: 4,
		lineHeight: 16,
		fontSize: 13,
		fontWeight: "600"
	},
	prefix: {
		color: colors.grey[500],
		lineHeight: 16,
		fontSize: 13,
		fontWeight: "600"
	},
	helperText: {
		marginTop: 0,
		lineHeight: 12,
		marginLeft: 4,
		paddingBottom: 3
	}
});
