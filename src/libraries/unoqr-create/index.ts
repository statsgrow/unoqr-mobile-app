import QRCode from "qrcode";

import { buildQrLogo } from "./branding";
import { buildDots } from "./dot";
import { buildEye } from "./eye";
import { buildFrame } from "./frame";
import { buildUserLogo } from "./logo";
import type { QrAppearance, QrCreateOptions, QrDesign } from "./types";

/* ------------------ BREAK ------------------ */

export type { QrAppearance, QrCreateOptions, QrDesign } from "./types";//export ends
export type { DotStyle } from "./dot";//export ends
export type { EyeStyle } from "./eye";//export ends
export type { FrameOptions, FrameStyle } from "./frame";//export ends

/* ------------------ BREAK ------------------ */

// Creates the local styled vector QR for native previews and exported files.
export async function createQrSvg(content: string, design?: QrDesign | null, options: QrCreateOptions = {}): Promise<string> {
  const value = content.trim();
  if (!value || Array.from(value).length > 500) throw new Error("QR content must contain 1 to 500 characters.");
  const appearance = getQrAppearance(design);
  const errorCorrectionLevel = options.logoDataUrl ? "H" : "M";
  const plain = appearance.frame.style === "none" && appearance.eye.type === "square"
    && appearance.dot.type === "square" && appearance.eye.color.toUpperCase() === appearance.dot.color.toUpperCase();
  const svg = plain ? await QRCode.toString(value, {
    type: "svg", errorCorrectionLevel, margin: 1,
    color: { dark: appearance.dot.color, light: appearance.background }
  }) : buildStyledQrSvg(value, appearance, errorCorrectionLevel);
  const withLogos = addQrLogos(svg, appearance, options);
  return buildFrame(withLogos, value, appearance.frame, appearance.dot.type, appearance.dot.color, appearance.background);
};//export ends

// Resolves runtime colors and shapes while preserving the existing digital-card defaults.
export function getQrAppearance(design?: QrDesign | null): QrAppearance {
  const foreground = getQrColor(design?.styles?.fg_color, "#191414");
  const background = getQrColor(design?.styles?.bg_color, "#FFFFFF");
  const dot = { type: design?.dot?.type || "square", color: getQrColor(design?.dot?.color, foreground) };
  const eye = { type: design?.eye?.type || "square", color: getQrColor(design?.eye?.color, foreground) };
  const frame = { style: design?.frame?.type || "squircle", color: getQrColor(design?.frame?.color, design?.frame ? foreground : "#FF5528") };
  if (!["square", "rounded", "dots", "classy", "connected"].includes(dot.type)
    || !["square", "rounded", "circle", "leaf", "frame"].includes(eye.type)
    || !["squircle", "round", "square", "none"].includes(frame.style)) throw new Error("This QR design is not supported.");
  return { foreground, background, dot, eye, frame };
};//export ends

/* ------------------ BREAK ------------------ */

// Accepts six-digit dynamic hex colors before inserting them into SVG attributes.
function getQrColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error("The QR color is invalid.");
  return value;
};//func ends

// Combines the QR data modules and its three finder eyes without a platform renderer.
function buildStyledQrSvg(value: string, appearance: QrAppearance, errorCorrectionLevel: "M" | "H"): string {
  const modules = QRCode.create(value, { errorCorrectionLevel }).modules;
  const size = modules.size + 2;
  const lastEye = modules.size - 7;
  const eyes = buildEye(appearance.eye.type, 1, 1, appearance.eye.color)
    + buildEye(appearance.eye.type, lastEye + 1, 1, appearance.eye.color)
    + buildEye(appearance.eye.type, 1, lastEye + 1, appearance.eye.color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`
    + (appearance.frame.style === "none" ? `<rect width="${size}" height="${size}" fill="${appearance.background}"/>` : "")
    + buildDots(modules, 1, appearance.dot.type, appearance.dot.color) + eyes + "</svg>";
};//func ends

// Adds the prepared center image and optional official wordmark before framing the QR.
function addQrLogos(svg: string, appearance: QrAppearance, options: QrCreateOptions): string {
  const size = Number(svg.match(/viewBox="0 0 (\d+) \1"/)?.[1]);
  if (!size) throw new Error("QR SVG is missing its square viewBox.");
  const centerLogo = options.logoDataUrl ? buildUserLogo(size, options.logoDataUrl, appearance.background) : "";
  const branding = options.hideUnoqrLogo ? "" : buildQrLogo(size, appearance.dot.color, appearance.background);
  return svg.replace(/<\/svg>\s*$/, `${centerLogo}${branding}</svg>`);
};//func ends
