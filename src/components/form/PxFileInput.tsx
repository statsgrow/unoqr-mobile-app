import _ from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Images, Pencil, RefreshCw, Trash2 } from "lucide-react-native";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import type { UseFormReturn } from "react-hook-form";

import { PxIcon, type PxIconName } from "@/components/elements/PxIcon";
import { PxModal } from "@/components/elements/PxModal";
import { colors as tokenColors, spacing, radii } from "@/theme/tokens";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { selectImage, takePhoto } from "@/components/files/ImagePicker";
import GetError from "@/utils/general/Error";
import { colors, fontFamilies, fonts, sizes } from "@/theme/themeSettings";

import { PxButton } from "../elements/PxButton";
import PxPhotoEditor, { type PhotoEditorResult, type PhotoRatio } from "./PxPhotoEditor";

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
	ratio?: PhotoRatio;
	bgcolor?: string;
	helperText?: string | null;
	onUpload?: (file: FileInputValue) => Promise<FileInputValue>;
	onRemove?: (file: FileInputValue) => Promise<void>;
	leftAdornment?: {
		icon?: PxIconName;
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

type PhotoSource = "library" | "camera";
type PhotoSheet = "preview" | "source" | null;

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
	type = "image",
	ratio = 1,
	bgcolor = tokenColors.white.main
}: BasicFileInputType) {
	const [fileLoading, setFileLoading] = useState(false);
	const [editorOpen, setEditorOpen] = useState(false);
	const [editorFile, setEditorFile] = useState<string | File | null>(null);
	const [photoSheet, setPhotoSheet] = useState<PhotoSheet>(null);
	const dismissResolve = useRef<(() => void) | null>(null);
	const [previewUri, setPreviewUri] = useState<string | null>(null);
	const [moduleError, setModuleError] = useState<string | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);

	const watchedValue: FileInputValue | null = name ? RHF.watch(name) : null;
	const fileError = useMemo(() => getFileError({ RHF, name }), [RHF?.formState?.errors, name]);

	// Registers the photo field so confirmed uploads can reset its default without other form fields.
	useEffect(() => {
		if (name) RHF.register(name);
	}, [RHF, name]);

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

	// Opens the image source chooser or the ordinary document picker.
	function handleChooseFile(): void {
		if (!name || disabled || fileLoading) return;
		if (type === "image") {
			setModuleError(null);
			setPhotoSheet(previewUri ? "preview" : "source");
		} else {
			void handlePickFile();
		};//if ends
	};//func ends

	// Waits for iOS to dismiss the sheet before presenting the native camera or photo library.
	function closePhotoSheet(): Promise<void> {
		if (Platform.OS !== "ios" || !photoSheet) {
			setPhotoSheet(null);
			return Promise.resolve();
		};//if ends
		return new Promise((resolve) => {
			dismissResolve.current = resolve;
			setPhotoSheet(null);
		});
	};//func ends

	// Releases the native picker after the photo sheet has finished dismissing.
	function handleSheetDismiss(): void {
		dismissResolve.current?.();
		dismissResolve.current = null;
	};//func ends

	// Opens the selected image in the editor without uploading or changing the saved photo.
	async function handlePickFile(source: PhotoSource = "library"): Promise<void> {
		if (!name || disabled || fileLoading) {
			return;
		}

		setFileLoading(true);
		setModuleError(null);

		try {
			if (type === "image") {
				await closePhotoSheet();
				const selected = source === "camera" ? await takePhoto() : await selectImage();
				if (!selected) {
					return;
				};//if ends

				// Keep the selected image local until the user applies their edit.
				setEditorFile(selected.uri);
				setEditorOpen(true);

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
			if (type === "image") setPhotoSheet("source");
		} finally {
			setFileLoading(false);
		}
	};//func ends

	// Dismisses the preview before opening the photo editor in its own shared modal.
	async function handleEditPhoto(): Promise<void> {
		if (!previewUri || disabled || fileLoading) return;
		await closePhotoSheet();
		setEditorFile(previewUri);
		setEditorOpen(true);
	};//func ends

	// Uploads the edited pixels before replacing the selected form photo.
	async function handleApplyPhoto(result: PhotoEditorResult): Promise<void> {
		setFileLoading(true);
		setModuleError(null);
		try {
			if (result.file.size > MAX_FILE_SIZE_BYTES) throw new Error("File exceeds the 25 MB limit. Choose a smaller crop.");
			const edited: FileInputValue = {
				uri: result.file.uri, name: buildFileName({ name: "edited-photo.png", type: "image/png" }),
				type: "image/png", size: result.file.size, base64: onUpload ? null : result.base64
			};
			setFileValue(onUpload ? await onUpload(edited) : edited);
		} catch (error: unknown) {
			setModuleError(GetError({ error, message: "Your edited photo could not be uploaded. Please try again." }).message);
			throw error;
		} finally {
			setFileLoading(false);
		};//try-catch ends
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
			setPhotoSheet(null);
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
				<Pressable style={styles.previewBox} accessibilityRole="button" accessibilityLabel={hasFile && isImageFile ? "View photo" : "Choose file"} onPress={handleChooseFile} disabled={disabled || fileLoading || (hasFile && !isImageFile)}>
					{hasFile && isImageFile && !fileLoading ? (
						<Image source={{ uri: previewUri! }} style={styles.previewImage} resizeMode="cover"
							onError={({ nativeEvent }) => setPreviewError(GetError({ error: new Error(nativeEvent.error), message: "Unable to load the photo preview." }).message)}
							onLoad={() => setPreviewError(null)}
						/>
					) : null}

					{hasFile && !isImageFile && !fileLoading ? (
						<View style={styles.filePlaceholder}>
							<PxIcon name={type === "pdf" ? "file-pdf-box" : "file-delimited-outline"} size={34} color={colors.primary} />
							<Text style={styles.fileTypeLabel}>{type.toUpperCase()}</Text>
						</View>
					) : null}

					{!hasFile && !fileLoading ? (
						<View style={styles.emptyStateWrap}>
							{leftAdornment?.icon ? <PxIcon name={leftAdornment.icon} size={24} color={colors.grey[400]} /> : null}
							{leftAdornment?.text ? <Text style={styles.emptyStateAdornmentText}>{leftAdornment.text}</Text> : null}
							<Text style={styles.placeholderText}>{emptyStateLabel}</Text>
						</View>
					) : null}

					{fileLoading ? <PxCircularProgress color={tokenColors.primary.main} size={24} /> : null}
				</Pressable>

				<View style={styles.actionArea}>
					<Text style={styles.helperCopy}>
						{helperText || defaultHelperText(type)}
					</Text>

					<View style={styles.buttonRow}>
						{hasFile && !isImageFile ? (
							<PxButton mode="outlined" onPress={handleRemove} disabled={disabled || fileLoading} compact color="error" size="xs"
								icon={({ color, size }: { color: string; size: number }) => <Trash2 color={color} size={size} strokeWidth={1.25} />}
							>
								Remove
							</PxButton>
						) : (
							<PxButton mode="outlined" onPress={handleChooseFile} disabled={disabled || fileLoading} compact color="primary" size="sm"
								icon={({ color, size }: { color: string; size: number }) => <ImagePlus color={color} size={size} strokeWidth={1.25} />}
							>
									{isImageFile ? (hasFile ? "View photo" : "Choose image") : "Choose file"}
							</PxButton>
						)}
					</View>

				</View>
			</View>

			{fileError ? <Text accessibilityRole="alert" style={styles.errorText}>{fileError}</Text> : null}
			{moduleError ? <Text accessibilityRole="alert" style={styles.errorText}>{moduleError}</Text> : null}
			{previewError ? <Text accessibilityRole="alert" style={styles.errorText}>{previewError}</Text> : null}

			<PxModal open={photoSheet !== null} onRequestClose={() => { if (!fileLoading) setPhotoSheet(null); }}
				onDismiss={handleSheetDismiss} name={photoSheet === "preview" ? label || "Photo" : `${hasFile ? "Replace" : "Choose"} ${label?.toLowerCase() || "photo"}`}
				height="auto" maxHeight={720} keyboardAvoiding={false} closeOnBackdropClick={!fileLoading} hideCloseButton={fileLoading}
				footerAction={<View style={styles.sheetActions}>
					{photoSheet === "preview" ? <>
						<PxButton mode="outlined" onPress={handleEditPhoto} disabled={disabled || fileLoading}
							icon={({ color, size }: { color: string; size: number }) => <Pencil color={color} size={size} strokeWidth={1.25} />}>
							Edit photo
						</PxButton>
						<PxButton mode="outlined" onPress={() => setPhotoSheet("source")} disabled={disabled || fileLoading}
							icon={({ color, size }: { color: string; size: number }) => <RefreshCw color={color} size={size} strokeWidth={1.25} />}>
							Replace photo
						</PxButton>
						<PxButton mode="text" color="error" onPress={handleRemove} disabled={disabled || fileLoading} loading={fileLoading}
							icon={({ color, size }: { color: string; size: number }) => <Trash2 color={color} size={size} strokeWidth={1.25} />}>
							Delete photo
						</PxButton>
					</> : <>
						<PxButton mode="outlined" onPress={() => void handlePickFile("library")} disabled={disabled || fileLoading}
							icon={({ color, size }: { color: string; size: number }) => <Images color={color} size={size} strokeWidth={1.25} />}>
							Choose from gallery
						</PxButton>
						<PxButton mode="outlined" onPress={() => void handlePickFile("camera")} disabled={disabled || fileLoading}
							icon={({ color, size }: { color: string; size: number }) => <Camera color={color} size={size} strokeWidth={1.25} />}>
							Take photo
						</PxButton>
					</>}
				</View>}
			>
				<View style={styles.sheetBody}>
					{photoSheet === "preview" && previewUri ? <Image source={{ uri: previewUri }} style={styles.largePreview} resizeMode="contain"
						onError={() => setPreviewError("Unable to load the photo preview. Please try replacing the photo.")}
						onLoad={() => setPreviewError(null)} /> : null}
					{moduleError ? <Text accessibilityRole="alert" style={styles.errorText}>{moduleError}</Text> : null}
					{photoSheet === "preview" && previewError ? <Text accessibilityRole="alert" style={styles.errorText}>{previewError}</Text> : null}
				</View>
			</PxModal>
			<PxPhotoEditor open={editorOpen} setOpen={setEditorOpen} file={editorFile} ratio={ratio} bgcolor={bgcolor} onApply={handleApplyPhoto} />
		</View>
	);//return ends
};//export ends
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
	sheetBody: { paddingHorizontal: spacing.lg, gap: spacing.sm },
	sheetActions: { gap: spacing.sm },
	largePreview: { width: "100%", aspectRatio: 1, borderRadius: radii.lg, backgroundColor: tokenColors.cream.main },
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
