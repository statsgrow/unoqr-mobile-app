import * as yup from "yup";

import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";

/* ------------------ BREAK ------------------ */

export const digitalCardSchema = yup.object({
  uid: yup.string().matches(/^[A-Za-z0-9_-]+$/, "Invalid card UID.").required("Card UID is required."),
  details: yup.object({
    fullname: yup.string().trim().required("Enter your full name."),
    phones: yup.array().of(yup.object({ value: yup.string().trim().required("Enter a phone number.") })).max(2, "Add up to two phone numbers."),
    emails: yup.array().of(yup.object({ value: yup.string().trim().email("Enter a valid email address.").required("Enter an email address.") })).max(2, "Add up to two email addresses."),
    socialLinks: yup.array().of(yup.object({ label: yup.string().trim().required("Choose a social platform."), url: yup.string().url("Enter a valid social URL.").matches(/^https?:\/\//i, "Use an HTTP or HTTPS social URL.").required("Enter a social URL.") })).max(4, "Add up to four social links.")
  }).required(),
  layout: yup.string().oneOf(["modern", "centered", "spotlight", "minimal"]).required(),
  primaryColor: yup.string().matches(/^#[0-9A-Fa-f]{6}$/, "Choose a valid primary color.").required(),
  cardSettings: yup.object({ name: yup.string().trim().required("Enter a card name."), status: yup.string().oneOf(["published", "unpublished"]).required() }).required()
});//export ends

// Validates a card before preview or publication, excluding empty optional contact rows.
export async function validateDigitalCard(card: AppDigitalCardQr): Promise<void> {
  await digitalCardSchema.validate({ ...card, details: { ...card.details, phones: card.details.phones.filter((phone) => phone.value.trim()), emails: card.details.emails.filter((email) => email.value.trim()) } }, { abortEarly: true });
};//export ends
