import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import {
	Animated,
	Easing,
	Keyboard,
	TextInput,
	type KeyboardEvent,
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
import { ChevronDown, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, sizes } from "@/theme/themeSettings";
import { colors as tokenColors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";

/* ------------------ TYPES ------------------ */

type PxModalProps = {
	visible?: boolean;
	onRequestClose?: () => void;
	onDismiss?: () => void;	onShow?: () => void;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	children: ReactNode;
	position?: "bottom" | "top" | "center";
	showHandle?: boolean;
	autoHeight?: boolean;
	height?: "full" | "auto" | number;
	maxHeight?: number;
	footerAction?: ReactElement | null;
	keyboardAvoiding?: boolean;
	hideFooterOnKeyboard?: boolean;
	name?: string | null;
	hideCloseButton?: boolean;
	onBackdropClick?: () => void;
	closeOnBackdropClick?: boolean;
	testID?: string;
};

/* ------------------ BREAK ------------------ */

const MOBILE_FRAME_MAX_WIDTH = 430;

/* ------------------ BREAK ------------------ */

// Shows a scrollable sheet with a fixed action footer, safe-area spacing, and keyboard avoidance.
export function PxModal({
	visible,
	onRequestClose,
	onDismiss,
	onShow,
	open,
	setOpen,
	children,
	position = "bottom",
	showHandle = true,
	autoHeight = true,
	height,
	maxHeight,
	footerAction,
	keyboardAvoiding = true,
	hideFooterOnKeyboard = false,
	name,
	hideCloseButton = false,
	onBackdropClick,
	closeOnBackdropClick = true,
	testID
}: PxModalProps) {

	// Resolves the visible state and the caller's close action.
	const isOpen = visible ?? open ?? false;
	const requestClose = onRequestClose ?? (setOpen ? () => setOpen(false) : undefined);
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const hasHeader = name !== undefined;
	const hasFooterAction = footerAction != null;
	const hasFixedHeight = height === "full" || typeof height === "number";
	const showSheetSurface = position === "bottom" && (showHandle || hasHeader || hasFooterAction);
	// Android reserves its navigation area; keep button spacing inside the sheet.
	const bottomPadding = Platform.OS === "android"
		? Math.max(insets.bottom, spacing.md)
		: Math.max(insets.bottom + spacing.xs, 20);
	const maxSheetHeight = Math.min(maxHeight ?? (typeof height === "number" ? height : 520), windowHeight - insets.top - spacing.md);
	const maxScrollableHeight = height === "full"
		? windowHeight - insets.top - bottomPadding - (hasHeader ? 90 : 34)
		: height === "auto"
			? Math.max(120, maxSheetHeight - bottomPadding - (hasHeader ? 76 : 20))
			: autoHeight ? Math.min(520, windowHeight * 0.72) : windowHeight * 0.7;
	const outerHeightStyle = height || autoHeight ? null : { height: windowHeight * 0.7 };
	const surfaceHeightStyle = typeof height === "number"
		? { height: Math.min(height, maxSheetHeight) }
		: height === "full"
		? { height: windowHeight - insets.top }
		: height === "auto" ? { maxHeight: maxSheetHeight } : outerHeightStyle;
	const bottomInsetStyle = position === "bottom" ? { paddingBottom: bottomPadding } : null;
	const containerPositionStyle = position === "top" ? styles.top : position === "center" ? styles.center : styles.bottom;
	const contentPositionStyle = position === "center"
		? styles.centerContentHost
		: null;
	const scrollRef = useRef<ScrollView | null>(null);
	const focusedInput = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput>>(null);
	const keyboardTop = useRef<number | null>(null);
	const scrollOffset = useRef(0);
	const viewportHeight = useRef(0);
	const contentHeight = useRef(0);
	const keyboardSpace = useRef(new Animated.Value(0)).current;
	const slideValue = useRef(new Animated.Value(position === "top" ? -24 : 24)).current;
	const opacityValue = useRef(new Animated.Value(0)).current;
	const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
	const [scrollContentHeight, setScrollContentHeight] = useState(0);
	const [isAtScrollBottom, setIsAtScrollBottom] = useState(false);
	const [footerHeight, setFooterHeight] = useState(0);
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
	const showFooterAction = hasFooterAction && !(hideFooterOnKeyboard && isKeyboardVisible);
	const hasMoreContentBelow = scrollContentHeight > scrollViewportHeight + 2
		&& !isAtScrollBottom;

	// Keeps the current input visible while keyboard clearance reduces the body viewport.
	const scrollFocusedInput = useCallback((): void => {
		requestAnimationFrame(() => {
			const input = focusedInput.current;
			if (!input || keyboardTop.current === null || input !== TextInput.State.currentlyFocusedInput()) return;
			input.measureInWindow((_x, y, _width, height) => {
				if (keyboardTop.current === null) return;
				const overlap = y + height + spacing.md - keyboardTop.current;
				if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollOffset.current + overlap, animated: true });
			});//measure ends
		});//frame ends
	}, []);//callback ends

	// Removes a scroll offset that would extend past the body after keyboard dismissal.
	const restoreScrollPosition = useCallback((): void => {
		const maximumOffset = Math.max(0, contentHeight.current - viewportHeight.current);
		if (scrollOffset.current > maximumOffset) scrollRef.current?.scrollTo({ y: maximumOffset, animated: true });
	}, []);//callback ends

	// Animates keyboard space inside the opaque sheet instead of moving its outer container.
	useEffect(() => {
		if (!isOpen || (!keyboardAvoiding && !hideFooterOnKeyboard)) {
			setIsKeyboardVisible(false);
			keyboardTop.current = null;
			keyboardSpace.stopAnimation();
			keyboardSpace.setValue(0);
			return;
		};//if ends

		// Reserves the keyboard's overlap while retaining the sheet's existing safe bottom padding.
		const handleKeyboardShow = (event: KeyboardEvent): void => {
			setIsKeyboardVisible(true);
			if (!keyboardAvoiding) return;
			keyboardTop.current = event.endCoordinates.screenY;
			keyboardSpace.stopAnimation();
			Animated.timing(keyboardSpace, {
				toValue: Math.max(0, event.endCoordinates.height - bottomPadding),
				duration: event.duration > 0 ? event.duration : 250,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: false
			}).start(({ finished }) => { if (finished) scrollFocusedInput(); });//animation ends
		};//func ends

		// Collapses the body clearance and restores content bounds when the keyboard closes.
		const handleKeyboardHide = (event: KeyboardEvent): void => {
			setIsKeyboardVisible(false);
			if (keyboardTop.current === null) return;
			keyboardTop.current = null;
			focusedInput.current = null;
			keyboardSpace.stopAnimation();
			Animated.timing(keyboardSpace, {
				toValue: 0,
				duration: event.duration > 0 ? event.duration : 250,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: false
			}).start(({ finished }) => { if (finished) requestAnimationFrame(restoreScrollPosition); });//animation ends
		};//func ends

		// Handles a modal opened while another input's keyboard is already visible.
		const currentKeyboard = Keyboard.metrics();
		setIsKeyboardVisible(currentKeyboard != null);
		if (currentKeyboard) handleKeyboardShow({ duration: 0, easing: "keyboard", endCoordinates: currentKeyboard });

		const subscriptions = [
			Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", handleKeyboardShow),
			Keyboard.addListener("keyboardDidShow", scrollFocusedInput),
			Keyboard.addListener("keyboardDidHide", handleKeyboardHide)
		];
		if (Platform.OS === "ios") subscriptions.push(Keyboard.addListener("keyboardWillHide", handleKeyboardHide));
		return () => {
			subscriptions.forEach((subscription) => subscription.remove());
			keyboardSpace.stopAnimation();
		};//cleanup ends
	}, [isOpen, keyboardAvoiding, hideFooterOnKeyboard, keyboardSpace, bottomPadding, scrollFocusedInput, restoreScrollPosition]);//useEffect ends

	// Animates the sheet entrance without coupling it to keyboard position changes.
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
	function handleScrollLayout(event: LayoutChangeEvent): void {
		viewportHeight.current = event.nativeEvent.layout.height;
		scrollFocusedInput();
		setScrollViewportHeight(event.nativeEvent.layout.height);
		setIsAtScrollBottom(false);
	};//func ends

	// Measures the shared footer so the scroll hint stays above its actions.
	function handleFooterLayout(event: LayoutChangeEvent): void {
		setFooterHeight(event.nativeEvent.layout.height);
	};//func ends

	// Tracks whether the user has reached the bottom of the modal content.
	function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>): void {
		const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
		scrollOffset.current = contentOffset.y;
		const bottomThreshold = 8;
		setIsAtScrollBottom(contentOffset.y + layoutMeasurement.height >= contentSize.height - bottomThreshold);
	};//func ends


	// Records input focus inside this modal for the shared keyboard scrolling behavior.
	function handleInputFocus(): void {
		focusedInput.current = TextInput.State.currentlyFocusedInput();
		scrollFocusedInput();
	};//func ends

	// Dismisses the keyboard together with the owning modal's requested close action.
	function handleRequestClose(): void {
		Keyboard.dismiss();
		requestClose?.();
	};//func ends

	//Handle backdrop click
	function handleBackdropClick(): void {
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
			onDismiss={onDismiss}
			onShow={onShow}
			statusBarTranslucent
			navigationBarTranslucent={false}
			testID={testID}
		>
			<View
				style={[styles.container, { height: windowHeight }, containerPositionStyle, position === "bottom" && { paddingTop: insets.top + spacing.lg }]}
			>
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
							<View style={[styles.handleContentSurface, { maxHeight: windowHeight - insets.top - spacing.md }, surfaceHeightStyle, bottomInsetStyle]}>
								{showHandle ? <View style={styles.defaultHandle} /> : null}
								{hasHeader ? (
									<View style={styles.sheetHeader}>
										<Text style={styles.sheetTitle}>{name}</Text>
										{!hideCloseButton ? (
											<Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={spacing.sm} onPress={handleRequestClose} style={styles.closeButton}>
												<X color={tokenColors.mute.main} size={24} strokeWidth={1.25} />
											</Pressable>
										) : null}
									</View>
								) : null}
								<View onFocus={handleInputFocus} style={[styles.scrollArea, hasFixedHeight ? styles.fixedScrollArea : { maxHeight: maxScrollableHeight }]}>
									<ScrollView
										ref={scrollRef}
										style={[styles.scrollView, hasFixedHeight && styles.fixedScrollView]}
										contentContainerStyle={[styles.scrollContent, showFooterAction && styles.scrollContentWithFooter]}
										onLayout={handleScrollLayout}
										onContentSizeChange={(_width, height) => { contentHeight.current = height; setScrollContentHeight(height); scrollFocusedInput(); }}
										onScroll={handleScroll}
										scrollEventThrottle={16}
										showsVerticalScrollIndicator
										nestedScrollEnabled
										keyboardShouldPersistTaps="handled"
										keyboardDismissMode="on-drag"
									>
										{children}
									</ScrollView>
								</View>
								{showFooterAction ? <View onLayout={handleFooterLayout} style={styles.fixedFooter}>{footerAction}</View> : null}
								<Animated.View pointerEvents="none" style={[styles.keyboardSpace, { height: keyboardSpace }]} />
								{hasMoreContentBelow ? (
									<Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.scrollHint, { bottom: Animated.add(keyboardSpace, bottomPadding + (showFooterAction ? footerHeight : 0) + spacing.xs) }]}>
										<ChevronDown size={24} strokeWidth={1.25} color={tokenColors.primary.main} />
									</Animated.View>
								) : null}
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
		width: "100%"
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
		flexShrink: 1,
		backgroundColor: colors.white,
		borderTopLeftRadius: sizes.borderRadius["2xl"],
		borderTopRightRadius: sizes.borderRadius["2xl"],
		paddingTop: sizes.spacing.xs,
		overflow: "hidden"
	},
	scrollArea: {
		position: "relative",
		width: "100%",
		flexShrink: 1
	},
	fixedScrollArea: { flex: 1 },
	keyboardSpace: { flexShrink: 0, backgroundColor: tokenColors.white.main },
	fixedFooter: { flexShrink: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
	scrollView: {
		width: "100%"
	},
	fixedScrollView: { flex: 1 },
	scrollContent: {
		paddingBottom: sizes.spacing["2xl"]
	},
	scrollContentWithFooter: { paddingBottom: spacing.none },
	scrollHint: {
		position: "absolute",
		alignSelf: "center",
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
		flexShrink: 0,
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
