import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import type { UseFormReturn } from "react-hook-form";

import { selectImage, type ImagePickerFile } from "@/components/files/ImagePicker";
import GetError from "@/utils/general/Error";
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
	onUpload?: (file: FileInputValue) => Promise<FileInputValue>;
	onRemove?: (file: FileInputValue) => Promise<void>;
	leftAdornment?: {
		icon?: keyof typeof MaterialCommunityIcons.glyphMap;
		text?: string;
	};
};

export type FileInputValue = {
	id?: string;
	uid?: string;
	path?: string;
	url?: string | null;
	uri?: string | null;
	base64?: string | null;
	name?: string | null;
	size?: number | null;
	type?: string | null;
	cdn_url?: string | null;
};

/* ------------------ BREAK ------------------ */

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

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
	onUpload,
	onRemove,
	type = "image"
}: BasicFileInputType) {
	const [fileLoading, setFileLoading] = useState(false);
	const [previewUri, setPreviewUri] = useState<string | null>(null);
	const [moduleError, setModuleError] = useState<string | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);

	const watchedValue: FileInputValue | null = name ? RHF.watch(name) : null;
	const fileError = useMemo(() => getFileError({ RHF, name }), [RHF?.formState?.errors, name]);

	useEffect(() => {
		setPreviewError(null);
		if (!watchedValue) {
			setPreviewUri(null);
			return;
		}

		setPreviewUri(watchedValue.url || watchedValue.cdn_url || watchedValue.base64 || watchedValue.uri || null);
	}, [watchedValue]);

	//Builds a file extension from the picked file name or MIME type.
	function getFileExtension(sourceName?: string | null, mimeType?: string | null): string | null {
		if (sourceName) {
			const sourceParts = sourceName.split(".");
			const ext = sourceParts[sourceParts.length - 1];
			if (sourceParts.length > 1 && ext && ext.length <= 8) {
				return ext;
			}
		}

		const mimeTypeMap: Record<string, string> = {
			"image/jpeg": "jpg",
			"image/png": "png",
			"image/webp": "webp",
			"image/heic": "heic",
			"image/heif": "heif",
			"application/pdf": "pdf",
			"text/csv": "csv",
			"application/vnd.ms-excel": "csv"
		};

		return mimeType ? mimeTypeMap[mimeType] || null : null;
	}

	//Builds the final stored file name with the configured base name and extension.
	function buildFileName(nextValue: FileInputValue): string {
		const baseName = (filename || nextValue.name || "selected-file").trim();
		const extension = getFileExtension(nextValue.name || null, nextValue.type || null);

		if (!extension) {
			return baseName;
		}

		const cleanBaseName = baseName.replace(/\.[^.]+$/, "");
		return `${cleanBaseName}.${extension}`;
	}

	//Stores the selected file data into the form state.
	function setFileValue(nextValue: FileInputValue): void {
		if (!name) {
			return;
		}

		const resolvedValue = {
			...nextValue,
			name: nextValue.id ? nextValue.name : buildFileName(nextValue)
		};

		RHF.setValue(name, resolvedValue, { shouldValidate: true, shouldDirty: true });
		setPreviewUri(resolvedValue.url || resolvedValue.cdn_url || resolvedValue.base64 || resolvedValue.uri || null);
	};//func ends

	//Opens the picker and stores the selected file in the form state.
	async function handlePickFile(): Promise<void> {
		if (!name || disabled || fileLoading) {
			return;
		}

		setFileLoading(true);
		setModuleError(null);

		try {
			if (type === "image") {
				const selected = await selectImage();
				if (!selected) {
					return;
				};//if ends

				const prepared = await preparePhotoForUpload(selected, (error) => setModuleError(GetError({ error }).message));
				// Enforce the limit on the final image, including unchanged HEIC/HEIF files.
				const preparedSize = new File(prepared.uri!).size;
				if (preparedSize > MAX_FILE_SIZE_BYTES) throw new Error("File exceeds the 25 MB limit. Choose a smaller file.");
				prepared.size = preparedSize;
				const base64 = onUpload ? null : await new File(prepared.uri!).base64();
				const picked: FileInputValue = {
					...prepared,
					base64: base64 ? `data:${prepared.type};base64,${base64}` : null,
					cdn_url: null
				};
				setFileValue(onUpload ? await onUpload({ ...picked, name: buildFileName(picked) }) : picked);

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
			const fileSize = new File(asset.uri).size;
			if (fileSize > MAX_FILE_SIZE_BYTES) throw new Error("File exceeds the 25 MB limit. Choose a smaller file.");
			setFileValue({
				uri: asset.uri,
				base64: null,
				name: asset.name,
				size: fileSize,
				type: asset.mimeType || (type === "pdf" ? "application/pdf" : "text/csv"),
				cdn_url: null
			});
		} catch (error: unknown) {
			setModuleError(GetError({ error, message: "Unable to select or upload the file. Please try again." }).message);
		} finally {
			setFileLoading(false);
		}
	};//func ends

	// Removes a server file successfully before clearing its RHF value and preview.
	async function handleRemove(): Promise<void> {
		if (!name || disabled || fileLoading) return;
		setFileLoading(true);
		setModuleError(null);
		try {
			if (watchedValue && onRemove) await onRemove(watchedValue);
			RHF.setValue(name, null, { shouldValidate: true, shouldDirty: true });
			setPreviewUri(null);
		} catch (error: unknown) {
			setModuleError(GetError({ error, message: "Your file could not be removed." }).message);
		} finally {
			setFileLoading(false);
		};//try-catch ends
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
						<Image source={{ uri: previewUri! }} style={styles.previewImage} resizeMode="cover"
							onError={({ nativeEvent }) => setPreviewError(GetError({ error: new Error(nativeEvent.error), message: "Unable to load the photo preview." }).message)}
							onLoad={() => setPreviewError(null)}
						/>
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
								icon={({ color, size }: { color: string; size: number }) => <Trash2 color={color} size={size} strokeWidth={1.25} />}
							>
								Remove
							</PxButton>
						) : (
							<PxButton mode="outlined" onPress={handlePickFile} disabled={fileLoading} compact color="primary" size="xs"
								icon={({ color, size }: { color: string; size: number }) => <ImagePlus color={color} size={size} strokeWidth={1.25} />}
							>
									{type === "image" ? "Choose image" : "Choose file"}
							</PxButton>
						)}
					</View>

				</View>
			</View>

			{fileError ? <Text accessibilityRole="alert" style={styles.errorText}>{fileError}</Text> : null}
			{moduleError ? <Text accessibilityRole="alert" style={styles.errorText}>{moduleError}</Text> : null}
			{previewError ? <Text accessibilityRole="alert" style={styles.errorText}>{previewError}</Text> : null}
		</View>
	);//return ends
};//export ends
/* ------------------ BREAK ------------------ */

