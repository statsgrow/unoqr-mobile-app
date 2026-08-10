import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";
import NativeToast, {
  BaseToast,
  type ToastConfig,
  type ToastConfigParams,
  type ToastPosition
} from "react-native-toast-message";

import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

export type ToastOptions = {
  title?: string;
  message: string;
  duration?: number;
  position?: ToastPosition;
  onPress?: () => void;
};

type ProjectToastType = "success" | "error" | "warning" | "info";

type ProjectToastStyle = {
  color: string;
  backgroundColor: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

/* ------------------ BREAK ------------------ */

const defaultToastDuration = 6000;

/* ------------------ BREAK ------------------ */

const defaultToastTitles: Record<ProjectToastType, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info"
};

/* ------------------ BREAK ------------------ */

const toastStylesByType: Record<ProjectToastType, ProjectToastStyle> = {
  success: {
    color: colors.success.main,
    backgroundColor: `${colors.success.main}1A`,
    icon: "check-circle"
  },
  error: {
    color: colors.error.main,
    backgroundColor: `${colors.error.main}1A`,
    icon: "alert-circle"
  },
  warning: {
    color: colors.warning.dark,
    backgroundColor: `${colors.warning.main}1A`,
    icon: "alert"
  },
  info: {
    color: colors.info.main,
    backgroundColor: `${colors.info.main}1A`,
    icon: "information"
  }
};

/* ------------------ BREAK ------------------ */

// Displays branded UnoQR toast messages through a simple global API.
export const Toast = {
  success: (options: ToastOptions) => showToast("success", options),
  succes: (options: ToastOptions) => showToast("success", options),
  error: (options: ToastOptions) => showToast("error", options),
  warning: (options: ToastOptions) => showToast("warning", options),
  info: (options: ToastOptions) => showToast("info", options),
  hide: () => NativeToast.hide()
};

/* ------------------ BREAK ------------------ */

// Mounts the global toast viewport with the UnoQR visual configuration.
export function ToastProvider() {
  //Default Return
  return (
    <NativeToast
      config={toastConfig}
      position="top"
      topOffset={spacing.xxl + spacing.lg}
      visibilityTime={defaultToastDuration}
      swipeable
    />
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Sends one typed toast to the mounted global viewport.
function showToast(type: ProjectToastType, options: ToastOptions) {
  NativeToast.show({
    type,
    text1: options.title?.trim() || defaultToastTitles[type],
    text2: options.message,
    visibilityTime: options.duration ?? defaultToastDuration,
    position: options.position ?? "top",
    onPress: options.onPress
  });
};//func ends

// Renders one themed toast variant with its matching status icon and colors.
function renderProjectToast(
  type: ProjectToastType,
  params: ToastConfigParams<unknown>
) {
  const toastStyle = toastStylesByType[type];

  //Default Return
  return (
    <BaseToast
      {...params}
      style={[
        styles.toast,
        {
          borderColor: toastStyle.color,
          borderLeftColor: toastStyle.color
        }
      ]}
      contentContainerStyle={styles.content}
      text1Style={styles.title}
      text1NumberOfLines={2}
      text2Style={styles.message}
      text2NumberOfLines={6}
      renderLeadingIcon={() => (
        <View style={[styles.icon, { backgroundColor: toastStyle.backgroundColor }]}>
          <MaterialCommunityIcons
            name={toastStyle.icon}
            size={23}
            color={toastStyle.color}
          />
        </View>
      )}
    />
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const toastConfig: ToastConfig = {
  success: (params) => renderProjectToast("success", params),
  error: (params) => renderProjectToast("error", params),
  warning: (params) => renderProjectToast("warning", params),
  info: (params) => renderProjectToast("info", params)
};

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create<{
  toast: ViewStyle;
  content: ViewStyle;
  icon: ViewStyle;
  title: TextStyle;
  message: TextStyle;
}>({
  toast: {
    width: "90%",
    minHeight: 76,
    height: "auto",
    borderWidth: 1,
    borderLeftWidth: spacing.xxs,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  content: {
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginLeft: spacing.md,
    borderRadius: radii.pill
  },
  title: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body1
  },
  message: {
    marginTop: spacing.xxs,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: 20
  }
});
