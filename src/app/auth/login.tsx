import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useForm, type SubmitHandler } from "react-hook-form";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { PxButton } from "@/components/elements/PxButton";
import { PxTextInput } from "@/components/form/PxTextInput";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type LoginFormValues = {
  email: string;
  password: string;
};

type GoogleLoginButtonProps = {
  onPress: () => void;
};

/* ------------------ BREAK ------------------ */

// Displays and manages the UnoQR login experience.
export default function LoginForm() {
  const RHF = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Handles valid login form submissions until the authentication API is connected.
  const handleLogin: SubmitHandler<LoginFormValues> = () => {
    // Authentication will be connected when the login API is available.
  };

  //Default Return
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <UnoQrLogo variant="icon" width={32} style={styles.logo} />

          <View style={styles.hero}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to manage your QR codes.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <PxTextInput
                name="email"
                RHF={RHF}
                type="email"
                size="large"
                placeholder="you@company.com"
                rules={{
                  required: "Email address is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address"
                  }
                }}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <Pressable accessibilityRole="button" onPress={() => undefined} hitSlop={spacing.xs}>
                  <Text style={styles.forgotLink}>Forgot?</Text>
                </Pressable>
              </View>
              <PxTextInput
                name="password"
                RHF={RHF}
                type="password"
                size="large"
                placeholder="••••••••"
                rules={{
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters"
                  }
                }}
              />
            </View>

            <PxButton
              mode="contained"
              color="secondary"
              size="lg"
              shape="rounded"
              fullWidth
              loading={RHF.formState.isSubmitting}
              onPress={RHF.handleSubmit(handleLogin)}
            >
              Log in
            </PxButton>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleLoginButton onPress={() => undefined} />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Don&apos;t have an account?</Text>
            <Pressable accessibilityRole="button" onPress={() => undefined} hitSlop={spacing.xs}>
              <Text style={styles.signupLink}>Sign up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders the full-width Google authentication button.
function GoogleLoginButton({ onPress }: GoogleLoginButtonProps) {
  //Default Return
  return (
    <Pressable
      accessibilityLabel="Continue with Google"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
    >
      <MaterialCommunityIcons
        name="google"
        size={24}
        color={colors.info.main}
      />
      <Text style={styles.socialButtonText}>Google</Text>
    </Pressable>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream.main
  },
  screen: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg
  },
  logo: {
    marginBottom: spacing.xxl
  },
  hero: {
    gap: spacing.xs,
    marginBottom: spacing.xl
  },
  title: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h3,
    lineHeight: 38,
    letterSpacing: -0.7
  },
  subtitle: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body1,
    lineHeight: 24
  },
  form: {
    gap: spacing.lg
  },
  fieldGroup: {
    gap: spacing.xs
  },
  fieldLabel: {
    color: colors.mute.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.overline,
    letterSpacing: 1.6
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  forgotLink: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body2
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line.main
  },
  dividerText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.body2
  },
  socialButton: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  socialButtonPressed: {
    opacity: 0.7
  },
  socialButtonText: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.body1
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: "auto",
    paddingTop: spacing.xxl
  },
  signupPrompt: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2
  },
  signupLink: {
    color: colors.secondary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.body2
  }
});
