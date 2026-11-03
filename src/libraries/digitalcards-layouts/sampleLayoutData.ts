import type { ImageSourcePropType } from "react-native";

import type { DigitalCardLayoutType } from "@/helpers/digital_cards/model";

import { sampleLayoutData as sampleProfile } from "./core/sampleLayoutData";
import type { DigitalCardLayoutData } from "./native/types";

/* ------------------ BREAK ------------------ */

export const sampleLayoutData: DigitalCardLayoutData = {
  ...sampleProfile,
  companyLogo: require("@/assets/images/digital-cards/acme-studio-logo.png")
};//export ends

export const sampleLayoutPortraits: Record<DigitalCardLayoutType, ImageSourcePropType> = {
  modern: require("@/assets/images/digital-cards/indian-male.webp"),
  centered: require("@/assets/images/digital-cards/american-female.webp"),
  spotlight: require("@/assets/images/digital-cards/african-male.webp"),
  minimal: require("@/assets/images/digital-cards/russian-female.webp")
};//export ends
