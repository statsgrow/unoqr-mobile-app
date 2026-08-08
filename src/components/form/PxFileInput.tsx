import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, HelperText, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { UseFormReturn } from "react-hook-form";

import { colors, fontFamilies, fonts, sizes } from "@/theme/themeSettings";
import { PxButton } from "../elements/PxButton";

/* ------------------ TYPES ------------------ */

export type BasicFileInputType = {
	name: string | null;
	label?: string | null;
	RHF: UseFormReturn<any> | any;
	disabled?: boolean;
	filename?: string;
	placeholder?: string;
	noFilePlaceHolder?: string;
	type?: "image" | "pdf" | "csv";
	helperText?: string | null;
	leftAdornment?: {
		icon?: keyof typeof MaterialCommunityIcons.glyphMap;
		text?: string;
	};
};

type StoredFileValue = {
	uri?: string | null;
	base64?: string | null;
	name?: string | null;
	size?: number | null;
	type?: string | null;
	cdn_url?: string | null;
};

/* ------------------ BREAK ------------------ */

const DEFAULT_FILE_VALUE: StoredFileValue = {
	uri: null,
	base64: null,
	name: null,
	size: null,
	type: null,
	cdn_url: null
};

/* ------------------ BREAK ------------------ */

//Renders a reusable file picker with preview, validation, and form binding.
export default function PxFileInput({
	name = null,
	label = null,
	RHF,
	placeholder,
	noFilePlaceHolder = "No File Uploaded",
	disabled = false,
	helperText = null,
	filename = "basic_filename",
	leftAdornment,
	type = "image"
}: BasicFileInputType) {
	const [fileLoading, setFileLoading] = useState(false);
	const [previewUri, setPreviewUri] = useState<string | null>(null);
	const [moduleError, setModuleError] = useState<string | null>(null);

	const watchedValue: StoredFileValue | null = name ? RHF.watch(name) : null;
	const fileError = useMemo(() => getFileError({ RHF, name }), [RHF?.formState?.errors, name]);

	useEffect(() => {
		if (!name) {
			return;
		}

		const currentValue = RHF.getValues(name);
		if (!currentValue) {
			RHF.setValue(name, DEFAULT_FILE_VALUE, { shouldValidate: false });
		}
	}, [RHF, name]);

	useEffect(() => {
		if (!watchedValue) {
			setPreviewUri(null);
			return;
		}

		setPreviewUri(watchedValue.uri || watchedValue.base64 || watchedValue.cdn_url || null);
	}, [watchedValue]);

	//Builds a file extension from the picked file name or MIME type.
	function getFileExtension(sourceName?: string | null, mimeType?: string | null) {
		if (sourceName) {
			const sourceParts = sourceName.split(".");
			const ext = sourceParts[sourceParts.length - 1];
			if (ext && ext.length <= 8) {
				return ext;
			}
		}

		const mimeTypeMap: Record<string, string> = {
			"image/jpeg": "jpg",
			"image/png": "png",
			"image/webp": "webp",
			"application/pdf": "pdf",
			"text/csv": "csv",
			"application/vnd.ms-excel": "csv"
		};

		return mimeType ? mimeTypeMap[mimeType] || null : null;
	}

	//Builds the final stored file name with the configured base name and extension.
	function buildFileName(nextValue: StoredFileValue) {
		const baseName = (filename || nextValue.name || "selected-file").trim();
		const extension = getFileExtension(nextValue.name || null, nextValue.type || null);

		if (!extension) {
			return baseName;
		}

		const cleanBaseName = baseName.replace(/\.[^.]+$/, "");
		return `${cleanBaseName}.${extension}`;
	}

	//Stores the selected file data into the form state.
	function setFileValue(nextValue: StoredFileValue) {
		if (!name) {
			return;
		}

		const resolvedValue = {
			...nextValue,
			name: buildFileName(nextValue)
		};

		RHF.setValue(name, resolvedValue, { shouldValidate: true, shouldDirty: true });
		setPreviewUri(resolvedValue.uri || resolvedValue.base64 || resolvedValue.cdn_url || null);
	};//func ends

	//Opens the picker and stores the selected file in the form state.
	async function handlePickFile() {
		if (!name || disabled || fileLoading) {
			return;
		}

		setFileLoading(true);
		setModuleError(null);

		try {
			if (type === "image") {
				const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
				if (!permissionResult.granted) {
					setModuleError("Media library permission is required to upload an image.");
					return;
				}

				const pickedResult = await ImagePicker.launchImageLibraryAsync({
					mediaTypes: ImagePicker.MediaTypeOptions.Images,
					quality: 1,
					base64: true
				});

				if (pickedResult.canceled || pickedResult.assets.length === 0) {
					return;
				}

				const asset = pickedResult.assets[0];
				setFileValue({
					uri: asset.uri,
					base64: asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : null,
					name: asset.fileName || "selected-image",
					size: asset.fileSize ?? null,
					type: asset.mimeType || "image/jpeg",
					cdn_url: null
				});

				return;
			}

			const documentResult = await DocumentPicker.getDocumentAsync({
				copyToCacheDirectory: true,
				multiple: false,
				type: type === "pdf" ? ["application/pdf"] : ["text/csv", "application/vnd.ms-excel", "text/comma-separated-values"]
			});

			if (documentResult.canceled || documentResult.assets.length === 0) {
				return;
			}

			const asset = documentResult.assets[0];
			setFileValue({
				uri: asset.uri,
				base64: null,
				name: asset.name,
				size: asset.size ?? null,
				type: asset.mimeType || (type === "pdf" ? "application/pdf" : "text/csv"),
				cdn_url: null
			});
		} catch (error) {
			console.error("Failed to pick file:", error);
			setModuleError("Unable to open the file picker. Please try again.");
		} finally {
			setFileLoading(false);
		}
	};//func ends

	//Clears the stored file value and preview.
	function handleRemove() {
		if (!name || disabled) {
			return;
		}

		RHF.setValue(name, null, { shouldValidate: true, shouldDirty: true });
		setPreviewUri(null);
		setModuleError(null);
	};//func ends

	const hasFile = Boolean(previewUri);
	const isImageFile = type === "image";
	const emptyStateLabel = placeholder || noFilePlaceHolder;

	//Default Return
	return (
		<View style={[styles.wrapper, fileError && styles.wrapperError, disabled && styles.wrapperDisabled]}>
			{label ? <Text style={styles.label}>{label}</Text> : null}

			<View style={styles.contentRow}>
				<Pressable style={styles.previewBox} onPress={!hasFile ? handlePickFile : undefined} disabled={disabled || fileLoading || hasFile}>
					{hasFile && isImageFile ? (
						<Image source={{ uri: previewUri! }} style={styles.previewImage} resizeMode="cover" />
					) : null}

					{hasFile && !isImageFile ? (
						<View style={styles.filePlaceholder}>
							<MaterialCommunityIcons name={type === "pdf" ? "file-pdf-box" : "file-delimited-outline"} size={34} color={colors.primary} />
							<Text style={styles.fileTypeLabel}>{type.toUpperCase()}</Text>
						</View>
					) : null}

					{!hasFile && !fileLoading ? (
						<View style={styles.emptyStateWrap}>
							{leftAdornment?.icon ? <MaterialCommunityIcons name={leftAdornment.icon} size={24} color={colors.grey[400]} /> : null}
							{leftAdornment?.text ? <Text style={styles.emptyStateAdornmentText}>{leftAdornment.text}</Text> : null}
							<Text style={styles.placeholderText}>{emptyStateLabel}</Text>
						</View>
					) : null}

					{fileLoading ? <ActivityIndicator color={colors.primary} /> : null}
				</Pressable>

				<View style={styles.actionArea}>
					<Text style={styles.helperCopy}>
						{helperText || defaultHelperText(type)}
					</Text>

					<View style={styles.buttonRow}>
						{hasFile ? (
							<PxButton mode="outlined" onPress={handleRemove} disabled={fileLoading} compact color="error" size="xs"
								startIcon="delete"
							>
								Remove
							</PxButton>
						) : (
							<PxButton mode="outlined" onPress={handlePickFile} disabled={fileLoading} compact color="primary" size="xs"
								startIcon="upload"
							>
								Upload
							</PxButton>
						)}
					</View>

					{watchedValue?.name ? <Text style={styles.filenameText}>{watchedValue.name}</Text> : null}
				</View>
			</View>

			{fileError ? <HelperText type="error" padding="none">{fileError}</HelperText> : null}
			{moduleError ? <HelperText type="error" padding="none">{moduleError}</HelperText> : null}
		</View>
	);//return ends
}
/* ------------------ BREAK ------------------ */

