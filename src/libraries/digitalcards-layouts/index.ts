import type { ComponentType } from "react";

import type { AppDigitalCardQr } from "@/helpers/digital_cards/model";

import type { DigitalCardLayoutType } from "./core/types";

import Centered from "./native/Centered";
import Minimal from "./native/Minimal";
import Modern from "./native/Modern";
import Spotlight from "./native/Spotlight";
import type { DigitalCardLayoutData, DigitalCardLayoutProps } from "./native/types";

/* ------------------ BREAK ------------------ */

const layouts: Record<DigitalCardLayoutType, ComponentType<DigitalCardLayoutProps>> = {
  modern: Modern, centered: Centered, spotlight: Spotlight, minimal: Minimal
};

export { digitalCardLayoutOptions } from "./core/options";//export ends

// Returns the same native layout component used by both edit options and profile previews.
export function getDigitalCardLayout(layout: DigitalCardLayoutType): ComponentType<DigitalCardLayoutProps> {
  return layouts[layout];
};//export ends

// Maps saved or draft form values into the shared layout's display data.
export function getDigitalCardLayoutData(card: AppDigitalCardQr): DigitalCardLayoutData {
  const { profilePicture, ...details } = card.details;
  const uri = profilePicture?.url || profilePicture?.uri;
  return { ...details, photo: uri ? { uri } : null };
};//export ends

export type { DigitalCardLayoutType, DigitalCardSocialLink } from "./core/types";//export ends
export type { DigitalCardLayoutData, DigitalCardLayoutProps, DigitalCardFooterProps } from "./native/types";//export ends
