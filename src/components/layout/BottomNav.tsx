import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import { MoreMenu } from "@/components/layout/MoreMenu";
import { colors, fontFamilies, fonts, sizes } from "@/theme/themeSettings";


/* ------------------ DATA ------------------ */

const navItems: Array<{
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	href?: string;
}> = [
	{ label: "Donation", icon: "heart-outline" },
	{ label: "Campaigns", icon: "megaphone-outline", href: "/campaign/list" },
	{ label: "Emergency", icon: "medical-outline" },
	{ label: "More", icon: "apps-outline" }
];

/* ------------------ BREAK ------------------ */

export function BottomNav() {
	const router = useRouter();
	const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
	const activeItemLabel = "Donation";

	return (
		<>
			<View style={styles.root}>
				<View style={styles.container}>
					{navItems.map((item) => {
						const isActive = item.label === activeItemLabel;

						return (
						<Pressable
							key={item.label}
							style={styles.itemButton}
							onPress={item.label === "More" ? () => setIsMoreMenuVisible(true) : item.href ? () => router.push(item.href as any) : undefined}
						>
							<View style={[styles.indicator, isActive && styles.activeIndicator]} />
							<Ionicons name={item.icon} size={32} color={isActive ? colors.primary : colors.grey[500]} />
							<Text style={[styles.label, isActive ? styles.activeLabel : styles.inactiveLabel]}>{item.label}</Text>
						</Pressable>
						);
					})}
				</View>
			</View>

			<MoreMenu
				visible={isMoreMenuVisible}
				onClose={() => setIsMoreMenuVisible(false)}
			/>
		</>
	);
}

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	root: {
		borderTopWidth: 1,
		borderTopColor: colors.grey[100],
		paddingBottom: sizes.spacing.sm,
		backgroundColor: colors.white
	},
	container: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		paddingHorizontal: sizes.spacing.sm,
		paddingTop: 0
	},
	itemButton: {
		flex: 1,
		alignItems: "center",
		gap: sizes.spacing.xs,
		paddingTop: 0
	},
	indicator: {
		width: "100%",
		height: 3,
		borderRadius: sizes.borderRadius.full,
		backgroundColor: "transparent",
		marginBottom: 0
	},
	activeIndicator: {
		backgroundColor: colors.primary
	},
	label: {
		fontSize: fonts.sizes.sm,
		fontFamily: fontFamilies.normal,
		lineHeight: fonts.sizes.sm * 1.2,
		textAlign: "center"
	},
	activeLabel: {
		color: colors.primary,
		fontFamily: fontFamilies.bold
	},
	inactiveLabel: {
		color: colors.grey[500]
	}
});
