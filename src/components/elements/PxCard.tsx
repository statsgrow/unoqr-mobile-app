import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, sizes } from "@/theme/themeSettings";


/* ------------------ TYPES ------------------ */

type PxCardProps = {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	contentStyle?: StyleProp<ViewStyle>;
	padded?: boolean;
	elevated?: boolean;
	bordered?: boolean;
	radius?: keyof typeof sizes.borderRadius;
	onPress?: () => void;
};

/* ------------------ BREAK ------------------ */

export function PxCard({ children,
	style,
	contentStyle,
	padded = true,
	elevated = false,
	bordered = false,
	radius = "xl",
	onPress
}: PxCardProps) {
	const cardStyle = [
		styles.base,
		padded && styles.padded,
		elevated && styles.elevated,
		bordered && styles.bordered,
		{ borderRadius: sizes.borderRadius[radius] },
		style
	];

	if (onPress) {
		return (
			<Pressable
				onPress={onPress}
				style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
			>
				<View style={contentStyle}>{children}</View>
			</Pressable>
		);
	}

	return (
		<View style={cardStyle}>
			<View style={contentStyle}>{children}</View>
		</View>
	);
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	base: {
		backgroundColor: colors.white
	},
	padded: {
		padding: sizes.spacing.xl
	},
	elevated: {
		boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
		elevation: 4
	},
	bordered: {
		borderWidth: 1,
		borderColor: colors.border.main
	},
	pressed: {
		opacity: 0.92
	}
});
