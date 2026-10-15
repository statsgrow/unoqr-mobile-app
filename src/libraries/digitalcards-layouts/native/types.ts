import type { ImageSourcePropType } from "react-native";

import type { DigitalCardLayoutData as LayoutData } from "../core/types";

/* ------------------ BREAK ------------------ */

export type DigitalCardLayoutData = LayoutData<ImageSourcePropType>;//export ends
export type DigitalCardLayoutProps = { data: DigitalCardLayoutData; primaryColor: string; isPreview?: boolean; onOpenLink?: (url: string) => void };//export ends
export type DigitalCardFooterProps = { primaryColor: string; allowSaveContact: boolean; isPreview?: boolean; onSaveContact?: () => void; saving?: boolean };//export ends
