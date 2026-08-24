import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

/* ------------------ BREAK ------------------ */

export type ScanTypeIcon = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type ScanTypeInit = {
  label: string;
  type: string;
  icon: ScanTypeIcon;
};

