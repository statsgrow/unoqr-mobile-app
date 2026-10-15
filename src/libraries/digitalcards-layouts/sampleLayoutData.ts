import type { ImageSourcePropType } from "react-native";

import type { DigitalCardLayoutType } from "@/helpers/digital_cards/model";

/* ------------------ BREAK ------------------ */

export { sampleLayoutData } from "./core/sampleLayoutData";//export ends

export const sampleLayoutPortraits: Record<DigitalCardLayoutType, ImageSourcePropType> = {
  modern: require("@/assets/images/digital-cards/indian-male.webp"),
  centered: require("@/assets/images/digital-cards/american-female.webp"),
  spotlight: require("@/assets/images/digital-cards/african-male.webp"),
  minimal: require("@/assets/images/digital-cards/russian-female.webp")
};//export ends
