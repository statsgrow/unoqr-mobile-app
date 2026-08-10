

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const SECURE_STORE_INDEX_KEY = "__secure_store_keys_index__";

/* ------------------- BREAK ---------------- */

//Reads the native SecureStore key index used for prefix-based deletion.
async function getSecureStoreIndex() {
   const rawValue = await SecureStore.getItemAsync(SECURE_STORE_INDEX_KEY);
   if (!rawValue) {
      return [] as string[];
   };//if ends

   try {
      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
         return [] as string[];
      };//if ends

      return parsedValue.filter((item): item is string => typeof item === "string");
   } catch (error) {
      return [] as string[];
   };//trycatch ends
};//func ends

/* ------------------- BREAK ---------------- */

//Writes a deduplicated list of tracked SecureStore keys.
async function setSecureStoreIndex(keys: string[]) {
   const uniqueKeys = Array.from(new Set(keys));
   await SecureStore.setItemAsync(SECURE_STORE_INDEX_KEY, JSON.stringify(uniqueKeys));
};//func ends

/* ------------------- BREAK ---------------- */

//Tracks a newly saved SecureStore key in the native index.
async function addSecureStoreKeyToIndex(key: string) {
   if (key === SECURE_STORE_INDEX_KEY) {
      return;
   };//if ends

   const keys = await getSecureStoreIndex();
   if (!keys.includes(key)) {
      keys.push(key);
      await setSecureStoreIndex(keys);
   };//if ends
};//func ends

/* ------------------- BREAK ---------------- */

//Removes a deleted SecureStore key from the native index.
async function removeSecureStoreKeyFromIndex(key: string) {
   if (key === SECURE_STORE_INDEX_KEY) {
      return;
   };//if ends

   const keys = await getSecureStoreIndex();
   const nextKeys = keys.filter((currentKey) => currentKey !== key);

   if (nextKeys.length !== keys.length) {
      await setSecureStoreIndex(nextKeys);
   };//if ends
};//func ends

/* ------------------- BREAK ---------------- */

//Stores a value by key in SecureStore (native) or localStorage (web).
export async function setData({ key, value }: { key: string; value: string | object | null; }) {
   //Remove date with same key
   if(key) await removeData({ key });

   //check if object, then convert to string
   if (typeof value === "object" && value !== null) {
      value = JSON.stringify(value);
   };//if ends

   //set data in secure storage
   if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(key, value || "");
      await addSecureStoreKeyToIndex(key);
   };//if ends

   //set data in localStorage for web
   if (Platform.OS === "web") localStorage.setItem(key, value || "");
};//func ends

/* ------------------- BREAK ---------------- */

//Reads a value by key from SecureStore/localStorage and parses JSON objects.
export async function getData({ key }: { key: string; }) {
   let data: string | null = null;

   //get data from secure storage
   if (Platform.OS !== "web") data = await SecureStore.getItemAsync(key);
   //get data from localStorage for web
   if (Platform.OS === "web") data = localStorage.getItem(key);

   //if data is string of object, then convert to object
   if (typeof data === "string" && data.startsWith("{") && data.endsWith("}")) {
      try {
         return JSON.parse(data);
      } catch (error) {
         return null;
      };//trycatch ends
   };//if ends

   //Default Return
   return data;
};//func ends

/* ------------------- BREAK ---------------- */

//Deletes a single key from SecureStore (native) or localStorage (web).
export async function removeData({ key }: { key: string; }) {

   //remove data from secure storage
   if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(key);
      await removeSecureStoreKeyFromIndex(key);
   };//if ends
   //remove data from localStorage for web
   if (Platform.OS === "web") localStorage.removeItem(key);
};//func ends

/* ------------------- BREAK ---------------- */

//Deletes all keys that start with a prefix across web and native storage.
export async function removeDataByPrefix({ prefix }: { prefix: string; }) {
   if (Platform.OS === "web") {
      const keysToDelete: string[] = [];

      for (let i = 0; i < localStorage.length; i += 1) {
         const currentKey = localStorage.key(i);
         if (currentKey && currentKey.startsWith(prefix)) {
            keysToDelete.push(currentKey);
         };//if ends
      };//for ends

      keysToDelete.forEach((currentKey) => localStorage.removeItem(currentKey));

      return keysToDelete.length;
   };//if ends

   const indexedKeys = await getSecureStoreIndex();
   const keysToDelete = indexedKeys.filter((currentKey) => currentKey.startsWith(prefix));

   for (const currentKey of keysToDelete) {
      await SecureStore.deleteItemAsync(currentKey);
   };//for ends

   const nextKeys = indexedKeys.filter((currentKey) => !currentKey.startsWith(prefix));
   await setSecureStoreIndex(nextKeys);

   return keysToDelete.length;
};//func ends

/* ------------------- BREAK ---------------- */