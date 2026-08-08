import { StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button as PaperButton } from "react-native-paper";

import { colors, fontFamilies, fonts, sizes } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

type PaperButtonProps = React.ComponentProps<typeof PaperButton>;
type PxButtonSize = keyof typeof sizes.button;
type PxButtonShape = "full" | "rounded";
type PxButtonColor = "primary" | "secondary" | "error" | "warning" | "info" | "default";

type PxButtonProps = Omit<PaperButtonProps, "style" | "contentStyle" | "labelStyle" | "buttonColor" | "textColor" | "color"> & {
	size?: PxButtonSize;
	shape?: PxButtonShape;
	color?: PxButtonColor;
	fullWidth?: boolean;
	startIcon?: string;
};

type ModeKey = NonNullable<PaperButtonProps["mode"]>;

type Palette = {
	main: string;
	light: string;
	dark: string;
	onMain: string;
};

const labelBySize: Record<PxButtonSize, { fontSize: number; lineHeight: number }> = {
	xs: { fontSize: 10, lineHeight: 14 },
	sm: { fontSize: fonts.sizes.sm, lineHeight: 20 },
	md: { fontSize: fonts.sizes.md, lineHeight: 22 },
	lg: { fontSize: fonts.sizes.lg, lineHeight: 24 }
};

const roundedRadiusBySize: Record<PxButtonSize, number> = {
	xs: sizes.borderRadius.xs,
	sm: sizes.borderRadius.sm,
	md: sizes.borderRadius.md,
	lg: sizes.borderRadius.lg
};

const startIconSizeByButtonSize: Record<PxButtonSize, number> = {
	xs: 14,
	sm: 18,
	md: 20,
	lg: 22
};

const paddingBySize: Record<PxButtonSize, { horizontal: number; vertical: number }> = {
	xs: { horizontal: 6, vertical: 0 },
	sm: { horizontal: sizes.button.sm.paddingHorizontal, vertical: 0 },
	md: { horizontal: sizes.button.md.paddingHorizontal, vertical: 0 },
	lg: { horizontal: sizes.button.lg.paddingHorizontal, vertical: 0 }
};

const paletteByColor: Record<PxButtonColor, Palette> = {
	primary: {
		main: colors.primary,
		light: `${colors.primary}22`,
		dark: colors.primary,
		onMain: colors.white
	},
	secondary: {
		main: colors.secondary,
		light: `${colors.secondary}22`,
		dark: colors.secondary,
		onMain: colors.white
	},
	error: {
		main: colors.danger.main,
		light: colors.danger.light,
		dark: colors.danger.dark,
		onMain: colors.white
	},
	warning: {
		main: colors.warning.main,
		light: colors.warning.light,
		dark: colors.warning.dark,
		onMain: colors.white
	},
	info: {
		main: "#1976d2",
		light: "#e3f2fd",
		dark: "#0d47a1",
		onMain: colors.white
	},
	default: {
		main: colors.grey[300],
		light: colors.grey[100],
		dark: colors.grey[500],
		onMain: colors.black
	}
};

function normalizeSemanticColor(color: unknown): PxButtonColor {
	if (typeof color !== "string") return "primary";
	if (Object.prototype.hasOwnProperty.call(paletteByColor, color)) {
		return color as PxButtonColor;
	}
	return "primary";
}

function getModeColors(mode: ModeKey, palette: Palette) {
	if (mode === "contained" || mode === "elevated") {
		return { buttonColor: palette.main, textColor: palette.onMain, borderColor: palette.main };
	}

	if (mode === "contained-tonal") {
		return { buttonColor: palette.light, textColor: palette.dark, borderColor: palette.light };
	}

	if (mode === "outlined") {
		return { buttonColor: "transparent", textColor: palette.main, borderColor: palette.main };
	}

	return { buttonColor: "transparent", textColor: palette.main, borderColor: "transparent" };
}

/* ------------------ BREAK ------------------ */

export function PxButton({
	size = "md",
	shape = "rounded",
	color = "primary",
	fullWidth = false,
	mode = "contained",
	startIcon,
	icon,
	loading,
	disabled,
	...props
}: PxButtonProps) {
	const isDisabled = Boolean(disabled || loading);
	const sizeConfig = sizes.button[size];
	const isExtraSmall = size === "xs";
	const paddingConfig = paddingBySize[size];
	const buttonMinHeight = isExtraSmall ? 26 : sizeConfig.height;
	const labelConfig = labelBySize[size];
	const borderRadius = shape === "full" ? sizes.borderRadius.full : roundedRadiusBySize[size];
	const startIconSize = startIconSizeByButtonSize[size];
	const semanticColor = normalizeSemanticColor(color);
	const palette = paletteByColor[semanticColor];
	const modeColors = getModeColors(mode, palette);
	const shouldShowBorder = mode === "outlined" || mode === "contained" || mode === "elevated";
	const resolvedIcon = icon ?? (startIcon ? ({ color: iconColor }: { color: string; size: number }) => (
		<MaterialCommunityIcons
			name={startIcon as keyof typeof MaterialCommunityIcons.glyphMap}
			size={startIconSize}
			color={iconColor}
		/>
	) : undefined);

	return (
		<PaperButton
			{...props}
			mode={mode}
			loading={loading}
			disabled={isDisabled}
			icon={resolvedIcon}
			buttonColor={modeColors.buttonColor}
			textColor={modeColors.textColor}
			style={[
				{
					borderRadius,
					minHeight: buttonMinHeight,
					borderColor: shouldShowBorder ? modeColors.borderColor : "transparent"
				},
				fullWidth && styles.fullWidth
			]}
			contentStyle={[
				{ minHeight: buttonMinHeight, paddingHorizontal: paddingConfig.horizontal, paddingVertical: paddingConfig.vertical },
				styles.content
			]}
			labelStyle={[
				{
					fontFamily: fontFamilies.bold,
					fontSize: labelConfig.fontSize,
					lineHeight: labelConfig.lineHeight,
					marginVertical: 0
				}
			]}
		/>
	);
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
	fullWidth: {
		width: "100%"
	},
	content: {
		justifyContent: "center"
	}
});
