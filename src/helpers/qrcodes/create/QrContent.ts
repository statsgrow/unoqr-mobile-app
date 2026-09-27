/* ------------------ BREAK ------------------ */

export type QrContentType = "website" | "vcard" | "phone" | "text";

export type QrContentData = {
  website: string;
  phone: string;
  text: string;
  fullName: string;
  organization: string;
  contactPhone: string;
  email: string;
  contactWebsite: string;
};

export type QrContentSelection = {
  type: QrContentType;
  data: QrContentData;
};

/* ------------------ BREAK ------------------ */

export const EMPTY_CONTENT_DATA: QrContentData = {
  website: "",
  phone: "",
  text: "",
  fullName: "",
  organization: "",
  contactPhone: "",
  email: "",
  contactWebsite: ""
};

/* ------------------ BREAK ------------------ */

// Converts the selected content fields into the value encoded by the QR.
export function encodeQrContent({ type, data }: QrContentSelection): string {
  if (type === "website") return normalizeWebsite(data.website);
  if (type === "phone") return `tel:${normalizePhone(data.phone)}`;
  if (type === "text") {
    const value = data.text.trim();
    if (!value) throw new Error("Enter text for your QR code.");
    return value;
  };//if ends

  const name = data.fullName.trim();
  if (!name) throw new Error("Enter a name for the contact.");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${escapeVCard(name)};;;`, `FN:${escapeVCard(name)}`];
  if (data.organization.trim()) lines.push(`ORG:${escapeVCard(data.organization.trim())}`);
  if (data.contactPhone.trim()) lines.push(`TEL;TYPE=CELL:${normalizePhone(data.contactPhone)}`);
  if (data.email.trim()) lines.push(`EMAIL:${normalizeEmail(data.email)}`);
  if (data.contactWebsite.trim()) lines.push(`URL:${normalizeWebsite(data.contactWebsite)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
};//export ends

// Gives the saved content a short description for the page card.
export function describeQrContent({ type, data }: QrContentSelection): string {
  if (type === "website") return data.website.trim();
  if (type === "phone") return data.phone.trim();
  if (type === "text") return data.text.trim();
  return data.fullName.trim();
};//export ends

// Adds HTTPS to a website without a scheme and accepts only web URLs.
function normalizeWebsite(value: string): string {
  const candidate = value.trim();
  if (!candidate) throw new Error("Enter a website URL.");
  const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Enter a valid website URL.");
  };//try-catch ends
  if (!(["http:", "https:"].includes(url.protocol)) || !url.hostname) {
    throw new Error("Enter a valid HTTP or HTTPS website URL.");
  };//if ends
  return url.toString();
};//func ends

// Converts a phone number into a scanner-friendly tel value.
function normalizePhone(value: string): string {
  const number = value.trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d{3,15}$/.test(number)) throw new Error("Enter a valid phone number.");
  return number;
};//func ends

// Checks an optional contact email before putting it in a vCard.
function normalizeEmail(value: string): string {
  const email = value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid contact email.");
  return email;
};//func ends

// Escapes vCard separators so contact text cannot become another vCard field.
function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
};//func ends
