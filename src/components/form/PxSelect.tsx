import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Controller, useForm, type FieldPath, type FieldValues, type RegisterOptions, type UseFormReturn } from "react-hook-form";
import { HelperText, IconButton, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { PxModal } from "@/components/elements/PxModal";
import { PxTextInput } from "@/components/form/PxTextInput";
import { colors } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

export type PxSelectOption = {
	label: string;
	value: string;
};

type LeftAdornment = {
	text?: string;
	icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

type PxSelectProps<TFieldValues extends FieldValues> = {
	name: FieldPath<TFieldValues>;
	RHF: UseFormReturn<TFieldValues>;
	options: PxSelectOption[];
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	leftAdornment?: LeftAdornment;
	rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
};

type SearchFormValues = {
	search: string;
};

/* ------------------ BREAK ------------------ */

// Renders a form-controlled select field with searchable modal options.
export function PxSelect<TFieldValues extends FieldValues>({
	name,
	RHF,
	options,
	label,
	placeholder = "Select an option",
	disabled = false,
	leftAdornment,
	rules
}: PxSelectProps<TFieldValues>) {
	return (
		<Controller
			control={RHF.control}
			name={name}
			rules={rules}
			render={({ field, fieldState }) => (
				<>
					<SelectElement
						field={field}
						fieldState={fieldState}
						options={options}
						label={label}
						placeholder={placeholder}
						disabled={disabled}
						leftAdornment={leftAdornment}
					/>

					{fieldState.error?.message ? (
						<HelperText type="error" padding="none" style={styles.helperText}>
							{fieldState.error.message}
						</HelperText>
					) : null}
				</>
			)}
		/>
	);
}

export default PxSelect;

/* ------------------ BREAK ------------------ */

// Renders the interactive select field and manages its searchable options modal.
function SelectElement({ field, fieldState, options, label, placeholder, disabled, leftAdornment }: any) {
	const [open, setOpen] = useState(false);
	const searchRHF = useForm<SearchFormValues>({ defaultValues: { search: "" } });
	const searchText = searchRHF.watch("search");
	const selectedOption = useMemo(
		() => options.find((option: PxSelectOption) => option.value === field.value) ?? null,
		[field.value, options]
	);
	const visibleOptions = useMemo(
		() => filteredOptions(options, searchText),
		[options, searchText]
	);
	const hasError = Boolean(fieldState.error);
	const displayText = selectedOption?.label || placeholder;

	// Closes the options modal and clears its search text.
	function closeSelectModal() {
		setOpen(false);
		searchRHF.reset();
	};//func ends

	return (
		<View style={{ gap: 4 }}>
			{label ? <Text style={styles.label}>{label}</Text> : null}

			<Pressable
				disabled={disabled}
				onPress={() => setOpen(true)}
				style={[styles.inputShell, hasError && styles.inputShellError, disabled && styles.inputShellDisabled]}
			>
				{leftAdornment?.text || leftAdornment?.icon ? (
					<View style={[styles.adornment, hasError && styles.adornmentError, disabled && styles.adornmentDisabled]}>
						{leftAdornment?.icon ? <MaterialCommunityIcons name={leftAdornment.icon} size={18} color={colors.grey[500]} /> : null}
						{leftAdornment?.text ? <Text style={styles.prefix}>{leftAdornment.text}</Text> : null}
					</View>
				) : null}

				<View style={styles.valuePane}>
					<Text style={[styles.valueText, !selectedOption && styles.placeholderText]} numberOfLines={1}>
						{displayText}
					</Text>
					<MaterialCommunityIcons name="chevron-down" size={20} color={colors.grey[500]} />
				</View>
			</Pressable>

			<PxModal autoHeight={false} visible={open} onRequestClose={closeSelectModal}>
				<View style={styles.modalSheet}>
					<Text style={styles.modalTitle}>{label || "Select Option"}</Text>

					<View style={styles.searchRow}>
						<View style={styles.searchInput}>
							<PxTextInput
								name="search" size="small"
								RHF={searchRHF}
								placeholder="Search options"
								autoFocus
							/>
						</View>
						<IconButton
							icon="close"
							size={22}
							disabled={!searchText}
							onPress={() => searchRHF.setValue("search", "")}
							style={styles.clearButton}
							accessibilityLabel="Clear option search"
						/>
					</View>

					<View style={styles.optionsListContent}>
						{visibleOptions.map((option: PxSelectOption) => {
							const selected = option.value === field.value;

							return (
								<Pressable
									key={option.value}
									onPress={() => {
										field.onChange(option.value);
										field.onBlur();
										closeSelectModal();
									}}
									style={[styles.optionItem, selected && styles.optionItemSelected]}
								>
									<Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
									{selected ? <MaterialCommunityIcons name="check" size={18} color={colors.primary} /> : null}
								</Pressable>
							);
						})}

						{visibleOptions.length === 0 ? (
							<Text style={styles.emptyOptionsText}>No matching options found.</Text>
						) : null}
					</View>
				</View>
			</PxModal>
		</View>
	);
}

/* ------------------ BREAK ------------------ */

// Filters select options by label or value using normalized search text.
function filteredOptions(options: PxSelectOption[], text: string): PxSelectOption[] {
	const normalizedText = text.trim().toLowerCase();
	if (!normalizedText) return options;

	return options.filter((option) => {
		return option.label.toLowerCase().includes(normalizedText)
			|| option.value.toLowerCase().includes(normalizedText);
	});
};//func ends

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
	adornmentDisabled: {
		backgroundColor: colors.grey[100]
	},
	valuePane: {
		flex: 1,
		minHeight: 48,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12
	},
	valueText: {
		flex: 1,
		color: colors.black,
		fontSize: 16
	},
	placeholderText: {
		color: colors.grey[400]
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
	},
	modalSheet: {
		width: "100%",
		alignSelf: "center",
		paddingTop: 12,
		paddingHorizontal: 14,
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: colors.black,
		marginBottom: 8
	},
	searchRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 4,
		marginBottom: 8
	},
	searchInput: {
		flex: 1
	},
	clearButton: {
		margin: 0,
		marginBottom: 2
	},
	optionsListContent: {
		paddingBottom: 4
	},
	emptyOptionsText: {
		paddingHorizontal: 14,
		paddingVertical: 24,
		textAlign: "center",
		color: colors.grey[400]
	},
	optionItem: {
		minHeight: 48,
		borderRadius: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.border.light,
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between"
	},
	optionItemSelected: {
		backgroundColor: colors.grey[50]
	},
	optionText: {
		fontSize: 15,
		color: colors.black
	},
	optionTextSelected: {
		color: colors.primary,
		fontWeight: "700"
	}
});
