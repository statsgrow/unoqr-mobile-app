import { colors as tokenColors, fontFamilies as tokenFontFamilies, fontSizes, fontWeights, radii, spacing } from "./tokens";

const DEFAULT_SIZE = 16;

const grey = {
  50: tokenColors.line.light,
  100: tokenColors.line.main,
  150: tokenColors.border.main,
  200: tokenColors.border.dark,
  300: tokenColors.mute.light,
  400: tokenColors.mute.main,
  500: tokenColors.neutral.main
} as const;

export const colors = {
  primary: tokenColors.primary.main,
  secondary: tokenColors.secondary.main,
  grey,
  border: {
    main: tokenColors.border.main,
    dark: tokenColors.border.dark,
    light: tokenColors.border.light
  },
  white: tokenColors.white.main,
  black: tokenColors.primary.main,
  danger: {
    light: tokenColors.error.light,
    main: tokenColors.error.main,
    dark: tokenColors.error.dark
  },
  success: {
    light: tokenColors.success.light,
    main: tokenColors.success.main,
    dark: tokenColors.success.dark
  },
  warning: {
    light: tokenColors.warning.light,
    main: tokenColors.warning.main,
    dark: tokenColors.warning.dark
  },
  info: {
    light: tokenColors.info.light,
    main: tokenColors.info.main,
    dark: tokenColors.info.dark
  },
  background: tokenColors.cream.main,
  surface: tokenColors.white.main
} as const;

export const fonts = {
  sizes: {
    xs: 12,
    sm: 14,
    md: DEFAULT_SIZE,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
    "6xl": 64,
    "7xl": 80,
    "8xl": 96,
    "9xl": 128
  },
  weights: {
    light: fontWeights.regular,
    normal: fontWeights.regular,
    medium: fontWeights.medium,
    bold: fontWeights.bold,
    extrabold: fontWeights.bold
  }
} as const;

export const fontFamilies = {
  light: tokenFontFamilies.primaryRegular,
  normal: tokenFontFamilies.primaryRegular,
  medium: tokenFontFamilies.primaryMedium,
  bold: tokenFontFamilies.primaryBold,
  extrabold: tokenFontFamilies.primaryBold
} as const;

export const sizes = {
  spacing: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    "2xl": spacing.xxl,
    "3xl": spacing.xxl + spacing.lg,
    "4xl": spacing.xxl + spacing.xl,
    "5xl": spacing.xxl * 2,
    "6xl": spacing.xxl * 2 + spacing.xl,
    "7xl": spacing.xxl * 3,
    "8xl": spacing.xxl * 4,
    "9xl": spacing.xxl * 5
  },
  borderRadius: {
    xs: radii.sm,
    sm: radii.sm,
    md: radii.md,
    lg: radii.lg,
    xl: radii.xl,
    "2xl": radii.xl + 8,
    full: radii.pill
  },
  inputHeight: 48,
  buttonHeight: 48,
  button: {
    xs: { height: 30, paddingHorizontal: 10 },
    sm: { height: 36, paddingHorizontal: 12 },
    md: { height: 48, paddingHorizontal: 16 },
    lg: { height: 56, paddingHorizontal: 20 }
  }
} as const;