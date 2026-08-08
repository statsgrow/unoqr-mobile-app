
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
	Animated,
	Easing,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, sizes } from "@/theme/themeSettings";

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
	onBackdropClick,
	closeOnBackdropClick = true,
	testID
}: PxModalProps) {
	
	//if pathname changes, close the modal
	const isOpen = visible ?? open ?? false;
	const handleRequestClose = onRequestClose ?? (setOpen ? () => setOpen(false) : undefined);
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const maxScrollableHeight = autoHeight ? Math.min(520, windowHeight * 0.72) : windowHeight * 0.7;
	const modalHeightStyle = autoHeight ? null : { height: windowHeight * 0.7 };
	const bottomInsetStyle = position === "bottom" ? { paddingBottom: Math.max(insets.bottom + 8, 20) } : null;
	const containerPositionStyle = position === "top" ? styles.top : position === "center" ? styles.center : styles.bottom;
	const contentPositionStyle = position === "center" ? styles.centerContentHost : null;
	const shouldShowDefaultBottomHandle = position === "bottom" && showHandle;
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
	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={handleRequestClose}
			statusBarTranslucent
			testID={testID}
		>
			<View style={[styles.container, containerPositionStyle]}>
				<Pressable style={styles.backdrop} onPress={handleBackdropClick} />
				<View style={[styles.contentHost, contentPositionStyle]} pointerEvents="box-none">
					<Animated.View
						pointerEvents="box-none"
						style={[
							styles.sheetWrap,
							modalHeightStyle,
							position === "bottom" && styles.sheetWrapBottom,
							{ opacity: opacityValue, transform: [{ translateY: slideValue }] }
						]}
					>
						{shouldShowDefaultBottomHandle ? (
							<View style={[styles.handleContentSurface, modalHeightStyle, bottomInsetStyle]}>
								<View style={styles.defaultHandle} />
								<View style={[styles.scrollArea, { maxHeight: maxScrollableHeight }]}>
									<ScrollView
										style={styles.scrollView}
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
							</View>
						) : children}
					</Animated.View>
				</View>
			</View>
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
	scrollView: {
		width: "100%"
	},
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
