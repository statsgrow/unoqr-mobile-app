import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import { Controller, type FieldValues } from "react-hook-form";
import { Text } from "react-native-paper";

import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

import { PxFormField, type PxFormBinding, type PxFormFieldOptions } from "./PxFormField";

/* ------------------ BREAK ------------------ */

export type PxSwitchProps<T extends FieldValues = FieldValues> = PxFormBinding<T, boolean> & PxFormFieldOptions & {
  description?: string;
  disabled?: boolean;
  onValueChange?: (value: boolean) => void;
};
type SwitchElementProps<T extends FieldValues> = { props: PxSwitchProps<T>; value: boolean; change: (value: boolean) => void; blur?: () => void; fieldError?: string | boolean };

/* ------------------ BREAK ------------------ */

// Connects an identical iOS-style switch to RHF or a page-controlled boolean on both platforms.
export function PxSwitch<T extends FieldValues = FieldValues>(props: PxSwitchProps<T>) {
  if (props.RHF) {
    //Default Return
    return <Controller control={props.RHF.control} name={props.name} rules={props.rules} render={({ field, fieldState }) => (
      <SwitchElement props={props} value={Boolean(field.value)} change={(value) => { field.onChange(value); props.onValueChange?.(value); }} blur={field.onBlur} fieldError={fieldState.error?.message || fieldState.invalid} />
    )} />;//return ends
  };//if ends

  //Default Return
  return <SwitchElement props={props} value={props.value} change={(value) => props.onValueChange?.(value)} />;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Draws the reference's rounded track and white pill thumb with one shared sliding animation.
function SwitchElement<T extends FieldValues>({ props, value, change, blur, fieldError }: SwitchElementProps<T>) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const { label, lable, description, helperText, fullWidth, style, error, disabled = false, name } = props;
  const resolvedLabel = label ?? lable;

  // Moves the thumb when either the user or RHF changes the switch value.
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: value ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" });
    animation.start();
    return () => animation.stop();//cleanup ends
  }, [progress, value]);//useEffect ends

  //Default Return
  return <PxFormField fullWidth={fullWidth} style={style} helperText={helperText} error={fieldError || error}>
    <Pressable accessibilityRole="switch" accessibilityLabel={resolvedLabel ?? name} accessibilityHint={description} accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => { change(!value); blur?.(); }} onBlur={blur} style={[styles.row, disabled && styles.disabled]}>
      {resolvedLabel || description ? <View style={styles.copy}>
        {resolvedLabel ? <Text style={styles.label}>{resolvedLabel}</Text> : null}
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View> : null}
      <View style={[styles.track, value && styles.enabledTrack]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] }]} />
      </View>
    </Pressable>
  </PxFormField>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.xs },
  copy: { flex: 1, gap: spacing.xxs },
  label: { color: colors.primary.main, fontFamily: fontFamilies.primaryMedium, fontSize: fontSizes.body2 },
  description: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption, lineHeight: 18 },
  track: { flexShrink: 0, width: 64, height: 28, padding: 2, borderRadius: radii.pill, backgroundColor: colors.mute.light },
  enabledTrack: { backgroundColor: colors.secondary.main },
  thumb: { width: 36, height: 24, borderRadius: radii.pill, backgroundColor: colors.white.main },
  disabled: { opacity: 0.55 }
});
