
import * as yup from "yup"

//CUSOTM METHOD DECLARATION
declare module "yup" {
  interface StringSchema {
    alphabetsOnly(message?: string): StringSchema;
    mobile(message?: string): StringSchema;
    base64(message?: string): StringSchema;
    filename(message?: string): StringSchema;
    imageOnly(message?: string): StringSchema;
    webUrl(message?: string): StringSchema;
    numbersOnly(opts?: { min?: number, max?: number, message?: string }): StringSchema;
  }
};//declare ends
 
//YUP EXTEND METHOD
yup.addMethod(yup.string, 'alphabetsOnly', function(message) {
  return this.test('custom-format', message || "Only alphabets are allowed", function(value) {
    if (!value) return true; // Allow empty if not required elsewhere
    return /^[A-Za-z\s]+$/.test(value);
  });
});

//YUP EXTEND MOBILE METHOD (NO PLUS, E164 FORMAT)
yup.addMethod(yup.string, 'mobile', function(message) {
  return this.test(
    'mobile-e164-no-plus',
    message || 'Invalid mobile number',
    function (value) {
      if (!value) return true; // allow empty if not required
      //test for E.164 format without plus sign
      const e164NoPlusRegex = /^[1-9]\d{1,14}$/;
      if (!e164NoPlusRegex.test(value)) return this.createError({
          message: "Mobile number must be in international format",
        });

      //find country code from the list
      const phoneCountries = require('@/assets/data/countries').phoneCountries;
      // 2️⃣ Detect country by code (1–4 digits)
      let detectedCountry: any = null;
      //for loop for 1 to 4 digits
      for (let i = 1; i <= 4; i++) {
        const code = value.substring(0, i);
        const found = phoneCountries.find((c: any) => c.code === code);
        if (found) {
          detectedCountry = found;
          break;
        }
      };//for ends
      //return false if country not found
      if (!detectedCountry) return this.createError({
          message: "Invalid country code in mobile number",
        });

      // 3️⃣ Validate national number length using country min/max
      const nationalNumber = value.substring(detectedCountry.code.length);
      //check length
      if (nationalNumber.length < detectedCountry.min || nationalNumber.length > detectedCountry.max) return this.createError({
          message: "Invalid national number length",
        });
      //default return
      return true;
    }
  );
 });//method ends

//YUP EXTEND BASE64 ONLY
yup.addMethod(yup.string, 'base64', function (message) {
  return this.test('custom-format', message || "Invalid file data", function (value) {
    if (!value) return true; // Allow empty if not required elsewhere
    return value.startsWith('data:') && value.includes(';base64,');
  });
});//method ends

//YUP EXTEND FOR IMAGE FILE CHECKING
yup.addMethod(yup.string, 'imageOnly', function(message) {
   return this.test('custom-format', message || "Only jpg, jpeg, webp and png files are allowed", function(value) {
     if (!value) return true; // Allow empty if not required elsewhere
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if(allowedTypes.includes(value)) return true;
     return false;
   });
 });//method ends

//YUP EXTEND FOR FILENAME CHECKING
yup.addMethod(yup.string, 'filename', function(message) {
   return this.test('custom-format', message || "Invalid filename format. Ex: example.jpg", function(value) {
     if (!value) return true; // Allow empty if not required elsewhere
     return /^[\w,\s-]+\.[A-Za-z]{3,4}$/.test(value);
   });
 });//method ends

//YUP EXTEND FOR WEB URL CHECKING (accepts urls with or without protocol)
yup.addMethod(yup.string, 'webUrl', function(message) {
  return this.test('custom-format', message || "Enter a valid URL", function(value) {
    if (!value) return true; // Allow empty if not required elsewhere

    const normalizedValue = value.trim();
    const webUrlRegex = /^(?:(?:https?:\/\/)?(?:www\.)?)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?:\/[^\s]*)?$/;
    return webUrlRegex.test(normalizedValue);
  });
});//method ends

//YUP EXTEND FOR NUMBERS ONLY (with optional min/max as object)
yup.addMethod(yup.string, 'numbersOnly', function(opts?: { min?: number, max?: number, message?: string }) {
  return this.test('custom-format', (opts && opts.message) || "Only numbers are allowed", function(value: any) {
    if (!value) return true; // Allow empty if not required elsewhere
    if (!/^\d+$/.test(value)) return false;
    const num = Number(value);
    // Check min/max if provided
    if (opts && typeof opts.min === 'number' && num < opts.min) return this.createError({ message: `Value must be at least ${opts.min}` });
    if (opts && typeof opts.max === 'number' && num > opts.max) return this.createError({ message: `Value must be at most ${opts.max}` });
    return true;
  });
});//method ends

//EXPORT
export default yup;

/* ------------------- BREAK ------------------ */

// Collects nested validation messages from a RHF or Yup error object.
export function getErrorMessagesFromError(error: any): string[] {
  const messages = new Set<string>();

  function visit(value: any) {
    if (!value) return;

    if (typeof value?.root?.message === "string" && value.root.message.trim()) {
      messages.add(value.root.message);
    }

    if (typeof value.message === "string" && value.message.trim()) {
      messages.add(value.message);
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };//func ends

  visit(error);

  return [...messages];
};//func ends

/* ------------------- BREAK ------------------ */

