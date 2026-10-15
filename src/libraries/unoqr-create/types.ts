import type { DotStyle } from "./dot";
import type { EyeStyle } from "./eye";
import type { FrameOptions, FrameStyle } from "./frame";

/* ------------------ BREAK ------------------ */

export type QrDesign = {
  dot?: { type: DotStyle; color: string };
  eye?: { type: EyeStyle; color: string };
  frame?: { type: FrameStyle; color: string };
  styles?: { bg_color: string; fg_color: string; card_primary_color?: string; card_bg_color?: string };
};//export ends

export type QrCreateOptions = { logoDataUrl?: string | null; hideUnoqrLogo?: boolean };//export ends
export type QrAppearance = {
  foreground: string;
  background: string;
  dot: { type: DotStyle; color: string };
  eye: { type: EyeStyle; color: string };
  frame: FrameOptions;
};//export ends
