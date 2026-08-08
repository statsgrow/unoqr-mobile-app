import { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, HelperText, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import type { MediaType } from "expo-image-picker";
import type { UseFormReturn } from "react-hook-form";

import { PxButton } from "@/components/elements/PxButton";
import { apiSettings } from "@/settings";
import { colors, fontFamilies, fonts, sizes } from "@/theme/themeSettings";
import { Axios } from "@/utils/general/Axios";
import { GetResponseValidationErrors } from "@/utils/general/Error";

/* ------------------ TYPES ------------------ */

export type FileUploadPayload = {
	base64: string;
	name: string;
	type: string;
	size: number;
};

export type UploadedFile = {
	id: string;
	name: string;
	type: string;
	size: number;
	url: string;
	uid: string; // Unique identifier for the file on the server
};

export type PxFileUploadInputProps = {
	name: string;
	file_url_name?: string;
	RHF: UseFormReturn<any> | any;
	label?: string;
	placeholder?: string;
	helperText?: string;
	filename?: string;
	disabled?: boolean;
	type?: "image" | "pdf" | "csv";
	leftAdornment?: {
		icon?: keyof typeof MaterialCommunityIcons.glyphMap;
		text?: string;
	};
};

/* ------------------ BREAK ------------------ */

// Renders a file picker that uploads immediately and stores the server file in RHF.
export default function PxFileUploadInput({
	name, file_url_name,
	RHF,
	label,
	placeholder = "No File Uploaded",
	helperText,
	filename,
	disabled = false,
	type = "image",
	leftAdornment
}: PxFileUploadInputProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [requestError, setRequestError] = useState<string | null>(null);
	const [uploadFile, setUploadFile] = useState<UploadedFile | null>(null);
	const fieldValue = RHF.watch(name) as string | null;
	const fileUrlValue = file_url_name ? (RHF.watch(file_url_name) as string | null) : null;
	const fieldError = RHF.getFieldState(name, RHF.formState).error?.message || null;
	const isBusy = isUploading || isDeleting;
	const hasFile = Boolean(fieldValue || fileUrlValue || uploadFile?.id);

	useEffect(() => {
		if (!fieldValue && !fileUrlValue) {
			setUploadFile(null);
		}
	}, [fieldValue, fileUrlValue]);

	// Opens the configured picker, uploads the selected file, and stores the response.
	async function handlePickFile() {
		if (disabled || isBusy) return;
		//set request error to null
		setRequestError(null);

		//get file from picker and upload to server
		try {
			//Selected file from picker based on type
			const selectedFile = type === "image"
				? await pickImageFile()
				: await pickDocumentFile(type);
			//if no file selected, return
			if (!selectedFile) return;

			//upload file to server and set RHF value
			setIsUploading(true);
			const filePayload = {
				...selectedFile,
				name: buildUploadFileName({
					filename,
					sourceName: selectedFile.name,
					mimeType: selectedFile.type
				})
			};

			//upload file to server and set RHF value
			const serverFile = await uploadFileToServer(filePayload);
			//set upload file
			setUploadFile(serverFile);
			//set RHF value of name (file_id) uuid
			RHF.setValue(name, serverFile.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true
			});
			//set RHF value of url (file_url) link
			if(file_url_name) RHF.setValue(file_url_name, serverFile.url, { shouldDirty: true, shouldTouch: true, shouldValidate: true
			});
		} catch (error) {
			const validationErrorMessages = GetResponseValidationErrors({ error, RHF }) || null;
			//set request error message
			setRequestError(validationErrorMessages.length > 0 ? validationErrorMessages.join(", ") : "Unknown error occurred while uploading the file.");
		} finally {
			setIsUploading(false);
		};//try ends
	};//func ends

	// Deletes the current server file before clearing the RHF field.
	async function handleDeleteFile() {
		if (!fieldValue && !fileUrlValue && !uploadFile?.id || disabled || isBusy) return;
		//set request error to null
		setRequestError(null);
		setIsDeleting(true);

		//get delete id from RHF value or uploadFile id
		const deleteId = fieldValue || uploadFile?.id || null;
		console.log("Deleting file with ID:", deleteId);
		//Delete the file from the server
		try {
			if (deleteId) {
				await deleteFileFromServer(deleteId);
			};//if ends
			//Clear the RHF field and uploadFile state
			setUploadFile(null);
			//clear RHF value of name (file_id) uuid
			RHF.setValue(name, null, { shouldDirty: true, shouldTouch: true,shouldValidate: true });
			//clear RHF value of url (file_url) link
			if (file_url_name) {
				RHF.setValue(file_url_name, null, { shouldDirty: true,shouldTouch: true, shouldValidate: true
				});
			};//if ends
		} catch (error) {
			setRequestError(getRequestErrorMessage(error, "Unable to delete the uploaded file."));
		} finally {
			setIsDeleting(false);
		};//try ends
	};//func ends

	//Default Return
	return (
		<View style={[styles.wrapper, fieldError && styles.wrapperError, disabled && styles.wrapperDisabled]}>
			{label ? <Text style={styles.label}>{label}</Text> : null}

			<View style={styles.contentRow}>
				<Pressable
					style={styles.previewBox}
					onPress={!hasFile ? handlePickFile : undefined}
					disabled={disabled || isBusy || hasFile}
				>
					{hasFile && type === "image" && fileUrlValue ? (
						<Image source={{ uri: fileUrlValue }} style={styles.previewImage} resizeMode="cover" />
					) : null}

					{hasFile && type !== "image" ? (
						<View style={styles.filePlaceholder}>
							<MaterialCommunityIcons
								name={type === "pdf" ? "file-pdf-box" : "file-delimited-outline"}
								size={34}
								color={colors.primary}
							/>
							<Text style={styles.fileTypeLabel}>{type.toUpperCase()}</Text>
						</View>
					) : null}

					{!hasFile && !isBusy ? (
						<View style={styles.emptyStateWrap}>
							{leftAdornment?.icon ? (
								<MaterialCommunityIcons name={leftAdornment.icon} size={24} color={colors.grey[400]} />
							) : null}
							{leftAdornment?.text ? (
								<Text style={styles.emptyStateAdornmentText}>{leftAdornment.text}</Text>
							) : null}
							<Text style={styles.placeholderText}>{placeholder}</Text>
						</View>
					) : null}

					{isBusy ? (
						<View style={styles.loadingOverlay}>
							<ActivityIndicator color={colors.primary} />
						</View>
					) : null}
				</Pressable>

				<View style={styles.actionArea}>
					<Text style={styles.helperCopy}>{helperText || getDefaultHelperText(type)}</Text>

					<View style={styles.buttonRow}>
						{hasFile ? (
							<PxButton
								mode="outlined"
								color="error"
								size="xs"
								compact
								startIcon="delete"
								loading={isDeleting}
								disabled={disabled || isBusy}
								onPress={handleDeleteFile}
							>
								Delete
							</PxButton>
						) : (
							<PxButton
								mode="outlined"
								color="primary"
								size="xs"
								compact
								startIcon="upload"
								loading={isUploading}
								disabled={disabled || isBusy}
								onPress={handlePickFile}
							>
								Upload
							</PxButton>
						)}
					</View>

					{uploadFile?.name ? <Text style={styles.filenameText}>{uploadFile.name}</Text> : null}
				</View>
			</View>

			{fieldError ? <HelperText type="error" padding="none">{fieldError}</HelperText> : null}
			{requestError ? <HelperText type="error" padding="none">{requestError}</HelperText> : null}
		</View>
	);//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Uploads one base64 file payload and returns the database file object.
export async function uploadFileToServer(file: FileUploadPayload): Promise<UploadedFile> {
	//api endpoint
	const url = apiSettings.getApiUrl({ path: "/m/files" }).href;
	//Request
	const response = await Axios.post<{ data: UploadedFile }>(url, file);
	return response.data.data;
};//export ends

/* ------------------ BREAK ------------------ */

// Deletes one server file using its UUID as the request search parameter.
export async function deleteFileFromServer(id: string): Promise<void> {
	const url = apiSettings.getApiUrl({ path: "/m/files" });
	//set id as search param
	url.searchParams.set("id", id);
	//Request to delete
	await Axios.delete(url.href);
};//export ends

/* ------------------ BREAK ------------------ */

// Opens the image library and converts the selected image into an upload payload.
async function pickImageFile(): Promise<FileUploadPayload | null> {
	const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (!permissionResult.granted) {
		throw new Error("Media library permission is required to upload an image.");
	};//if ends

	const pickedResult = await ImagePicker.launchImageLibraryAsync({
		mediaTypes: ["images" as MediaType],
		quality: 1,
		base64: true
	});

	if (pickedResult.canceled || pickedResult.assets.length === 0) return null;

	const asset = pickedResult.assets[0];
	const mimeType = asset.mimeType || "image/jpeg";
	const base64 = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : "";

	if (!base64) throw new Error("Unable to read the selected image.");

	return {
		base64,
		name: asset.fileName || "selected-image",
		type: mimeType,
		size: asset.fileSize || getBase64FileSize(base64)
	};
};//func ends

/* ------------------ BREAK ------------------ */

// Opens the document picker and converts the selected document into an upload payload.
async function pickDocumentFile(type: "pdf" | "csv"): Promise<FileUploadPayload | null> {
	const pickedResult = await DocumentPicker.getDocumentAsync({
		copyToCacheDirectory: true,
		multiple: false,
		type: type === "pdf"
			? ["application/pdf"]
			: ["text/csv", "application/vnd.ms-excel", "text/comma-separated-values"]
	});

	if (pickedResult.canceled || pickedResult.assets.length === 0) return null;

	const asset = pickedResult.assets[0];
	const mimeType = asset.mimeType || (type === "pdf" ? "application/pdf" : "text/csv");
	const base64 = await readFileAsDataUrl(asset.uri, mimeType);

	return {
		base64,
		name: asset.name,
		type: mimeType,
		size: asset.size || getBase64FileSize(base64)
	};
};//func ends

/* ------------------ BREAK ------------------ */

// Reads a picked document as a base64 data URL on web and native platforms.
async function readFileAsDataUrl(uri: string, mimeType: string): Promise<string> {
	if (Platform.OS === "web") {
		const response = await fetch(uri);
		const blob = await response.blob();

		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(new Error("Unable to read the selected file."));
			reader.readAsDataURL(blob);
		});
	};//if ends

	const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
		encoding: LegacyFileSystem.EncodingType.Base64
	});
	return `data:${mimeType};base64,${base64}`;
};//func ends

