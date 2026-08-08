import { useEffect, useState, type ReactNode, type RefObject } from "react";
import {
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	RefreshControl,
	StyleSheet,
	View, ScrollView,
	type StyleProp,
	type ViewStyle
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { ActivityIndicator, Text } from "react-native-paper";

import { colors, sizes } from "@/theme/themeSettings";
import { getUser, removeUserTokens } from "@/utils/auth/AuthUser";
import type { UserType } from "@/utils/auth/UserTypes";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

/* ------------------ BREAK ------------------ */

type GeneralLayoutChildren = ReactNode | ((user: UserType | null) => ReactNode);

type GeneralLayoutProps = {
	children: GeneralLayoutChildren;
	fixedFooter?: ReactNode;
	topView?: ReactNode;
	bottomView?: ReactNode;
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
	pullToRefreshEnabled?: boolean;
};

/* ------------------ BREAK ------------------ */

export function GeneralLayout({
	children,
	fixedFooter,
	topView,
	bottomView,
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
	protectRoute = true,
	onRefresh,
	pullToRefreshEnabled = true
}: GeneralLayoutProps) {
	const BASE_SCROLL_PADDING = 50;
	//Keyboard visibility state
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
	const [bottomPadding, setBottomPadding] = useState(BASE_SCROLL_PADDING);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	//Auth state
	const [isAuthResolved, setIsAuthResolved] = useState(!protectRoute);
	const [authUser, setAuthUser] = useState<UserType | null>(null);

	// Runs the page refresh callback or refreshes the layout data while maintaining the native refresh indicator.
	const handleRefresh = async () => {
		if (isRefreshing) return;

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
				if (!user) throw new Error("User not found");

				//If user is found, set auth state
				if (isMounted) {
					setAuthUser(user);
					setIsAuthResolved(true);
				};//if ends
			} catch (error) {
				//console.error("GeneralLayout auth check failed:", error);
				//If error occurs, clear tokens and redirect to login
				await removeUserTokens();
				//go to login
				router.replace("/auth/login_v2");
			};//catch ends
		})();//async ends

		//Cleanup
		return () => {
			isMounted = false;
		};
	}, [protectRoute]);//useEffect ends


	// Animate extra scroll padding based on keyboard height.
	useEffect(() => {
		const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
		const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

		const showSub = Keyboard.addListener(showEvent, (event) => {
			const keyboardHeight = Math.max(0, event.endCoordinates?.height || 0);
			const nextPadding = BASE_SCROLL_PADDING + keyboardHeight;
			setIsKeyboardVisible(true);
			setBottomPadding(nextPadding);
		});

		const hideSub = Keyboard.addListener(hideEvent, (event) => {
			setIsKeyboardVisible(false);
			setBottomPadding(BASE_SCROLL_PADDING);
		});

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	//Resolve top and bottom views
	const resolvedTopView = topView ?? (
		<TopNav
			title={authUser && authUser.member && `${authUser.member.first_name} ${authUser.member.last_name}` || null}
			subtitle={authUser && authUser.member && authUser.member?.old_id && `App ID: ${authUser.member?.old_id}` || null}
		/>
	);
	const resolvedBottomView = bottomView ?? <BottomNav />;

	//If auth is not resolved, show loader
	if (!isAuthResolved) {
		return (
			<SafeAreaView style={styles.root} edges={edges}>
				<View style={styles.authLoader}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</SafeAreaView>
		);
	};//if ends

	//Set authUser to children after auth is resolved
	const resolvedChildren = typeof children === "function" ? children(authUser) : children;

	//Content of the layout
	const content = scroll ? (
	<ScrollView
		ref={scrollRef}
		style={{ flex: 1 }}
		contentContainerStyle={[
			styles.content,
			contentContainerStyle,
			{ paddingBottom: 0 },
		]}
		scrollEnabled={scrollEnabled}
		keyboardShouldPersistTaps="handled"
		showsVerticalScrollIndicator
		bounces
		alwaysBounceVertical
		overScrollMode="always"
		refreshControl={Platform.OS !== "web" ? (
			<RefreshControl
				refreshing={isRefreshing}
				onRefresh={handleRefresh}
				enabled={pullToRefreshEnabled}
			/>
		) : undefined}
	>
		{resolvedTopView}

		<View key={refreshKey} style={[styles.body, bodyStyle]}>
			{resolvedChildren}
		</View>

		{bottomView && !fixedFooter ? <View style={styles.footer}>{bottomView}</View> : null }
		<View style={{ height: bottomPadding }} />
	</ScrollView>
) : (
	<KeyboardAvoidingView
		behavior={Platform.OS === "ios" ? "padding" : "height"}
		keyboardVerticalOffset={keyboardVerticalOffset}
		style={styles.keyboardView}
	>
		<View style={[styles.content, styles.staticContent, contentContainerStyle]}>
			{resolvedTopView}

			<View style={[styles.body, styles.staticBody, bodyStyle]}>
				{resolvedChildren}
			</View>

			{bottomView && !fixedFooter ? <View style={styles.footer}>{bottomView}</View> : null}
		</View>
	</KeyboardAvoidingView>
);

	//Default return
	return (
		<SafeAreaView style={[styles.root, style]} edges={edges}>
			{content}
			{fixedFooter ? <View style={styles.fixedFooter}>{fixedFooter}</View> : null}
			{!hideBottomMenu && !fixedFooter && !(hideBottomViewOnKeyboard && isKeyboardVisible) ? <View>{resolvedBottomView}</View> : null}
		</SafeAreaView>
	);//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background
	},
	keyboardView: {
		flex: 1
	},
	content: {
		flexGrow: 1,
		gap: 0
	},
	staticContent: {
		flex: 1
	},
	header: {
		gap: sizes.spacing.xs
	},
	title: {
		color: colors.black
	},
	subtitle: {
		maxWidth: 560,
		color: colors.grey[500]
	},
	headerContent: {
		marginTop: sizes.spacing.sm
	},
	body: {
		gap: sizes.spacing.lg
	},
	staticBody: {
		flex: 1
	},
	scrollView: {
		flex: 1
	},
	footer: {
		marginTop: sizes.spacing.sm
	},
	authLoader: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center"
	},
	fixedFooter: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 20,
		elevation: 20,
		paddingHorizontal: sizes.spacing.lg,
		paddingTop: sizes.spacing.sm,
		paddingBottom: sizes.spacing["2xl"],
		backgroundColor: "rgba(255, 255, 255, 0.96)",
		borderTopWidth: 1,
		borderTopColor: colors.border.main
	}
});
