import type { AppDigitalCardQr } from "./model";

/* ------------------ BREAK ------------------ */

type DigitalCardContact = {
  details: Pick<AppDigitalCardQr["details"], "fullname" | "company" | "position" | "phones" | "emails" | "address" | "bio">;
  cardSettings: Pick<AppDigitalCardQr["cardSettings"], "name">;
  settings: Pick<AppDigitalCardQr["settings"], "content">;
};

/* ------------------ BREAK ------------------ */

// Builds the same vCard fields as the public card using native preview values.
export function createDigitalCardContact(card: DigitalCardContact): string {
  const { fullname, company, position, phones, emails, address, bio } = card.details;
  const name = escapeContactValue(fullname || card.cardSettings.name);
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${name};;;`, `FN:${name}`];
  if (company) lines.push(`ORG:${escapeContactValue(company)}`);
  if (position) lines.push(`TITLE:${escapeContactValue(position)}`);
  phones.filter((phone) => phone.value.trim()).forEach((phone) => lines.push(`TEL:${escapeContactValue(phone.value)}`));
  emails.filter((email) => email.value.trim()).forEach((email) => lines.push(`EMAIL:${escapeContactValue(email.value)}`));
  if (address) lines.push(`ADR:;;${escapeContactValue(address)};;;;`);
  if (bio) lines.push(`NOTE:${escapeContactValue(bio)}`);
  lines.push(`URL:${escapeContactValue(card.settings.content)}`, "END:VCARD");
  return lines.join("\r\n") + "\r\n";
};//export ends

// Escapes separators and line breaks so contact fields cannot create extra vCard properties.
function escapeContactValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
};//func ends
