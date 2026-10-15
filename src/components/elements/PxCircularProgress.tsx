import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

export type PxCircularProgressProps = {
  color?: string;
  size?: number;
};

/* ------------------ BREAK ------------------ */

// Renders a standalone circular loading icon with the same SVG animation on iOS and Android.
export function PxCircularProgress({ color = colors.secondary.main, size = 24 }: PxCircularProgressProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  // Rotates the loading arc continuously and stops the animation when the icon unmounts.
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(rotation, {
      toValue: 1,
      duration: 900,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false
    }));
    animation.start();
    return () => animation.stop();//cleanup ends
  }, [rotation]);//useEffect ends

  //Default Return
  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      pointerEvents="none"
      style={[styles.icon, { width: size, height: size, transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={12} r={10} fill="none" stroke={color} strokeWidth={2} opacity={0.16} />
        <Circle cx={12} cy={12} r={10} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray={[Math.PI * 15, Math.PI * 5]} />
      </Svg>
    </Animated.View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  icon: { flexShrink: 0 }
});