//Returns the default helper copy for the active file type.
function defaultHelperText(type: BasicFileInputType["type"]) {
	if (type === "pdf") {
		return "Upload a PDF document.";
	}

	if (type === "csv") {
		return "Upload a CSV file.";
	}

	return "Upload an image in JPG, PNG or WEBP format.";
};//func ends

/* ------------------ BREAK ------------------ */

//Collects form validation errors for the file field.
function getFileError({ RHF, name }: { RHF: any; name: string | null }) {
	if (!name) {
		return null;
	}

	const rhfErrors = RHF?.formState?.errors || null;
	const thisFieldErrors = _.get(rhfErrors, name) || null;
	const errorMessages: string[] = [];

	const directMessage = _.get(rhfErrors, `${name}.message`) || _.get(rhfErrors, name)?.message;
	if (typeof directMessage === "string") {
		errorMessages.push(directMessage);
	}

	if (thisFieldErrors && typeof thisFieldErrors === "object") {
		_.forEach(thisFieldErrors, (fieldError) => {
			if (fieldError?.message) {
				errorMessages.push(fieldError.message);
			}
		});
	}

	const uniqueMessages = _.uniq(errorMessages.filter(Boolean));
	return uniqueMessages.length > 0 ? uniqueMessages.join(", ") : null;
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	wrapper: {
		borderWidth: 1.5,
		borderColor: colors.border.main,
		borderRadius: sizes.borderRadius.lg,
		backgroundColor: colors.white,
		padding: sizes.spacing.md,
		gap: sizes.spacing.sm
	},
	wrapperError: {
		borderColor: colors.danger.main
	},
	wrapperDisabled: {
		opacity: 0.7
	},
	label: {
		color: colors.grey[500],
		marginLeft: 4,
		lineHeight: 16,
		fontSize: 13,
		fontFamily: fontFamilies.bold
	},
	contentRow: {
		flexDirection: "row",
		gap: sizes.spacing.md,
		alignItems: "center"
	},
	previewBox: {
		width: 96,
		height: 96,
		borderRadius: sizes.borderRadius.md,
		borderWidth: 1,
		borderColor: colors.border.main,
		backgroundColor: colors.grey[50],
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden"
	},
	previewImage: {
		width: "100%",
		height: "100%"
	},
	emptyStateWrap: {
		alignItems: "center",
		justifyContent: "center",
		gap: sizes.spacing.xs,
		paddingHorizontal: sizes.spacing.sm
	},
	emptyStateAdornmentText: {
		fontSize: fonts.sizes.xs,
		fontFamily: fontFamilies.bold,
		color: colors.grey[400]
	},
	placeholderText: {
		fontSize: fonts.sizes.xs,
		fontFamily: fontFamilies.medium,
		color: colors.grey[400],
		textAlign: "center",
		paddingHorizontal: sizes.spacing.sm
	},
	filePlaceholder: {
		alignItems: "center",
		justifyContent: "center",
		gap: sizes.spacing.xs
	},
	fileTypeLabel: {
		fontSize: fonts.sizes.xs,
		fontFamily: fontFamilies.bold,
		color: colors.primary
	},
	actionArea: {
		flex: 1,
		gap: sizes.spacing.sm
	},
	helperCopy: {
		fontSize: fonts.sizes.xs,
		fontFamily: fontFamilies.normal,
		lineHeight: 18,
		color: colors.grey[500]
	},
	buttonRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: sizes.spacing.sm
	},
	filenameText: {
		fontSize: fonts.sizes.xs,
		fontFamily: fontFamilies.medium,
		color: colors.primary
	}
});
