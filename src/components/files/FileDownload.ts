import { Directory, File } from "expo-file-system";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NativeModules, Platform } from "react-native";

import { fileShare } from "./FileSharing";

/* ------------------ BREAK ------------------ */

export type FileDownloadInput = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export type DownloadedFile = FileDownloadInput & {
  savedUri: string;
  location: "Downloads" | "Files";
};

type AndroidDownloadsModule = {
  saveFile(sourceUri: string, fileName: string, mimeType: string): Promise<string>;
  openFile(uri: string, mimeType: string): Promise<void>;
};

type IosFileOpenerModule = {
  openFile(uri: string): Promise<void>;
};

/* ------------------ BREAK ------------------ */

// Saves a ready file to public Downloads on modern Android or a chosen Files folder on iOS.
export async function fileDownload(input: FileDownloadInput): Promise<DownloadedFile | null> {
  if (Platform.OS === "android" && Number(Platform.Version) >= 29) {
    const downloads = getAndroidDownloads();
    const savedUri = await downloads.saveFile(input.uri, input.fileName, input.mimeType);
    return { ...input, savedUri, location: "Downloads" };
  };//if ends

  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("File downloads are only available on iOS and Android.");
  };//if ends

  try {
    const directory = await Directory.pickDirectoryAsync();
    const source = new File(input.uri);
    const destination = new File(directory, input.fileName);
    await source.copy(destination);
    return { ...input, savedUri: destination.uri, location: "Files" };
  } catch (error: unknown) {
    if (isPickerCancellation(error)) return null;
    throw error;
  };//try-catch ends
};//export ends

// Opens the saved content with Android's app chooser or iOS Quick Look.
export async function openDownloadedFile(file: DownloadedFile): Promise<void> {
  if (Platform.OS === "android") {
    await getAndroidDownloads().openFile(file.savedUri, file.mimeType);
    return;
  };//if ends

  const opener = requireOptionalNativeModule<IosFileOpenerModule>("UnoqrFileOpener");
  if (!opener) throw new Error("Opening files needs a new iOS app build.");
  try {
    await opener.openFile(file.uri);
  } catch (error: unknown) {
    if ((error as { code?: string }).code !== "UNSUPPORTED_PREVIEW") throw error;
    await fileShare({ uri: file.uri, mimeType: file.mimeType, dialogTitle: "Open file" });
  };//try-catch ends
};//export ends

/* ------------------ BREAK ------------------ */

// Returns the Android Downloads bridge from the installed native app build.
function getAndroidDownloads(): AndroidDownloadsModule {
  const downloads = NativeModules.UnoqrDownloads as AndroidDownloadsModule | undefined;
  if (!downloads?.saveFile || !downloads?.openFile) {
    throw new Error("Downloads need a new Android app build. Run npm run android and try again.");
  };//if ends

  return downloads;
};//func ends

// Treats closing the system folder picker as a canceled download.
function isPickerCancellation(error: unknown): boolean {
  return error instanceof Error && /file pick(?:ing|er) was cancelled/i.test(error.message);
};//func ends
