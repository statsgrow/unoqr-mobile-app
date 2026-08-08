const toLineHeight = (fontSize: number, ratio: number) => Math.round(fontSize * ratio);

export const colors = {
  white: {
    main: "#FFFFFF",
    light: "#FFFFFF",
    dark: "#F2EEE6",
    contrast: "#191414",
    text: "#191414"
  },
  black: {
    main: "#000000",
    light: "#191414",
    dark: "#000000",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  primary: {
    main: "#191414",
    light: "#3A3333",
    dark: "#000000",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  secondary: {
    main: "#FF5528",
    light: "#FFE8DE",
    dark: "#E4461D",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  neutral: {
    main: "#6A655C",
    light: "#D8D3CB",
    dark: "#4A463F",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  error: {
    main: "#E03030",
    light: "#F06B6B",
    dark: "#B32020",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  success: {
    main: "#2BBF5C",
    light: "#5BD183",
    dark: "#1E9847",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  warning: {
    main: "#F5A623",
    light: "#FABF5C",
    dark: "#C8821A",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  info: {
    main: "#3B82F6",
    light: "#6FA5F9",
    dark: "#1E5FC9",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  cream: {
    main: "#FAF7F2",
    light: "#FFFFFF",
    dark: "#E6E1D6",
    contrast: "#191414",
    text: "#191414"
  },
  mute: {
    main: "#7B746B",
    light: "#B8B1A8",
    dark: "#4A463F",
    contrast: "#FFFFFF",
    text: "#FFFFFF"
  },
  line: {
    main: "#E6E1D6",
    light: "#F2EEE6",
    dark: "#D8D2C4",
    contrast: "#FFFFFF",
    text: "#191414"
  },
  border: {
    main: "#E6E1D6",
    light: "#F2EEE6",
    dark: "#D8D2C4",
    contrast: "#191414",
    text: "#191414"
  }
} as const;

export const spacingUnit = 4;

export const spacing = {
  none: 0,
  xxs: spacingUnit,
  xs: spacingUnit * 2,
  sm: spacingUnit * 3,
  md: spacingUnit * 4,
  lg: spacingUnit * 6,
  xl: spacingUnit * 8,
  xxl: spacingUnit * 12
} as const;

export const radii = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999
} as const;

export const fontFamilies = {
  primaryRegular: "BricolageGrotesque_400Regular",
  primaryMedium: "BricolageGrotesque_500Medium",
  primarySemiBold: "BricolageGrotesque_600SemiBold",
  primaryBold: "BricolageGrotesque_700Bold",
  serif: "InstrumentSerif_400Regular",
  mono: "monospace"
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700"
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6
} as const;

export const fontSizes = {
  h1: 48,
  h2: 40,
  h3: 32,
  h4: 28,
  h5: 24,
  h6: 20,
  subtitle1: 16,
  subtitle2: 14,
  body1: 16,
  body2: 14,
  button: 15,
  caption: 12,
  overline: 12
} as const;

export const typography = {
  displayLarge: {
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h1,
    lineHeight: toLineHeight(fontSizes.h1, lineHeights.tight),
    letterSpacing: -1.6
  },
  displayMedium: {
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h2,
    lineHeight: toLineHeight(fontSizes.h2, lineHeights.tight),
    letterSpacing: -1.2
  },
  displaySmall: {
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h3,
    lineHeight: toLineHeight(fontSizes.h3, lineHeights.tight),
    letterSpacing: -0.8
  },
  headlineLarge: {
    fontFamily: fontFamilies.serif,
    fontSize: fontSizes.h4,
    lineHeight: toLineHeight(fontSizes.h4, lineHeights.tight),
    letterSpacing: -0.4
  },
  headlineMedium: {
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h5,
    lineHeight: toLineHeight(fontSizes.h5, lineHeights.normal),
    letterSpacing: -0.2
  },
  headlineSmall: {
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.h6,
    lineHeight: toLineHeight(fontSizes.h6, lineHeights.normal),
    letterSpacing: -0.1
  },
  titleLarge: {
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1,
    lineHeight: toLineHeight(fontSizes.subtitle1, lineHeights.normal),
    letterSpacing: 0
  },
  titleMedium: {
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.subtitle1,
    lineHeight: toLineHeight(fontSizes.subtitle1, lineHeights.normal),
    letterSpacing: 0.15
  },
  titleSmall: {
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.subtitle2,
    lineHeight: toLineHeight(fontSizes.subtitle2, lineHeights.normal),
    letterSpacing: 0.1
  },
  bodyLarge: {
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body1,
    lineHeight: toLineHeight(fontSizes.body1, lineHeights.relaxed),
    letterSpacing: 0.15
  },
  bodyMedium: {
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: toLineHeight(fontSizes.body2, lineHeights.relaxed),
    letterSpacing: 0.25
  },
  bodySmall: {
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption,
    lineHeight: toLineHeight(fontSizes.caption, lineHeights.normal),
    letterSpacing: 0.4
  },
  labelLarge: {
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.button,
    lineHeight: toLineHeight(fontSizes.button, lineHeights.normal),
    letterSpacing: 0.1
  },
  labelMedium: {
    fontFamily: fontFamilies.primaryMedium,
    fontSize: fontSizes.caption,
    lineHeight: toLineHeight(fontSizes.caption, lineHeights.normal),
    letterSpacing: 0.5
  },
  labelSmall: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    lineHeight: toLineHeight(fontSizes.overline, lineHeights.normal),
    letterSpacing: 1.2
  }
} as const;