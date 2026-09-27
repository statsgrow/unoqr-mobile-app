import type { DotStyle } from "@/helpers/qrcodes/modify/dot";

import { buildCircleFrameDots } from "./circle";
import { hashValue } from "./dots";
import { buildSquareFrameDots } from "./square";
import { buildSquircleFrameDots, getSquircleInset } from "./squircle";

/* ------------------ BREAK ------------------ */

export type FrameStyle = "squircle" | "round" | "square" | "none";

export type FrameOptions = {
  style: FrameStyle;
  color: string;
};

/* ------------------ BREAK ------------------ */

// Wraps the QR with a compact frame and decorative dots outside its quiet zone.
export function buildFrame(svg: string, value: string, frame: FrameOptions, dotStyle: DotStyle, dotColor: string, backgroundColor: string): string {
  if (frame.style === "none") return svg;

  const sizeMatch = svg.match(/viewBox="0 0 (\d+) \1"/);
  if (!sizeMatch) throw new Error("QR SVG is missing its square viewBox.");

  const qrSize = Number(sizeMatch[1]);
  const inset = frame.style === "round"
    ? Math.ceil((qrSize * Math.SQRT2 + 2 - qrSize) / 2)
    : frame.style === "squircle" ? getSquircleInset(qrSize) : 3;
  const outerSize = qrSize + inset * 2;
  const body = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const framePath = frame.style === "squircle" ? squirclePath(outerSize, 0) : "";
  const background = frame.style === "squircle"
    ? `<path d="${framePath}" fill="${backgroundColor}"/>`
    : frame.style === "round"
    ? `<circle cx="${outerSize / 2}" cy="${outerSize / 2}" r="${outerSize / 2}" fill="${backgroundColor}"/>`
    : `<rect width="${outerSize}" height="${outerSize}" fill="${backgroundColor}"/>`;
  const outline = frame.style === "squircle"
    ? `<path d="${squirclePath(outerSize, 0.5)}" fill="none" stroke="${frame.color}" stroke-width="1"/>`
    : frame.style === "round"
    ? `<circle cx="${outerSize / 2}" cy="${outerSize / 2}" r="${(outerSize - 1) / 2}" fill="none" stroke="${frame.color}" stroke-width="1"/>`
    : `<rect x="0.5" y="0.5" width="${outerSize - 1}" height="${outerSize - 1}" fill="none" stroke="${frame.color}" stroke-width="1"/>`;
  const decoration = frame.style === "square"
    ? buildSquareFrameDots(value, outerSize, qrSize, inset, dotStyle, dotColor)
    : frame.style === "round"
    ? buildCircleFrameDots(value, outerSize, qrSize, inset, dotStyle, dotColor)
    : buildSquircleFrameDots(value, outerSize, qrSize, inset, dotStyle, dotColor);
  const clipId = `frame-dots-${hashValue(value).toString(36)}`;
  const clipShape = frame.style === "squircle"
    ? `<path d="${squirclePath(outerSize, 1)}"/>`
    : frame.style === "round"
    ? `<circle cx="${outerSize / 2}" cy="${outerSize / 2}" r="${outerSize / 2 - 1}"/>`
    : `<rect x="1" y="1" width="${outerSize - 2}" height="${outerSize - 2}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outerSize} ${outerSize}">`
    + `<defs><clipPath id="${clipId}">${clipShape}</clipPath></defs>`
    + `${background}<g clip-path="url(#${clipId})">${decoration}</g>`
    + `<g transform="translate(${inset} ${inset})">${body}</g>${outline}</svg>`;
};//export ends

// Draws the smooth four-sided curve used by the squircle frame.
export function squirclePath(size: number, inset: number): string {
  const innerSize = size - inset * 2;
  const half = innerSize / 2;
  const shoulder = half * 0.71;
  const x = inset;

  return `M${x + half} ${x} `
    + `C${x + half + shoulder} ${x} ${x + innerSize} ${x + half - shoulder} ${x + innerSize} ${x + half} `
    + `C${x + innerSize} ${x + half + shoulder} ${x + half + shoulder} ${x + innerSize} ${x + half} ${x + innerSize} `
    + `C${x + half - shoulder} ${x + innerSize} ${x} ${x + half + shoulder} ${x} ${x + half} `
    + `C${x} ${x + half - shoulder} ${x + half - shoulder} ${x} ${x + half} ${x}Z`;
};//export ends
