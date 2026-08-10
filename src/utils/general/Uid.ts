
//Imports
import _ from 'lodash';

//Return Type
export type UidParamsType = { 
   length: number,
   suffix?: string, 
   prefix?: string 
};   //type ends

/* --------------- BREAK --------------- */

function getRandomBytes(length: number): Uint8Array {
   const randomBytes = new Uint8Array(length);
   const nativeCrypto = globalThis.crypto;

   if (nativeCrypto && typeof nativeCrypto.getRandomValues === 'function') {
      nativeCrypto.getRandomValues(randomBytes);
      return randomBytes;
   };//if ends

   for (let i = 0; i < length; i += 1) {
      randomBytes[i] = Math.floor(Math.random() * 256);
   };//for ends

   return randomBytes;
};//func ends

/* --------------- BREAK --------------- */

export function getUID({ length = 10, suffix = '', prefix = '' }: UidParamsType): string {
   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   const characterLength = characters.length;
   const randomBytes = getRandomBytes(length);
   //empty result
   let result = '';
   for (let i = 0; i < length; i++) {
      // Map the random byte to an index within the characters string
      result += characters.charAt(randomBytes[i] % characterLength);
   };//for ends
   return prefix + result + suffix;
};//func ends

/* --------------- BREAK ---------------- */

export function getRandomIdNumber({ length = 10, prefix = '' }: UidParamsType): string {
   const digits = '0123456789';
   let result = '';

   // First digit (cannot be zero)
   result += digits.charAt(Math.floor(Math.random() * (digits.length - 1)) + 1);

   // Middle digits
   for (let i = 1; i < length - 1; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
   }

   // Last digit (cannot be zero)
   result += digits.charAt(Math.floor(Math.random() * (digits.length - 1)) + 1);

   return prefix + parseInt(result);
};//func ends

/* --------------- BREAK ------------------ */

export function getUUIDv4(): string {
   // Generate a random UUID v4 using the crypto API when available, with a safe fallback.
   const randomBytes = getRandomBytes(16);

   // Set the version and variant bits according to RFC 4122
   randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // Version 4
   randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // Variant 10

   // Convert to hexadecimal string format
   const hexBytes = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0'));
   return `${hexBytes.slice(0, 4).join('')}-${hexBytes.slice(4, 6).join('')}-${hexBytes.slice(6, 8).join('')}-${hexBytes.slice(8, 10).join('')}-${hexBytes.slice(10, 16).join('')}`;
};//func ends

/* --------------- BREAK ------------------ */

export function isUUID(string: string): boolean {
   const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   return uuidRegex.test(string);
};//func ends

/* --------------- BREAK ------------------ */