import { File, Paths } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as Print from "expo-print";
import QRCode from "qrcode";
import { Platform } from "react-native";
import type Svg from "react-native-svg";

import { buildDots, type DotStyle } from "@/helpers/qrcodes/modify/dot";
import { buildEye, type EyeStyle } from "@/helpers/qrcodes/modify/eye";
import { buildFrame, type FrameOptions } from "@/helpers/qrcodes/modify/frame";
import { buildUserLogo, type QrUserLogo } from "@/helpers/qrcodes/modify/logo";
import { buildQrLogo } from "@/helpers/qrcodes/modify/unoqrLogo";

import type { QrContentData, QrContentType } from "./QrContent";
import { checkContentLength } from "./QrQuality";

/* ------------------ BREAK ------------------ */

export type QrExportFormat = "svg" | "png" | "jpeg" | "pdf";

export type QrCreatedFile = {
  uri: string;
  mimeType: string;
};

export type QrEyeOptions = {
  style: EyeStyle;
  color: string;
};

export type QrDotOptions = {
  style: DotStyle;
  color: string;
};

export type QrFrameOptions = FrameOptions;

export type QrCreateFormValues = {
  name: string;
  hide_logo: boolean;
  content: string;
  content_type: QrContentType | null;
  content_data: QrContentData | null;
  size: number;
  type: "static";
  dot: { type: DotStyle; color: string };
  eye: { type: EyeStyle; color: string };
  frame: { type: FrameOptions["style"]; color: string };
  logo: QrUserLogo | null;
  styles: { bg_color: string; fg_color: string };
};

/* ------------------ BREAK ------------------ */

// Creates the SVG used by both the QR preview and exported files.
export async function createQrSvg(settings: QrCreateFormValues): Promise<string> {
  const value = settings.content.trim();
  if (!checkContentLength(value).canCreate) throw new Error("QR content must contain 1 to 500 characters.");
  const eye: QrEyeOptions = { style: settings.eye.type, color: settings.eye.color || settings.styles.fg_color };
  const dot: QrDotOptions = { style: settings.dot.type, color: settings.dot.color || settings.styles.fg_color };
  const frame: QrFrameOptions = { style: settings.frame.type, color: settings.frame.color || settings.styles.fg_color };
  const errorCorrectionLevel = settings.logo ? "H" : "M";
  const isFramed = frame.style !== "none";
  const useDefaultStyles = eye.style === "square" && dot.style === "square"
    && eye.color.toUpperCase() === dot.color.toUpperCase();
  const svg = !isFramed && useDefaultStyles
    ? await QRCode.toString(value, {
      type: "svg",
      errorCorrectionLevel,
      margin: 1,
      color: { dark: dot.color, light: settings.styles.bg_color }
    })
    : buildStyledQrSvg(value, eye, dot, 1, settings.styles.bg_color, !isFramed, errorCorrectionLevel);

  const qrWithLogo = await addQrLogos(svg, dot.color, settings.styles.bg_color, settings.logo, settings.hide_logo);
  return buildFrame(qrWithLogo, value, frame, dot.style, dot.color, settings.styles.bg_color);
};//export ends

// Prepares a local QR file in the requested format for a separate sharing step.
export async function createQrFile(svg: string, format: QrExportFormat, preview: Svg | null): Promise<QrCreatedFile> {
  if (format === "svg") {
    const file = new File(Paths.cache, "unoqr-code.svg");
    file.create({ overwrite: true });
    file.write(svg);
    return { uri: file.uri, mimeType: "image/svg+xml" };
  };//if ends

  if (format === "pdf") {
    const printResult = await Print.printToFileAsync({ html: buildPdfHtml(svg), width: 612, height: 612 });
    const file = new File(Paths.cache, "unoqr-code.pdf");
    await new File(printResult.uri).copy(file, { overwrite: true });
    return { uri: file.uri, mimeType: "application/pdf" };
  };//if ends

  if (!preview) throw new Error("QR preview is not ready.");
  const base64 = await renderPng(preview);
  const pngFile = new File(Paths.cache, "unoqr-code.png");
  pngFile.create({ overwrite: true });
  pngFile.write(base64, { encoding: "base64" });

  // Resize the correctly rendered iOS image rather than enlarging its SVG canvas.
  if (Platform.OS === "ios") {
    const resized = await manipulateAsync(pngFile.uri, [{ resize: { width: 1200, height: 1200 } }], {
      format: SaveFormat.PNG
    });
    await new File(resized.uri).copy(pngFile, { overwrite: true });
  };//if ends

  if (format === "png") return { uri: pngFile.uri, mimeType: "image/png" };

  const jpegResult = await manipulateAsync(pngFile.uri, [], {
    compress: 0.95,
    format: SaveFormat.JPEG
  });
  const jpegFile = new File(Paths.cache, "unoqr-code.jpg");
  await new File(jpegResult.uri).copy(jpegFile, { overwrite: true });
  return { uri: jpegFile.uri, mimeType: "image/jpeg" };
};//export ends

/* ------------------ BREAK ------------------ */

// Adds the optional center image and UnoQR wordmark before any frame is applied.
async function addQrLogos(svg: string, dotColor: string, backgroundColor: string, userLogo: QrUserLogo | null, hideUnoqrLogo: boolean): Promise<string> {
  const sizeMatch = svg.match(/viewBox="0 0 (\d+) \1"/);
  if (!sizeMatch) throw new Error("QR SVG is missing its square viewBox.");

  const qrSize = Number(sizeMatch[1]);
  const centerLogo = userLogo ? await buildUserLogo(qrSize, userLogo, backgroundColor) : "";
  const unoqrLogo = hideUnoqrLogo ? "" : buildQrLogo(qrSize, dotColor, backgroundColor);
  return svg.replace(/<\/svg>\s*$/, `${centerLogo}${unoqrLogo}</svg>`);
};//func ends

// Combines the selected data modules and finder eyes into one SVG.
function buildStyledQrSvg(value: string, eye: QrEyeOptions, dot: QrDotOptions, margin: number, background: string, includeBackground: boolean, errorCorrectionLevel: "M" | "H"): string {
  const modules = QRCode.create(value, { errorCorrectionLevel }).modules;
  const totalSize = modules.size + margin * 2;
  const data = buildDots(modules, margin, dot.style, dot.color);
  const lastEye = modules.size - 7;
  const eyes = buildEye(eye.style, margin, margin, eye.color)
    + buildEye(eye.style, margin + lastEye, margin, eye.color)
    + buildEye(eye.style, margin, margin + lastEye, eye.color);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}">`
    + (includeBackground ? `<rect width="${totalSize}" height="${totalSize}" fill="${background}"/>` : "")
    + `${data}${eyes}</svg>`;
};//func ends

// Renders the current SVG preview to a high-resolution PNG for raster exports.
function renderPng(preview: Svg): Promise<string> {
  return new Promise((resolve, reject) => {
    preview.toDataURL((base64) => {
      if (base64) resolve(base64);
      else reject(new Error("Could not render the QR image."));
    // iOS draws at the mounted view's bounds even when larger output bounds are supplied.
    }, Platform.OS === "ios" ? undefined : { width: 1200, height: 1200 });
  });
};//func ends

// Places the vector QR in the center of a square PDF page.
function buildPdfHtml(svg: string): string {
  return `<!doctype html><html><head><style>@page{size:612pt 612pt;margin:0}`
    + `body{margin:0;background:#fff}.qr{position:absolute;left:54pt;top:54pt;width:504pt;height:504pt}`
    + `.qr svg{width:100%;height:100%}</style></head><body><div class="qr">${svg}</div></body></html>`;
};//func ends
