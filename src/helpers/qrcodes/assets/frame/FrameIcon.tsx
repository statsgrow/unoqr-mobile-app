import { SvgXml } from "react-native-svg";

import { squirclePath, type FrameStyle } from "@/helpers/qrcodes/modify/frame";

/* ------------------ BREAK ------------------ */

export type FrameIconProps = {
  color: string;
  size?: number;
};

type StyledFrameIconProps = FrameIconProps & {
  style: FrameStyle;
};

/* ------------------ BREAK ------------------ */

// Previews a frame outline or the unframed QR option.
export function FrameIcon({ style, color, size = 38 }: StyledFrameIconProps) {
  const outline = style === "squircle"
    ? `<path d="${squirclePath(40, 2)}" fill="none" stroke="${color}" stroke-width="3"/>`
    : style === "round"
    ? `<circle cx="20" cy="20" r="18" fill="none" stroke="${color}" stroke-width="3"/>`
    : style === "square"
    ? `<rect x="2" y="2" width="36" height="36" fill="none" stroke="${color}" stroke-width="3"/>`
    : `<path d="M4 4L36 36M36 4L4 36" fill="none" stroke="${color}" stroke-width="3"/>`;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${outline}</svg>`;

  //Default Return
  return <SvgXml xml={xml} width={size} height={size} />;
};//export ends
