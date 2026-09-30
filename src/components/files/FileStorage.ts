import { Directory, File, Paths } from "expo-file-system";

/* ------------------ BREAK ------------------ */

export type SaveFileInput = {
  uri: string;
  name: string;
  folder: string;
};

/* ------------------ BREAK ------------------ */

// Copies a file into persistent app storage and returns its relative path.
export async function saveFile({ uri, name, folder }: SaveFileInput): Promise<string> {
  const directory = new Directory(Paths.document, folder);
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, name);
  await new File(uri).copy(destination);
  return `${folder}/${name}`;
};//export ends

// Resolves a stored relative path against the current app documents directory.
export function getFile(path: string): File {
  return new File(Paths.document, path);
};//export ends

// Removes a stored file when it exists.
export async function deleteFile(path: string): Promise<void> {
  const file = getFile(path);
  if (file.exists) {
    await file.delete();
  };//if ends
};//export ends
