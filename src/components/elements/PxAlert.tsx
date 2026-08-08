import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import { colors, sizes } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

type PxAlertColor = "error" | "warning" | "success" | "info" | "default";

type PxAlertProps = {
	messages: string[];
	color?: PxAlertColor;
};

/* ------------------ COLOR MAP ------------------ */

const colorMap: Record<PxAlertColor, { bg: string; border: string; text: string; icon: string }> = {
	error: {
		bg: "#fff0f0",
		border: colors.danger.main,
		text: colors.danger.dark,
		icon: "alert-circle-outline",
	},
	warning: {
		bg: "#fff8f0",
		border: colors.warning.main,
		text: colors.warning.dark,
		icon: "alert-outline",
	},
	success: {
		bg: "#eef9f0",
		border: colors.success.main,
		text: colors.success.dark,
		icon: "check-circle-outline",
	},
	info: {
		bg: "#f0f6ff",
		border: "#1976d2",
		text: "#0d47a1",
		icon: "information-outline",
	},
	default: {
		bg: colors.grey[50],
		border: colors.grey[300],
		text: colors.grey[500],
		icon: "information-outline",
	},
};

/* ------------------ BREAK ------------------ */

export function PxAlert({ messages, color = "default" }: PxAlertProps) {
	if (!messages.length) return null;

	const scheme = colorMap[color];

	return (
		<View style={[styles.box, { backgroundColor: scheme.bg, borderColor: scheme.border }]}>
			<View style={styles.row}>
				<MaterialCommunityIcons name={scheme.icon as any} size={18} color={scheme.border} style={styles.icon} />
				<View style={styles.messages}>
					{messages.map((msg, index) => (
						<Text key={index} variant="bodyMedium" style={{ color: scheme.text }}>
							{msg}
						</Text>
					))}
				</View>
			</View>
		</View>
	);
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
	box: {
		width: "100%",
		borderWidth: 1,
		borderRadius: sizes.borderRadius.sm,
		paddingVertical: sizes.spacing.sm,
		paddingHorizontal: sizes.spacing.md,
		gap: sizes.spacing.xs,
	},
	row: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: sizes.spacing.xs,
	},
	icon: {
		marginTop: 2,
	},
	messages: {
		flex: 1,
		gap: sizes.spacing.xs,
	},
});
