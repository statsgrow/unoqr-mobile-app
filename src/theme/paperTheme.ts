import { MD3LightTheme } from "react-native-paper";

import { colors, radii, typography } from "./tokens";

export const paperTheme = {
  ...MD3LightTheme,
  roundness: radii.lg,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary.main,
    secondary: colors.secondary.main,
    background: colors.cream.main,
    surface: colors.white.main,
    surfaceVariant: colors.line.light,
    outline: colors.border.main,
    outlineVariant: colors.line.main,
    error: colors.error.main,
    onPrimary: colors.primary.text,
    onSecondary: colors.secondary.text,
    onBackground: colors.primary.main,
    onSurface: colors.primary.main,
    onSurfaceVariant: colors.mute.main,
    onError: colors.error.text
  },
  fonts: {
    ...MD3LightTheme.fonts,
    ...typography
  }
};