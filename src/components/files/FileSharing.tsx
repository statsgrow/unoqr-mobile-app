import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/* ------------------ BREAK ------------------ */

export type FileShareInput = {
  uri: string;
  mimeType?: string;
  dialogTitle?: string;
  uti?: string;
};

/* ------------------ BREAK ------------------ */

// Shares a ready local file through the current mobile platform.
export async function fileShare(input: FileShareInput): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is not available on this device.");
  };//if ends

  if (Platform.OS === "ios") return iosShare(input);
  if (Platform.OS === "android") return androidShare(input);

  throw new Error("File sharing is only available on iOS and Android.");
};//export ends

/* ------------------ BREAK ------------------ */

// Opens the iOS share sheet for a ready local file.
function iosShare({ uri, uti }: FileShareInput): Promise<void> {
  return Sharing.shareAsync(uri, { UTI: uti });
};//func ends

// Opens the Android share sheet with the file's MIME type and dialog title.
function androidShare({ uri, mimeType, dialogTitle }: FileShareInput): Promise<void> {
  return Sharing.shareAsync(uri, { mimeType, dialogTitle });
};//func ends
