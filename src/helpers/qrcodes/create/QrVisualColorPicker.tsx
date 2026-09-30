import { useState } from "react";
import { StyleSheet, View, type GestureResponderEvent } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { colors, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type QrVisualColorPickerProps = {
  color: string;
  onChangeColor: (color: string) => void;
};

type HsvColor = { hue: number; saturation: number; value: number };

/* ------------------ BREAK ------------------ */

const PICKER_HEIGHT = 180;
const HUE_HEIGHT = 22;

/* ------------------ BREAK ------------------ */

// Lets users choose a color with a shade area and hue strip.
export default function QrVisualColorPicker({ color, onChangeColor }: QrVisualColorPickerProps) {
  const [width, setWidth] = useState(1);
  const selected = hexToHsv(color);
  const hueColor = hsvToHex({ hue: selected.hue, saturation: 1, value: 1 });

  // Applies the shade at the current touch position.
  function selectShade(event: GestureResponderEvent) {
    const saturation = clamp(event.nativeEvent.locationX / width);
    const value = 1 - clamp(event.nativeEvent.locationY / PICKER_HEIGHT);
    onChangeColor(hsvToHex({ hue: selected.hue, saturation, value }));
  };//func ends

  // Applies the hue at the current touch position.
  function selectHue(event: GestureResponderEvent) {
    const hue = clamp(event.nativeEvent.locationX / width) * 360;
    onChangeColor(hsvToHex({ hue, saturation: Math.max(selected.saturation, 0.75), value: Math.max(selected.value, 0.75) }));
  };//func ends

  //Default Return
  return (
    <View style={styles.content} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View
        accessibilityLabel="Color shade picker"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={selectShade}
        onResponderMove={selectShade}
        onResponderTerminationRequest={() => false}
        style={styles.shade}
      >
        <Svg width="100%" height="100%" pointerEvents="none" style={styles.gradient}>
          <Defs>
            <LinearGradient id="saturation" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="value" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={hueColor} />
          <Rect width="100%" height="100%" fill="url(#saturation)" />
          <Rect width="100%" height="100%" fill="url(#value)" />
        </Svg>
        <View pointerEvents="none" style={[styles.shadeMarker, { left: selected.saturation * width - 9, top: (1 - selected.value) * PICKER_HEIGHT - 9, backgroundColor: color }]} />
      </View>
      <View
        accessibilityLabel="Color hue picker"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={selectHue}
        onResponderMove={selectHue}
        onResponderTerminationRequest={() => false}
        style={styles.hue}
      >
        <Svg width="100%" height="100%" pointerEvents="none" style={styles.gradient}>
          <Defs>
            <LinearGradient id="hues" x1="0%" y1="0%" x2="100%" y2="0%">
              {["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF", "#FF0000"].map((stopColor, index) => (
                <Stop key={`${stopColor}-${index}`} offset={`${index * 100 / 6}%`} stopColor={stopColor} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#hues)" />
        </Svg>
        <View pointerEvents="none" style={[styles.hueMarker, { left: selected.hue / 360 * (width - HUE_HEIGHT), backgroundColor: hueColor }]} />
      </View>
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Keeps a picker coordinate within its visible range.
function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
};//func ends

// Converts a six-digit hex color to hue, saturation, and value.
function hexToHsv(hex: string): HsvColor {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta && max === red) hue = ((green - blue) / delta) % 6;
  else if (delta && max === green) hue = (blue - red) / delta + 2;
  else if (delta) hue = (red - green) / delta + 4;

  return { hue: (hue * 60 + 360) % 360, saturation: max ? delta / max : 0, value: max };
};//func ends

// Converts the picker coordinates to a six-digit hex color.
function hsvToHex({ hue, saturation, value }: HsvColor): string {
  const chroma = value * saturation;
  const segment = hue / 60;
  const second = chroma * (1 - Math.abs(segment % 2 - 1));
  const offset = value - chroma;
  const channels = segment < 1 ? [chroma, second, 0]
    : segment < 2 ? [second, chroma, 0]
    : segment < 3 ? [0, chroma, second]
    : segment < 4 ? [0, second, chroma]
    : segment < 5 ? [second, 0, chroma] : [chroma, 0, second];

  return `#${channels.map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  shade: { height: PICKER_HEIGHT, borderRadius: radii.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border.main },
  hue: { height: HUE_HEIGHT, borderRadius: radii.pill, overflow: "hidden" },
  gradient: { width: "100%", height: "100%" },
  shadeMarker: { position: "absolute", width: 18, height: 18, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.white.main },
  hueMarker: { position: "absolute", top: 0, width: HUE_HEIGHT, height: HUE_HEIGHT, borderRadius: radii.pill, borderWidth: 3, borderColor: colors.white.main }
});