// Converts a picked photo to WebP, preserving HEIC/HEIF and existing WebP for upload.
async function preparePhotoForUpload(file: ImagePickerFile, onConversionError: (error: unknown) => void): Promise<FileInputValue> {
  const original: FileInputValue = { ...file, base64: null, cdn_url: null };
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (/^image\/(webp|hei[cf](?:-sequence)?)$/i.test(file.type) || ["webp", "heic", "heif"].includes(extension || "")) return original;
  try {
    const converted = await manipulateAsync(file.uri, [], { format: SaveFormat.WEBP, compress: 0.8 });
    return { ...original, uri: converted.uri, name: `${file.name.replace(/\.[^.]+$/, "")}.webp`, type: "image/webp", size: new File(converted.uri).size };
  } catch (error: unknown) {
    onConversionError(error);
    // The API converts the original image when the device cannot encode WebP.
    return original;
  };//try-catch ends
};//func ends

/* ------------------ BREAK ------------------ */

//Returns the default helper copy for the active file type.
function defaultHelperText(type: BasicFileInputType["type"]): string {
	if (type === "pdf") {
		return "Upload a PDF document.";
	}

	if (type === "csv") {
		return "Upload a CSV file.";
	}

	return "Only images can be uploaded of upto 25MB";
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
	errorText: { width: "100%", alignSelf: "stretch", color: colors.danger.main, fontFamily: fontFamilies.normal, fontSize: fonts.sizes.xs },
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
	}
});
