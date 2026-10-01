import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { colors, fontFamilies, fonts, sizes } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

type PxDialogColor = "primary" | "secondary" | "danger" | "success" | "warning";

type PxDialogProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	onDismiss?: () => void;
	title?: string;
	subtitle?: string;
	color?: PxDialogColor;
	hideCloseButton?: boolean;
	disableBackdropClick?: boolean;
	children?: ReactNode;
};

/* ------------------ BREAK ------------------ */

const titleColorByVariant: Record<PxDialogColor, string> = {
	primary: colors.primary,
	secondary: colors.secondary,
	danger: colors.danger.main,
	success: colors.success.main,
	warning: colors.warning.main
};

const MOBILE_FRAME_MAX_WIDTH = 430;

/* ------------------ BREAK ------------------ */

export function PxDialog({
	open,
	setOpen,
	onDismiss,
	title,
	subtitle,
	color = "primary",
	hideCloseButton = false,
	disableBackdropClick = false,
	children
}: PxDialogProps) {
	//Default Return
	return (
		<Modal
			visible={open}
			transparent
			animationType="fade"
			onRequestClose={() => setOpen(false)}
			onDismiss={onDismiss}
			statusBarTranslucent
		>
			<View style={styles.container}>
				<Pressable
					style={styles.backdrop}
					onPress={disableBackdropClick ? undefined : () => setOpen(false)}
				/>

				<View style={styles.dialogCard}>
					<View style={styles.headerRow}>
						<View style={styles.headerTextWrap}>
							{title ? <Text style={[styles.title, { color: titleColorByVariant[color] }]}>{title}</Text> : null}
							{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
						</View>
						{!hideCloseButton ? <Pressable
							onPress={() => setOpen(false)}
							style={styles.closeButton}
							hitSlop={8}
							accessibilityRole="button"
							accessibilityLabel="Close dialog"
						>
							<MaterialCommunityIcons name="close" size={20} color={colors.grey[500]} />
						</Pressable> : null}
					</View>
					{children ? <View style={styles.body}>{children}</View> : null}
				</View>
			</View>
		</Modal>
	);
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFill,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: sizes.spacing.lg,
		paddingVertical: sizes.spacing.lg,
		pointerEvents: "box-none",
		zIndex: 999,
		elevation: 999
	},
	backdrop: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		backgroundColor: "rgba(0, 0, 0, 0.32)"
	},
	dialogCard: {
		width: "100%",
		maxWidth: MOBILE_FRAME_MAX_WIDTH,
		borderRadius: sizes.borderRadius.xl,
		backgroundColor: colors.white,
		paddingHorizontal: sizes.spacing.lg,
		paddingTop: sizes.spacing.lg,
		paddingBottom: sizes.spacing.lg,
		gap: sizes.spacing.sm
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: sizes.spacing.sm
	},
	headerTextWrap: {
		flex: 1,
		justifyContent: "flex-start",
		gap: sizes.spacing.xs
	},
	title: {
		fontSize: fonts.sizes.xl,
		fontFamily: fontFamilies.bold,
		textAlign: "left"
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: sizes.borderRadius.full,
		alignItems: "center",
		justifyContent: "center"
	},
	subtitle: {
		fontSize: fonts.sizes.sm,
		fontFamily: fontFamilies.normal,
		lineHeight: 20,
		textAlign: "left",
		color: colors.grey[500]
	},
	body: {
		marginTop: sizes.spacing.xs,
		gap: sizes.spacing.md
	}
});
