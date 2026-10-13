import type { FileInputValue } from "@/components/form/PxFileInput";
import type { QrCreateFormValues } from "@/helpers/qrcodes/create/QrCreate";
import { colors } from "@/theme/tokens";
import { getUID } from "@/utils/general/Uid";

/* ------------------ TYPES ------------------ */

export type DigitalCardLayoutType = "modern" | "centered" | "spotlight" | "minimal";
export type DigitalCardSocialLink = { label: string; url: string };
export type DigitalCardSettingsValues = {
  name: string;
  status: "published" | "unpublished";
  seoTitle: string;
  seoDescription: string;
  allowIndexing: boolean;
  allowSaveContact: boolean;
};
export type DigitalCardDetails = {
  profilePicture: FileInputValue | null;
  fullname: string;
  company: string;
  position: string;
  phones: { value: string }[];
  emails: { value: string }[];
  socialLinks: DigitalCardSocialLink[];
  bio: string;
  address: string;
};
export type AppDigitalCardQr = { id?: string; uid: string; userId: string; settings: QrCreateFormValues; details: DigitalCardDetails; layout: DigitalCardLayoutType; primaryColor: string; cardSettings: DigitalCardSettingsValues };

/* ------------------ BREAK ------------------ */

export const DIGITAL_CARD_DEFAULTS: DigitalCardDetails = {
  profilePicture: null,
  fullname: "",
  company: "",
  position: "",
  phones: [{ value: "" }],
  emails: [{ value: "" }],
  socialLinks: [],
  bio: "",
  address: ""
};//export ends

export const DIGITAL_CARD_SETTINGS_DEFAULTS: DigitalCardSettingsValues = {
  name: "My Card",
  status: "unpublished",
  seoTitle: "",
  seoDescription: "",
  allowIndexing: false,
  allowSaveContact: true
};//export ends

/* ------------------ BREAK ------------------ */

// Creates in-memory form defaults; saved card identity and values always come from the API.
export function createDigitalCard({ userId, defaults, uid = getUID({ length: 20 }) }: { userId: string; defaults: QrCreateFormValues; uid?: string }): AppDigitalCardQr {
  const content = `https://unoqr.com/dc/${uid}`;
  return {
    uid, userId,
    settings: { ...JSON.parse(JSON.stringify(defaults)), logo: null, content, content_type: "website", content_data: null, size: content.length, type: "static" },
    details: JSON.parse(JSON.stringify(DIGITAL_CARD_DEFAULTS)),
    layout: "modern", primaryColor: colors.secondary.main,
    cardSettings: { ...DIGITAL_CARD_SETTINGS_DEFAULTS }
  };
};//export ends
