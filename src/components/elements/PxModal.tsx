
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
	Animated,
	Easing,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, sizes } from "@/theme/themeSettings";
import { colors as tokenColors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";

/* ------------------ TYPES ------------------ */

type PxModalProps = {
	visible?: boolean;
	onRequestClose?: () => void;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	children: ReactNode;
	position?: "bottom" | "top" | "center";
	showHandle?: boolean;
	autoHeight?: boolean;
	height?: "full" | "auto" | number;
	maxHeight?: number;
	footer?: ReactNode;
	keyboardAvoiding?: boolean;
	name?: string | null;
	hideCloseButton?: boolean;
	onBackdropClick?: () => void;
	closeOnBackdropClick?: boolean;
	testID?: string;
};

/* ------------------ BREAK ------------------ */

const MOBILE_FRAME_MAX_WIDTH = 430;

/* ------------------ BREAK ------------------ */

export function PxModal({
	visible,
	onRequestClose,
	open,
	setOpen,
	children,
	position = "bottom",
	showHandle = true,
	autoHeight = true,
	height,
	maxHeight,
	footer,
	keyboardAvoiding = false,
	name,
	hideCloseButton = false,
	onBackdropClick,
	closeOnBackdropClick = true,
	testID
}: PxModalProps) {
	
	//if pathname changes, close the modal
	const isOpen = visible ?? open ?? false;
	const handleRequestClose = onRequestClose ?? (setOpen ? () => setOpen(false) : undefined);
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const hasHeader = name !== undefined;
	const showSheetSurface = position === "bottom" && (showHandle || hasHeader);
	const bottomSheetOffset = position === "bottom" && Platform.OS === "android"
		? Math.max(insets.bottom, spacing.xl)
		: 0;
	const bottomPadding = Platform.OS === "android"
		? spacing.md
		: Math.max(insets.bottom + spacing.xs, 20);
	const maxSheetHeight = Math.min(maxHeight ?? (typeof height === "number" ? height : 520), windowHeight - insets.top - bottomSheetOffset - spacing.md);
	const maxScrollableHeight = height === "full"
		? windowHeight - insets.top - bottomSheetOffset - bottomPadding - (hasHeader ? 90 : 34)
		: height === "auto"
			? Math.max(120, maxSheetHeight - bottomPadding - (hasHeader ? 76 : 20))
			: autoHeight ? Math.min(520, windowHeight * 0.72) : windowHeight * 0.7;
	const outerHeightStyle = height || autoHeight ? null : { height: windowHeight * 0.7 };
	const surfaceHeightStyle = typeof height === "number"
		? { height: Math.min(height, maxSheetHeight) }
		: height === "full"
		? { height: windowHeight - insets.top - bottomSheetOffset }
		: height === "auto" ? { maxHeight: maxSheetHeight } : outerHeightStyle;
	const bottomInsetStyle = position === "bottom" ? { paddingBottom: bottomPadding } : null;
	const containerPositionStyle = position === "top" ? styles.top : position === "center" ? styles.center : styles.bottom;
	const contentPositionStyle = position === "center"
		? styles.centerContentHost
		: bottomSheetOffset ? { paddingBottom: bottomSheetOffset } : null;
	const slideValue = useRef(new Animated.Value(position === "top" ? -24 : 24)).current;
	const opacityValue = useRef(new Animated.Value(0)).current;
	const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
	const [scrollContentHeight, setScrollContentHeight] = useState(0);
	const [isAtScrollBottom, setIsAtScrollBottom] = useState(false);
	const hasMoreContentBelow = scrollContentHeight > scrollViewportHeight + 2
		&& !isAtScrollBottom;

	useEffect(() => {
		if (!isOpen) return;

		slideValue.setValue(position === "top" ? -24 : 24);
		opacityValue.setValue(0);

		Animated.parallel([
			Animated.timing(slideValue, {
				toValue: 0,
				duration: 220,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true
			}),
			Animated.timing(opacityValue, {
				toValue: 1,
				duration: 200,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true
			})
		]).start();
	}, [isOpen, opacityValue, position, slideValue]);

	// Measures the modal scroll viewport and resets the bottom state when its size changes.
	function handleScrollLayout(event: LayoutChangeEvent) {
		setScrollViewportHeight(event.nativeEvent.layout.height);
		setIsAtScrollBottom(false);
	};//func ends

	// Tracks whether the user has reached the bottom of the modal content.
	function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
		const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
		const bottomThreshold = 8;
		setIsAtScrollBottom(contentOffset.y + layoutMeasurement.height >= contentSize.height - bottomThreshold);
	};//func ends

	

	//Handle backdrop click
	function handleBackdropClick() {
		onBackdropClick?.();

		if (closeOnBackdropClick) {
			handleRequestClose?.();
		}//if ends
	};//func ends


	//Default Return
	const Container = keyboardAvoiding ? KeyboardAvoidingView : View;

	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={handleRequestClose}
			statusBarTranslucent
			navigationBarTranslucent={false}
			testID={testID}
		>
			<Container behavior={keyboardAvoiding && Platform.OS === "ios" ? "padding" : undefined} style={[styles.container, containerPositionStyle]}>
				<Pressable style={styles.backdrop} onPress={handleBackdropClick} />
				<View style={[styles.contentHost, contentPositionStyle]} pointerEvents="box-none">
					<Animated.View
						pointerEvents="box-none"
						style={[
							styles.sheetWrap,
							outerHeightStyle,
							position === "bottom" && styles.sheetWrapBottom,
							{ opacity: opacityValue, transform: [{ translateY: slideValue }] }
						]}
					>
						{showSheetSurface ? (
							<View style={[styles.handleContentSurface, surfaceHeightStyle, bottomInsetStyle]}>
								{showHandle ? <View style={styles.defaultHandle} /> : null}
								{hasHeader ? (
									<View style={styles.sheetHeader}>
										<Text style={styles.sheetTitle}>{name}</Text>
										{!hideCloseButton ? (
											<Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={spacing.sm} onPress={handleRequestClose} style={styles.closeButton}>
												<X color={tokenColors.mute.main} size={24} strokeWidth={1.75} />
											</Pressable>
										) : null}
									</View>
								) : null}
								<View style={[styles.scrollArea, typeof height === "number" ? styles.fixedScrollArea : { maxHeight: maxScrollableHeight }]}>
									<ScrollView
										style={[styles.scrollView, typeof height === "number" && styles.fixedScrollView]}
										contentContainerStyle={styles.scrollContent}
										onLayout={handleScrollLayout}
										onContentSizeChange={(_width, height) => setScrollContentHeight(height)}
										onScroll={handleScroll}
										scrollEventThrottle={16}
										showsVerticalScrollIndicator
										nestedScrollEnabled
									>
										{children}
									</ScrollView>

									{hasMoreContentBelow ? (
										<View pointerEvents="none" style={styles.scrollHint}>
											<MaterialCommunityIcons name="chevron-down" size={24} color={colors.primary} />
										</View>
									) : null}
								</View>
								{footer ? <View style={styles.fixedFooter}>{footer}</View> : null}
							</View>
						) : children}
					</Animated.View>
				</View>
			</Container>
		</Modal>
	);//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	contentHost: {
		flex: 1,
		width: "100%",
		maxWidth: MOBILE_FRAME_MAX_WIDTH,
		alignSelf: "center"
	},
	sheetWrap: {
		width: "100%"
	},
	sheetWrapBottom: {
		flex: 1,
		justifyContent: "flex-end"
	},
	handleContentSurface: {
		width: "100%",
		backgroundColor: colors.white,
		borderTopLeftRadius: sizes.borderRadius["2xl"],
		borderTopRightRadius: sizes.borderRadius["2xl"],
		paddingTop: sizes.spacing.xs,
		overflow: "hidden"
	},
	scrollArea: {
		position: "relative",
		width: "100%"
	},
	fixedScrollArea: { flex: 1 },
	fixedFooter: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
	scrollView: {
		width: "100%"
	},
	fixedScrollView: { flex: 1 },
	scrollContent: {
		paddingBottom: sizes.spacing["2xl"]
	},
	scrollHint: {
		position: "absolute",
		alignSelf: "center",
		bottom: 40,
		width: 34,
		height: 34,
		borderRadius: sizes.borderRadius.full,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.border.main,
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 4,
		elevation: 4
	},
	defaultHandle: {
		alignSelf: "center",
		width: 44,
		height: 5,
		borderRadius: sizes.borderRadius.full,
		backgroundColor: colors.grey[200],
		marginBottom: sizes.spacing.xs
	},
	sheetHeader: {
		minHeight: 56,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.xs
	},
	sheetTitle: {
		flex: 1,
		color: tokenColors.primary.main,
		fontFamily: fontFamilies.primaryBold,
		fontSize: fontSizes.h6
	},
	closeButton: {
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center"
	},
	top: {
		justifyContent: "flex-start"
	},
	center: {
		justifyContent: "center"
	},
	bottom: {
		justifyContent: "flex-end"
	},
	centerContentHost: {
		justifyContent: "center"
	},
	backdrop: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		backgroundColor: "rgba(0, 0, 0, 0.24)"
	}
});
