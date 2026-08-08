import { Pressable, StyleSheet, View } from "react-native";
import { router, usePathname } from "expo-router";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import { colors, fontFamilies, fonts, sizes } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

type TopNavProps = {
	title?: string | null;
	subtitle?: string | null;
	hideAvatar?: boolean;
	avatarInitials?: string | null;
};

/* ------------------ BREAK ------------------ */

export function TopNav({ title, subtitle, hideAvatar=false, avatarInitials }: TopNavProps) {
	const pathname = usePathname();
	const canGoBack = pathname !== "/" && router.canGoBack();

	
	//Default Return
	return (
		<View style={styles.root}>
			<View style={styles.profileRow}>
				{/* Back button */}
				{canGoBack && <Pressable onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="chevron-back" size={24} color={colors.grey[500]} />
				</Pressable>}
				{/* Avatar and user info */}
				{!hideAvatar && <View style={styles.avatar}>
					<Text style={styles.avatarText}>{avatarInitials || title?.charAt(0) || "A"}</Text>
				</View>}

				{/* User name and member ID */}
				<View>
					<Text style={styles.name}>{title}</Text>
					<Text style={styles.memberId}>{subtitle}</Text>
				</View>
			</View>

			{/* Action buttons */}
			<View style={styles.actions}>
				<Ionicons
					onPress={() => router.replace("/")}
					name="home-sharp"
					size={30}
					color={colors.grey[500]}
				/>
				
				<View style={styles.notificationWrap}>
					<Ionicons name="notifications-outline" size={30} color={colors.grey[500]} />
					<View style={styles.redDot} />
				</View>
			</View>
		</View>
	);
}

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	root: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: colors.white,
		paddingHorizontal: sizes.spacing.lg,
		paddingVertical: sizes.spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey[100],
		minHeight: 60
	},
	profileRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: sizes.spacing.md
	},
	backButton: {
		alignItems: "center",
		justifyContent: "center",
		paddingRight: sizes.spacing.xs
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: sizes.borderRadius.full,
		backgroundColor: colors.primary,
		alignItems: "center",
		justifyContent: "center"
	},
	avatarText: {
		color: colors.white,
		fontSize: fonts.sizes.md,
		fontFamily: fontFamilies.bold
	},
	name: {
		fontSize: fonts.sizes.md,
		fontFamily: fontFamilies.bold,
		color: colors.black
	},
	memberId: {
		fontSize: fonts.sizes.sm,
		fontFamily: fontFamilies.medium,
		color: colors.grey[400]
	},
	actions: {
		flexDirection: "row",
		alignItems: "center",
		gap: sizes.spacing.lg
	},
	notificationWrap: {
		position: "relative",
		paddingRight: 2
	},
	redDot: {
		position: "absolute",
		right: 1,
		top: 0,
		width: 10,
		height: 10,
		borderRadius: sizes.borderRadius.full,
		backgroundColor: colors.secondary
	}
});
