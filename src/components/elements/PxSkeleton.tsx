import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, type DimensionValue } from "react-native";

import { colors, radii } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

export type PxSkeletonProps = {
  width: DimensionValue;
  height: DimensionValue;
  opacity?: number;
  type?: "rounded" | "round" | "square";
};

/* ------------------ BREAK ------------------ */

// Reserves content dimensions with a shared pulsing placeholder on native and web.
export function PxSkeleton({ width, height, opacity = 1, type = "rounded" }: PxSkeletonProps) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  // Respects reduced motion and releases the animation and listener when unmounted.
  useEffect(() => {
    let active = true;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
      Animated.timing(pulse, { toValue: 0.45, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== "web", isInteraction: false })
    ]));
    // Keeps the placeholder static when the system requests reduced motion.
    const updateMotion = (reduceMotion: boolean): void => {
      if (!active) return;
      animation.stop();
      pulse.setValue(reduceMotion ? 1 : 0.45);
      if (!reduceMotion) animation.start();
    };//func ends
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", updateMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then(updateMotion);
    return () => {
      active = false;
      subscription.remove();
      animation.stop();
    };//return ends
  }, [pulse]);

  //Default Return
  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      pointerEvents="none"
      style={[styles.skeleton, { width, height, opacity: Animated.multiply(pulse, opacity) }, type === "round" ? styles.round : type === "square" ? styles.square : styles.rounded]}
    />
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  skeleton: { backgroundColor: colors.neutral.light, flexShrink: 0 },
  rounded: { borderRadius: radii.xl },
  round: { borderRadius: radii.pill },
  square: { borderRadius: radii.none }
});