/* ------------------ BREAK ------------------ */

// Calculates the decoded byte size of a base64 data URL.
function getBase64FileSize(base64: string): number {
	const content = base64.split(",")[1] || "";
	const padding = content.endsWith("==") ? 2 : content.endsWith("=") ? 1 : 0;
	return Math.floor((content.length * 3) / 4) - padding;
};//func ends

/* ------------------ BREAK ------------------ */

// Builds a normalized upload filename and appends the selected file extension.
function buildUploadFileName({
	filename,
	sourceName,
	mimeType
}: {
	filename?: string;
	sourceName: string;
	mimeType: string;
}): string {
	const sourceBaseName = sourceName.replace(/\.[^.]+$/, "");
	const normalizedBaseName = normalizeFileName(filename || sourceBaseName);
	const extension = getFileExtension(sourceName, mimeType);
	return `${normalizedBaseName}.${extension}`;
};//func ends

/* ------------------ BREAK ------------------ */

// Normalizes a filename to lowercase letters, numbers, and underscores.
function normalizeFileName(filename: string): string {
	const normalizedName = filename
		.replace(/\.[^.]+$/, "")
		.toLowerCase()
		.replace(/[\s-]+/g, "_")
		.replace(/[^a-z0-9_]/g, "")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");

	return normalizedName || "selected_file";
};//func ends

