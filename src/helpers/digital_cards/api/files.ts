import type { FileInputValue } from "@/components/form/PxFileInput";
import { apiSettings } from "@/settings";
import { getStorageUser } from "@/utils/auth/AuthUser";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

type AppFile = FileInputValue & { id: string; uid: string; path: string; url: string };
type FileResponse = { data: AppFile };

/* ------------------ BREAK ------------------ */

// Uploads a picked card photo through the existing authenticated Axios instance.
export async function uploadCardPhoto(file: FileInputValue): Promise<AppFile> {
  const user = await getStorageUser();
  if (!user) throw new Error("Sign in to upload your photo.");
  if (!file.uri) throw new Error("Choose a photo before uploading.");
  const url = apiSettings.getApiUrl({ path: "/app/files" });
  const body = new FormData();
  body.append("file", { uri: file.uri, name: file.name || "profile-photo.jpg", type: file.type || "image/jpeg" } as unknown as Blob);
  const response = await Axios.post<FileResponse>(url.href, body, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  return response.data.data;
};//export ends

// Reads one stored app file without downloading its binary contents.
export async function getCardPhoto(uid: string): Promise<AppFile> {
  const user = await getStorageUser();
  if (!user) throw new Error("Sign in to access your photo.");
  const url = apiSettings.getApiUrl({ path: "/app/files" });
  url.searchParams.set("file_uid", uid);
  const response = await Axios.get<FileResponse>(url.href, { timeout: 15000 });
  return response.data.data;
};//export ends

// Removes the cloud object and its metadata before clearing the form value.
export async function deleteCardPhoto(file: FileInputValue): Promise<void> {
  if (!file.uid) return;
  const user = await getStorageUser();
  if (!user) throw new Error("Sign in to remove your photo.");
  const url = apiSettings.getApiUrl({ path: "/app/files" });
  url.searchParams.set("file_uid", file.uid);
  await Axios.delete(url.href, { timeout: 30000 });
};//export ends
