import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from "react";
import {
	Animated,
	Easing,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	RefreshControl,
	StyleSheet,
	ScrollView,
	TextInput,
	View,
	type KeyboardEvent,
	type StyleProp,
	type ViewStyle
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { colors, spacing } from "@/theme/tokens";
import { insertAppInstall } from "@/utils/auth/AppInstall";
import { getUser } from "@/utils/auth/AuthUser";
import type { UserType } from "@/utils/auth/UserTypes";
import { Toast, ToastProvider } from "@/utils/general/Toast";

import { BottomNav } from "./BottomNav";
import { HeaderNav } from "./HeaderNav";

/* ------------------ BREAK ------------------ */

type GeneralLayoutChildren = ReactNode | ((user: UserType | null) => ReactNode);

type GeneralLayoutProps = {
	children: GeneralLayoutChildren;
	fixedFooter?: ReactNode;
	topView?: ReactNode;
	bottomView?: ReactNode;
	bottomNav?: ReactElement | null;
	floatingAction?: ReactElement;
	scroll?: boolean;
	scrollRef?: RefObject<ScrollView | null>;
	scrollEnabled?: boolean;
	style?: StyleProp<ViewStyle>;
	bodyStyle?: StyleProp<ViewStyle>;
	contentContainerStyle?: StyleProp<ViewStyle>;
	keyboardVerticalOffset?: number;
	edges?: Edge[];
	hideBottomViewOnKeyboard?: boolean;
	hideBottomMenu?: boolean;
	protectRoute?: boolean;
	onRefresh?: () => void | Promise<void>;
	refreshing?: boolean;
	pullToRefreshEnabled?: boolean;
};

/* ------------------ BREAK ------------------ */

// Renders shared page scrolling, keyboard clearance and one consistent bottom navigation slot.
export function GeneralLayout({
	children,
	fixedFooter,
	topView,
	bottomView,
	bottomNav,
	floatingAction,
	scroll = true,
	scrollRef,
	scrollEnabled = true,
	style,
	bodyStyle,
	contentContainerStyle,
	keyboardVerticalOffset = 0,
	edges = ["top", "left", "right", "bottom"],
	hideBottomViewOnKeyboard = true,
	hideBottomMenu = false,
	protectRoute = false,
	onRefresh,
	refreshing,
	pullToRefreshEnabled = true
}: GeneralLayoutProps) {
	const internalScrollRef = useRef<ScrollView | null>(null);
	const resolvedScrollRef = scrollRef ?? internalScrollRef;
	const focusedInput = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput>>(null);
	const keyboardTop = useRef<number | null>(null);
	const scrollOffset = useRef(0);
	const contentHeight = useRef(0);
	const viewportHeight = useRef(0);
	const keyboardSpace = useRef(new Animated.Value(0)).current;
	//Keyboard visibility state
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	//Auth state
	const [isAuthResolved, setIsAuthResolved] = useState(!protectRoute);
	const [authUser, setAuthUser] = useState<UserType | null>(null);

	/* ------------------ BREAK ------------------ */

	//insert app install info on mount
	useEffect(() => {
		(async () => {
			try {
				await insertAppInstall();
			} catch (error:any) {
				console.error("Error inserting app install info:", error);
				Toast.error({ message: error?.message });
			};//catch ends
		})();
	}, []);//useEffect ends

	// Runs the page refresh callback or refreshes the layout data while maintaining the native refresh indicator.
	const handleRefresh = async (): Promise<void> => {
		if (isRefreshing || refreshing) return;

		setIsRefreshing(true);

		try {
			if (onRefresh) {
				await onRefresh();
			} else {
				if (protectRoute) {
					const user = await getUser({ errorOnFail: false });
					setAuthUser(user);
				};//if ends

				setRefreshKey((currentKey) => currentKey + 1);
			};//if ends
		} finally {
			setIsRefreshing(false);
		};//try ends
	};//func ends


	//Useeffect for auth check on mount
	useEffect(() => {
		if (!protectRoute) return;
		// Flag to track if the component is still mounted
		let isMounted = true;
		
		//Check auth state
		(async () => {
			try {
				//get auth user
				const user = await getUser({ errorOnFail: false });

				//If user is not found, clear tokens and redirect to login
				if (!user) {
					return;
				};//if ends

				//If user is found, set auth state
				if (isMounted) {
					setAuthUser(user);
					setIsAuthResolved(true);
				};//if ends
			} catch (error:any) {
				Toast.error({ message: error?.message });
				console.error("GeneralLayout auth check failed:", error);
				//If error occurs, clear tokens and redirect to login
				//await removeUserTokens();
			};//catch ends
		})();//async ends

		//Cleanup
		return () => {
			isMounted = false;
		};
	}, [protectRoute]);//useEffect ends


	// Scrolls only the focused field that extends below the visible keyboard boundary.
	const scrollFocusedInput = useCallback((): void => {
		requestAnimationFrame(() => {
			if (!scroll || keyboardTop.current === null || !focusedInput.current || focusedInput.current !== TextInput.State.currentlyFocusedInput()) return;
			focusedInput.current.measureInWindow((_x, y, _width, height) => {
				if (keyboardTop.current === null || height === 0) return;
				const overlap = y + height + spacing.md - keyboardTop.current;
				if (overlap > 0) {
					resolvedScrollRef.current?.scrollTo({ y: scrollOffset.current + overlap, animated: true });
				};//if ends
			});//measure ends
		});//frame ends
	}, [scroll, resolvedScrollRef]);//callback ends

	// Returns scrolling to the content bounds after keyboard clearance is removed.
	const restoreScrollPosition = useCallback((remainingKeyboardSpace: number = 0): void => {
		if (!scroll) return;
		const maximumOffset = Math.max(0, contentHeight.current - remainingKeyboardSpace - viewportHeight.current);
		if (scrollOffset.current > maximumOffset) {
			resolvedScrollRef.current?.scrollTo({ y: maximumOffset, animated: true });
		};//if ends
	}, [scroll, resolvedScrollRef]);//callback ends

	// Adds keyboard clearance and animates its removal using each platform's supported events.
	useEffect(() => {
		// Records keyboard clearance before scrolling the focused input into view.
		const handleKeyboardShow = (event: KeyboardEvent): void => {
			keyboardTop.current = event.endCoordinates.screenY;
			keyboardSpace.stopAnimation();
			keyboardSpace.setValue(event.endCoordinates.height);
			setIsKeyboardVisible(true);
			scrollFocusedInput();
		};//func ends
		// Restores bottom navigation and collapses the extra scroll space on dismissal.
		const handleKeyboardHide = (event: KeyboardEvent): void => {
			if (keyboardTop.current === null) return;
			keyboardTop.current = null;
			focusedInput.current = null;
			setIsKeyboardVisible(false);
			keyboardSpace.stopAnimation((height: number) => {
				restoreScrollPosition(height);
				Animated.timing(keyboardSpace, {
					toValue: 0,
					duration: event.duration > 0 ? event.duration : 250,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: false
				}).start(({ finished }) => {
					if (finished) requestAnimationFrame(() => restoreScrollPosition());
				});//animation ends
			});//stopAnimation ends
		};//func ends
		const subscriptions = [
			Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", handleKeyboardShow),
			Keyboard.addListener("keyboardDidShow", scrollFocusedInput),
			Keyboard.addListener("keyboardDidHide", handleKeyboardHide)
		];
		if (Platform.OS === "ios") {
			subscriptions.push(Keyboard.addListener("keyboardWillHide", handleKeyboardHide));
		};//if ends
		return () => {
			subscriptions.forEach((subscription) => subscription.remove());
			keyboardSpace.stopAnimation();
		};//cleanup ends
	}, [keyboardSpace, restoreScrollPosition, scrollFocusedInput]);//useEffect ends

	// Tracks focus within this page, including switching fields while the keyboard stays open.
	const handleInputFocus = (): void => {
		focusedInput.current = TextInput.State.currentlyFocusedInput();
		scrollFocusedInput();
	};//func ends

	const resolvedTopView = topView === undefined ? <HeaderNav /> : topView;
	const customBottomNav = bottomNav !== undefined ? bottomNav : fixedFooter ?? bottomView;
	const hasCustomBottomNav = customBottomNav != null;
	const resolvedBottomNav = hasCustomBottomNav
		? <BottomNav hideMenu footerAction={customBottomNav} />
		: bottomNav === null || hideBottomMenu ? null : <BottomNav />;
	const resolvedEdges = hasCustomBottomNav ? edges.filter((edge) => edge !== "bottom") : edges;

	//If auth is not resolved, show loader
	if (!isAuthResolved) {
		return (
			<SafeAreaView style={styles.root} edges={edges}>
				<View style={styles.authLoader}>
					<PxCircularProgress size={40} color={colors.primary.main} />
				</View>
				<ToastProvider />
			</SafeAreaView>
		);//return ends
	};//if ends

	//Set authUser to children after auth is resolved
	const resolvedChildren = typeof children === "function" ? children(authUser) : children;

	//Default Return
	return (
		<SafeAreaView style={[styles.root, style]} edges={resolvedEdges}>
			<View style={styles.viewport}>
			{scroll ? <ScrollView
				ref={resolvedScrollRef}
				style={styles.scrollView}
				contentContainerStyle={[styles.content, contentContainerStyle]}
				scrollEnabled={scrollEnabled}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
				onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
				onContentSizeChange={(_width, height) => {
					contentHeight.current = height;
					scrollFocusedInput();
				}}
				refreshControl={Platform.OS !== "web" && pullToRefreshEnabled ? <RefreshControl
					refreshing={refreshing ?? isRefreshing}
					onRefresh={handleRefresh}
					tintColor={colors.secondary.main}
					colors={[colors.secondary.main]}
				/> : undefined}
			>
				{resolvedTopView}
				<View key={refreshKey} onFocus={handleInputFocus} style={[styles.body, bodyStyle]}>{resolvedChildren}</View>
				<Animated.View style={{ height: keyboardSpace }} />
			</ScrollView> : <KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={keyboardVerticalOffset}
				style={styles.keyboardView}
			>
				<View style={[styles.content, styles.staticContent, contentContainerStyle]}>
					{resolvedTopView}
					<View style={[styles.body, styles.staticBody, bodyStyle]}>{resolvedChildren}</View>
				</View>
			</KeyboardAvoidingView>}
			{floatingAction && !isKeyboardVisible ? <View pointerEvents="box-none" style={styles.floatingAction}>{floatingAction}</View> : null}
			</View>
			{hideBottomViewOnKeyboard && isKeyboardVisible ? null : resolvedBottomNav}
			<ToastProvider />
		</SafeAreaView>
	);//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.white.main },
	viewport: { flex: 1, minHeight: 0 },
	floatingAction: { position: "absolute", bottom: spacing.md, left: spacing.md, right: spacing.md, alignItems: "center" },
	keyboardView: { flex: 1, backgroundColor: colors.cream.main },
	content: { flexGrow: 1, backgroundColor: colors.cream.main },
	staticContent: { flex: 1 },
	body: { gap: spacing.lg },
	staticBody: { flex: 1 },
	scrollView: { flex: 1, backgroundColor: colors.cream.main },
	authLoader: { flex: 1, alignItems: "center", justifyContent: "center" }
});
