import { Platform } from "react-native";
import * as ExpoImagePicker from "expo-image-picker";

/* ------------------ BREAK ------------------ */

export type ImagePickerFile = {
  uri: string;
  name: string;
  type: string;
  size: number | null;
};

/* ------------------ BREAK ------------------ */

// Opens the platform image library and returns one normalized image file.
export async function selectImage(): Promise<ImagePickerFile | null> {
  if (Platform.OS === "ios") return selectIosImage();
  if (Platform.OS === "android") return selectAndroidImage();

  throw new Error("Image selection is only available on iOS and Android.");
};//export ends

/* ------------------ BREAK ------------------ */

// Requests iOS Photos access and returns the selected image file.
async function selectIosImage(): Promise<ImagePickerFile | null> {
  const permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo access is required to select an image.");
  };//if ends

  const result = await ExpoImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1,
    presentationStyle: ExpoImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN
  });

  return getSelectedFile(result);
};//func ends

// Uses the Android system photo picker and returns the selected image file.
async function selectAndroidImage(): Promise<ImagePickerFile | null> {
  const result = await ExpoImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1,
    defaultTab: "photos",
    legacy: false
  });

  return getSelectedFile(result);
};//func ends

// Converts the first selected Expo image asset into the shared file shape.
function getSelectedFile(result: ExpoImagePicker.ImagePickerResult): ImagePickerFile | null {
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    name: asset.fileName || "selected-image",
    type: asset.mimeType || "image/jpeg",
    size: asset.fileSize ?? null
  };
};//func ends