/* ------------------ BREAK ------------------ */

// Resolves a lowercase extension from the selected filename or MIME type.
function getFileExtension(sourceName: string, mimeType: string): string {
	const sourceExtension = sourceName.includes(".")
		? sourceName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "")
		: null;

	if (sourceExtension) return sourceExtension;

	const mimeExtensions: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/png": "png",
		"image/webp": "webp",
		"application/pdf": "pdf",
		"text/csv": "csv",
		"application/vnd.ms-excel": "csv",
		"text/comma-separated-values": "csv"
	};

	return mimeExtensions[mimeType] || "bin";
};//func ends

/* ------------------ BREAK ------------------ */

// Returns concise helper copy for the selected file type.
function getDefaultHelperText(type: PxFileUploadInputProps["type"]): string {
	if (type === "pdf") return "Upload a PDF document.";
	if (type === "csv") return "Upload a CSV file.";
	return "Upload an image in JPG, PNG or WEBP format.";
};//func ends

/* ------------------ BREAK ------------------ */

// Extracts a concise message from request or picker errors.
function getRequestErrorMessage(error: unknown, defaultMessage: string): string {
	if (error instanceof Error && error.message) return error.message;
	if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
		return error.message;
	};//if ends
	return defaultMessage;
};//func ends

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
	wrapper: {
		borderRadius: sizes.borderRadius.lg,
		backgroundColor: colors.white,
		gap: sizes.spacing.sm
	},
	wrapperError: {
		borderWidth: 1.5,
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
		fontWeight: "600"
	},
	contentRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: sizes.spacing.md
	},
	previewBox: {
		width: 96,
		height: 96,
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		borderRadius: sizes.borderRadius.md,
		borderWidth: 1,
		borderColor: colors.border.main,
		backgroundColor: colors.grey[50]
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
		textAlign: "center"
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
	loadingOverlay: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.45)",
		zIndex: 2
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
