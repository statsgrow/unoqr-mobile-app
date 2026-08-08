import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Controller, type FieldPath, type FieldValues, type RegisterOptions, type UseFormReturn } from "react-hook-form";
import { HelperText, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

//Input types
type PxInputType = "text" | "email" | "password" | "number";

type LeftAdornment = {
	text?: string;
	icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

type PxTextInputSize = "small" | "medium" | "large";


//Input Props
type PxTextInputProps<TFieldValues extends FieldValues> = {
	name: FieldPath<TFieldValues>;
	RHF: UseFormReturn<TFieldValues>;
	type?: PxInputType;
	size?: PxTextInputSize;
	leftAdornment?: LeftAdornment;
	label?: string;
	placeholder?: string;
	autoFocus?: boolean;
	disabled?: boolean;
	rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
};

/* ------------------ BREAK ------------------ */

export function PxTextInput<TFieldValues extends FieldValues>({
	name, RHF, type = "text", size = "medium", leftAdornment, label, placeholder, autoFocus = false,
	disabled = false, rules
}: PxTextInputProps<TFieldValues>) {
	const inputProps = resolveInputProps(type);
	const sizeStyles = inputSizeStyles[size];


   //Default Return
	return <Controller control={RHF.control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
         <View style={{ gap: 4 }}>
				<TextInputElement field={field} fieldState={fieldState} label={label} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus} inputProps={inputProps} leftAdornment={leftAdornment} sizeStyles={sizeStyles} />

				{fieldState.error?.message ? <HelperText type="error" padding="none" style={styles.helperText}>{fieldState.error.message}</HelperText> : null}
         </View>
      )}
   />;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

function TextInputElement({ field, fieldState, label, placeholder, disabled, autoFocus, inputProps, leftAdornment, sizeStyles }: any){
   const [focused, setFocused] = useState(false);
   const hasError = Boolean(fieldState.error);
   const isActive = focused && !hasError;

   //Default Return
	return <>
		{label ? <Text style={styles.label}>{label}</Text> : null}
		<View style={[styles.inputShell, isActive && styles.inputShellActive, hasError && styles.inputShellError, disabled && styles.inputShellDisabled]}>
			{leftAdornment?.text || leftAdornment?.icon ? (
				<View style={[styles.adornment, isActive && styles.adornmentActive, hasError && styles.adornmentError, disabled && styles.adornmentDisabled]}>
					{leftAdornment?.icon ? <MaterialCommunityIcons name={leftAdornment.icon} size={sizeStyles.iconSize} color={colors.grey[500]} /> : null}
					{leftAdornment?.text ? <Text style={[styles.prefix, { fontSize: sizeStyles.textFontSize, lineHeight: sizeStyles.textLineHeight }]}>{leftAdornment.text}</Text> : null}
				</View>
			) : null}
			<View style={styles.inputPane}>
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
					style={[styles.input, { minHeight: sizeStyles.height, fontSize: sizeStyles.textFontSize, lineHeight: sizeStyles.textLineHeight }]}
					contentStyle={[styles.inputContent, { paddingLeft: sizeStyles.contentPaddingLeft, paddingVertical: sizeStyles.contentPaddingVertical }]}
					disabled={disabled}
					error={false}
					keyboardType={inputProps.keyboardType}
					secureTextEntry={inputProps.secureTextEntry}
					autoCapitalize={inputProps.autoCapitalize}
					autoCorrect={inputProps.autoCorrect}
					underlineColor="transparent"
					activeUnderlineColor="transparent"
					outlineColor="transparent"
					activeOutlineColor="transparent"
				/>
			</View>
		</View>
	</>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	inputShell: {
		flexDirection: "row",
		alignItems: "stretch",
		width: "100%",
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
		paddingHorizontal: 0
	},
	inputContent: {
		paddingLeft: 12,
		paddingVertical: 0
	},
   label: {
		color: colors.grey[500],
		marginLeft: 4, lineHeight: 16, fontSize: 13, fontWeight: "600"
	},
	prefix: {
		color: colors.grey[500],
		lineHeight: 16,
		fontSize: 13,
		fontWeight: "600"
	},
	helperText: {
		marginTop: 0, lineHeight: 12,
		marginLeft: 4,
		paddingBottom: 3
	}
});

const inputSizeStyles = {
	small: {
		height: 40,
		contentPaddingLeft: 10,
		contentPaddingVertical: 8,
		iconSize: 16,
		textFontSize: 14,
		textLineHeight: 18
	},
	medium: {
		height: 48,
		contentPaddingLeft: 12,
		contentPaddingVertical: 10,
		iconSize: 18,
		textFontSize: 16,
		textLineHeight: 20
	},
	large: {
		height: 56,
		contentPaddingLeft: 14,
		contentPaddingVertical: 13,
		iconSize: 20,
		textFontSize: 18,
		textLineHeight: 22
	}
} as const;

/* ------------------ BREAK ------------------ */

function resolveInputProps(type: PxInputType) {
	if (type === "email") {
		return { keyboardType: "email-address" as const, secureTextEntry: false, autoCapitalize: "none" as const, autoCorrect: false };
	}
	if (type === "number") {
		return { keyboardType: "numeric" as const, secureTextEntry: false, autoCapitalize: "none" as const, autoCorrect: false };
	}
	if (type === "password") {
		return { keyboardType: "default" as const, secureTextEntry: true, autoCapitalize: "none" as const, autoCorrect: false };
	}

	return { keyboardType: "default" as const, secureTextEntry: false, autoCapitalize: "sentences" as const, autoCorrect: false };
};//func ends

/* ------------------ BREAK ------------------ */
