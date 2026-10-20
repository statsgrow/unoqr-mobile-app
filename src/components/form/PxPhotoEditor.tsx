import { useEffect, useRef, useState } from "react";
import { Crop } from "lucide-react-native";
import { PixelRatio, Platform, StyleSheet, Text, useWindowDimensions, View, type GestureResponderEvent } from "react-native";
import Svg, { Image as SvgImage, Line, Path, Rect } from "react-native-svg";
import { File, Paths } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { PxButton } from "@/components/elements/PxButton";
import { PxCircularProgress } from "@/components/elements/PxCircularProgress";
import { PxModal } from "@/components/elements/PxModal";
import QrColorPicker from "@/helpers/qrcodes/create/QrColorPicker";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import GetError from "@/utils/general/Error";

/* ------------------ BREAK ------------------ */

export type PhotoRatio = 1 | "1" | "3:4" | "4:5" | "9:16" | "2.7:1";
export type PhotoEditorResult = { file: File; base64: string; width: number; height: number; bgcolor: string };
type PxPhotoEditorProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  file: string | File | null;
  ratio?: PhotoRatio;
  bgcolor?: string;
  onApply: (result: PhotoEditorResult) => Promise<void> | void;
};
type EditorImage = { uri: string; width: number; height: number };
type PhotoTransform = { scale: number; x: number; y: number };
type TouchPosition = { x: number; y: number; distance: number; count: number };
type PhotoEditorModal = "editor" | "crop";
type PhotoCropContentProps = {
  onChange: (transform: PhotoTransform) => void;
  image: EditorImage | null;
  transform: PhotoTransform;
  background: string;
  frameWidth: number;
  frameHeight: number;
};
type GestureStart = { position: TouchPosition; transform: PhotoTransform };

/* ------------------ BREAK ------------------ */

const INITIAL_TRANSFORM: PhotoTransform = { scale: 1, x: 0, y: 0 };
const MAX_PHOTO_EXPORT_EDGE = 2048;
const BACKGROUND_COLORS = [colors.white.main, colors.cream.main, colors.primary.main, "#17324D", "#214D3A", "#5B2A69", colors.secondary.main];

// Previews a photo with live colors and switches to a crop view inside the same native modal.
export default function PxPhotoEditor({ open, setOpen, file, ratio = 1, bgcolor = colors.white.main, onApply }: PxPhotoEditorProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [image, setImage] = useState<EditorImage | null>(null);
  const [transform, setTransform] = useState<PhotoTransform>(INITIAL_TRANSFORM);
  const [background, setBackground] = useState(bgcolor);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exportSvgRef = useRef<Svg | null>(null);
  const exportResolve = useRef<((value: string) => void) | null>(null);
  const [exportSize, setExportSize] = useState<{ width: number; height: number } | null>(null);
  const [visibleModal, setVisibleModal] = useState<PhotoEditorModal>("editor");
  const cropDraft = useRef<PhotoTransform>(INITIAL_TRANSFORM);
  const isCropping = visibleModal === "crop";
  const applying = useRef(false);
  const aspectRatio = getAspectRatio(ratio);
  const frameWidth = Math.min(Math.min(windowWidth, 430) - spacing.lg * 2, 320 * aspectRatio);
  const frameHeight = frameWidth / aspectRatio;
  const baseScale = image ? frameHeight / image.height : 1;
  const imageWidth = (image?.width ?? 0) * baseScale * transform.scale;
  const imageHeight = (image?.height ?? 0) * baseScale * transform.scale;

  // Restores the source image and editing defaults each time a new editing session opens.
  useEffect(() => {
    if (!open) {
      setImage(null);
      setReady(false);
      setVisibleModal("editor");
      return;
    };//if ends
    let active = true;
    setImage(null);
    setReady(false);
    setError(null);
    setBackground(/^#[\da-f]{6}$/i.test(bgcolor) ? bgcolor : colors.white.main);
    setTransform(INITIAL_TRANSFORM);
    setVisibleModal("editor");
    cropDraft.current = INITIAL_TRANSFORM;
    setLoading(true);
    loadEditorImage(file).then((loaded) => {
      if (active) setImage(loaded);
    }).catch((cause: unknown) => {
      if (active) setError(GetError({ error: cause, message: "This photo could not be opened. Please choose another photo." }).message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, file, ratio, bgcolor]);

  // Switches editor views in one native modal so the underlying page never appears between them.
  function changeModal(next: PhotoEditorModal): void {
    setVisibleModal(next);
  };//func ends

  // Confirms only the crop draft before returning to the static preview.
  function confirmCrop(): void {
    setTransform(cropDraft.current);
    changeModal("editor");
  };//func ends

  // Exports exactly the visible crop and background, leaving the editor open if upload fails.
  async function applyPhoto(): Promise<void> {
    if (!image || !ready || applying.current) return;
    applying.current = true;
    setSaving(true);
    setError(null);
    let output: File | null = null;
    try {
      const { width, height } = getPhotoExportSize(frameWidth / (baseScale * transform.scale), frameHeight / (baseScale * transform.scale));
      // iOS exports the SVG's actual bounds at screen density; render matching bounds first.
      const density = Platform.OS === "ios" ? PixelRatio.get() : 1;
      const base64 = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => { exportResolve.current = null; reject(new Error("Your photo could not be prepared. Please try again.")); }, 15000);
        exportResolve.current = (value) => { clearTimeout(timeout); resolve(value); };
        setExportSize({ width: width / density, height: height / density });
      });
      if (!base64) throw new Error("Your photo could not be prepared. Please try again.");
      output = new File(Paths.cache, `edited-photo-${Date.now()}.png`);
      output.write(base64, { encoding: "base64" });
      await onApply({ file: output, base64: `data:image/png;base64,${base64}`, width, height, bgcolor: background });
      setOpen(false);
    } catch (cause: unknown) {
      if (output?.exists) output.delete();
      setError(GetError({ error: cause, message: "Your edited photo could not be applied. Please try again." }).message);
    } finally {
      applying.current = false;
      setSaving(false);
      setExportSize(null);
      exportResolve.current = null;
    };//try-catch ends
  };//func ends

  //Default Return
  return <PxModal open={open} setOpen={setOpen} onRequestClose={() => { if (!saving) { if (isCropping) changeModal("editor"); else setOpen(false); } }}
    name={isCropping ? "Crop photo" : "Edit photo"} height={isCropping ? "full" : "auto"} maxHeight={900}
    appearance={isCropping ? "dark" : "light"} showHandle={!isCropping} scrollEnabled={!isCropping} keyboardAvoiding={!isCropping}
    contentContainerStyle={isCropping ? styles.cropScrollContent : undefined}
    hideCloseButton={saving} closeOnBackdropClick={!saving}
    footerAction={<View><PxButton mode="contained" color="secondary" onPress={isCropping ? confirmCrop : applyPhoto} loading={saving} disabled={loading || !ready || saving}>{isCropping ? "Crop" : "Apply"}</PxButton></View>}
  >
    {isCropping ? <PhotoCropContent onChange={(next) => { cropDraft.current = next; }} image={image} transform={transform}
      background={background} frameWidth={frameWidth} frameHeight={frameHeight} /> : <View style={styles.content} pointerEvents={saving ? "none" : "auto"}>
      <View style={[styles.cropWindow, { width: frameWidth, height: frameHeight, backgroundColor: background }]}
        accessibilityLabel={`Photo preview, ratio ${ratio}`}>
        {image ? <Svg width={frameWidth} height={frameHeight} viewBox={`0 0 ${frameWidth} ${frameHeight}`} pointerEvents="none">
          <Rect width={frameWidth} height={frameHeight} fill={background} />
          <SvgImage href={image.uri} x={(frameWidth - imageWidth) / 2 + transform.x} y={(frameHeight - imageHeight) / 2 + transform.y}
            width={imageWidth} height={imageHeight} preserveAspectRatio="none" onLoad={() => setReady(true)} />
        </Svg> : null}
        {loading ? <View style={styles.loading}><PxCircularProgress color={colors.primary.main} size={28} /></View> : null}
      </View>
      <PxButton mode="outlined" onPress={() => changeModal("crop")} disabled={loading || !ready || saving}
        icon={({ color, size }: { color: string; size: number }) => <Crop color={color} size={size} strokeWidth={1.25} />}>
        Crop
      </PxButton>
      {image && exportSize ? <View pointerEvents="none" style={styles.exportHost}>
        <Svg ref={exportSvgRef} width={exportSize.width} height={exportSize.height} viewBox={`0 0 ${frameWidth} ${frameHeight}`}>
          <Rect width={frameWidth} height={frameHeight} fill={background} />
          <SvgImage href={image.uri} x={(frameWidth - imageWidth) / 2 + transform.x} y={(frameHeight - imageHeight) / 2 + transform.y}
            width={imageWidth} height={imageHeight} preserveAspectRatio="none"
            onLoad={() => exportSvgRef.current?.toDataURL((value) => exportResolve.current?.(value))} />
        </Svg>
      </View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <QrColorPicker name="Background" color={background} onChangeColor={setBackground} presets={BACKGROUND_COLORS} applyOnChange hint="Changes appear immediately in the crop window." />
    </View>}
  </PxModal>;//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Isolates photo dragging and pinch zoom inside a fixed, non-scrolling crop sheet.
function PhotoCropContent({ onChange, image, transform, background, frameWidth: previewWidth, frameHeight: previewHeight }: PhotoCropContentProps) {
  const [draft, setDraft] = useState<PhotoTransform>(transform);
  const [stage, setStage] = useState({ width: previewWidth, height: previewHeight });
  const aspectRatio = previewWidth / previewHeight;
  const frameWidth = Math.min(stage.width, stage.height * aspectRatio);
  const frameHeight = frameWidth / aspectRatio;
  const displayScale = frameWidth / previewWidth;
  const transformRef = useRef(transform);
  const gestureStart = useRef<GestureStart | null>(null);
  const frameRef = useRef<View | null>(null);
  const frameOrigin = useRef({ x: 0, y: 0 });
  const baseScale = image ? frameHeight / image.height : 1;
  const imageWidth = (image?.width ?? 0) * baseScale * draft.scale;
  const imageHeight = (image?.height ?? 0) * baseScale * draft.scale;

  // Starts each crop session with the last confirmed position; closing discards draft moves.
  useEffect(() => {
    const bounded = constrainPhotoPosition(transform, image, previewWidth, previewHeight);
    setDraft(bounded);
    transformRef.current = bounded;
    onChange(bounded);
    gestureStart.current = null;
  }, [transform, image, previewWidth, previewHeight]);

  // Records the current fingers and transform without jumping when another finger is added.
  function beginGesture(event: GestureResponderEvent): void {
    gestureStart.current = { position: getTouchPosition(event), transform: transformRef.current };
  };//func ends

  // Moves the image and scales around the pinch midpoint while retaining the fixed crop window.
  function moveGesture(event: GestureResponderEvent): void {
    const position = getTouchPosition(event);
    const start = gestureStart.current;
    if (!start || position.count !== start.position.count) {
      beginGesture(event);
      return;
    };//if ends
    const scale = Math.max(0.25, Math.min(6, start.transform.scale * (position.count > 1 && start.position.distance > 0 ? position.distance / start.position.distance : 1)));
    const factor = scale / start.transform.scale;
    const focusX = (start.position.x - frameOrigin.current.x - frameWidth / 2) / displayScale;
    const focusY = (start.position.y - frameOrigin.current.y - frameHeight / 2) / displayScale;
    const next: PhotoTransform = {
      scale,
      x: focusX + (start.transform.x - focusX) * factor + (position.x - start.position.x) / displayScale,
      y: focusY + (start.transform.y - focusY) * factor + (position.y - start.position.y) / displayScale
    };
    const bounded = constrainPhotoPosition(next, image, previewWidth, previewHeight);
    transformRef.current = bounded;
    setDraft(bounded);
    onChange(bounded);
  };//func ends

  //Default Return
  return <View style={styles.cropContent}>
      <View style={styles.cropStage} onLayout={(event) => setStage({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
      <View ref={frameRef} style={[styles.cropWindow, styles.cropFrame, { width: frameWidth, height: frameHeight, backgroundColor: background }]}
        onLayout={() => frameRef.current?.measureInWindow((x, y) => { frameOrigin.current = { x, y }; })}
        accessibilityLabel="Photo crop window"
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => { frameRef.current?.measureInWindow((x, y) => { frameOrigin.current = { x, y }; }); beginGesture(event); }}
        onResponderMove={moveGesture} onResponderTerminationRequest={() => false}
        onResponderRelease={() => { gestureStart.current = null; }}>
        {image ? <Svg width={frameWidth} height={frameHeight} viewBox={`0 0 ${frameWidth} ${frameHeight}`} pointerEvents="none">
          <Rect width={frameWidth} height={frameHeight} fill={background} />
          <SvgImage href={image.uri} x={(frameWidth - imageWidth) / 2 + draft.x * displayScale} y={(frameHeight - imageHeight) / 2 + draft.y * displayScale}
            width={imageWidth} height={imageHeight} preserveAspectRatio="none" />
        </Svg> : null}
        <Svg width={frameWidth} height={frameHeight} pointerEvents="none" style={styles.cropGuides}>
          {[1, 2].map((third) => <Line key={`vertical-${third}`} x1={frameWidth * third / 3} x2={frameWidth * third / 3} y1={0} y2={frameHeight} stroke={colors.white.main} strokeOpacity={0.55} strokeWidth={1} />)}
          {[1, 2].map((third) => <Line key={`horizontal-${third}`} x1={0} x2={frameWidth} y1={frameHeight * third / 3} y2={frameHeight * third / 3} stroke={colors.white.main} strokeOpacity={0.55} strokeWidth={1} />)}
          <Rect x={1} y={1} width={frameWidth - 2} height={frameHeight - 2} fill="none" stroke={colors.white.main} strokeOpacity={0.7} strokeWidth={2} />
          <Path d={`M 6 24 V 6 H 24 M ${frameWidth - 24} 6 H ${frameWidth - 6} V 24 M 6 ${frameHeight - 24} V ${frameHeight - 6} H 24 M ${frameWidth - 24} ${frameHeight - 6} H ${frameWidth - 6} V ${frameHeight - 24}`} fill="none" stroke={colors.white.main} strokeWidth={3} />
        </Svg>
      </View>
      </View>
      <Text style={styles.cropHint}>Drag to reposition. Pinch to zoom in or out.</Text>
    </View>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Caps the final composition at 2048 pixels on its longest side without enlarging smaller exports.
function getPhotoExportSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_PHOTO_EXPORT_EDGE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};//func ends

/* ------------------ BREAK ------------------ */

// Stops dragging at image edges and centers an axis when the image is smaller than the crop.
function constrainPhotoPosition(transform: PhotoTransform, image: EditorImage | null, width: number, height: number): PhotoTransform {
  if (!image) return { ...transform, x: 0, y: 0 };
  const scale = height / image.height * transform.scale;
  const maximumX = Math.max(0, (image.width * scale - width) / 2);
  const maximumY = Math.max(0, (image.height * scale - height) / 2);
  return {
    ...transform,
    x: Math.max(-maximumX, Math.min(maximumX, transform.x)),
    y: Math.max(-maximumY, Math.min(maximumY, transform.y))
  };
};//func ends

/* ------------------ BREAK ------------------ */

// Converts the supported crop ratios to their numeric width-to-height value.
function getAspectRatio(ratio: PhotoRatio): number {
  if (ratio === 1 || ratio === "1") return 1;
  const [width, height] = ratio.split(":").map(Number);
  return width / height;
};//func ends

// Normalizes a File, data URL, raw base64 or saved photo URL to oriented, lossless pixels.
async function loadEditorImage(file: string | File | null): Promise<EditorImage> {
  if (!file) throw new Error("Choose a photo before opening the editor.");
  const source = typeof file === "string" ? (/^(data:|https?:|file:|content:)/i.test(file) ? file : `data:image/jpeg;base64,${file}`) : file.uri;
  const result = await manipulateAsync(source, [], { format: SaveFormat.PNG, compress: 1, base64: true });
  if (!result.base64) throw new Error("This photo could not be opened. Please choose another photo.");
  const temporaryFile = new File(result.uri);
  if (temporaryFile.exists) temporaryFile.delete();
  return { uri: `data:image/png;base64,${result.base64}`, width: result.width, height: result.height };
};//func ends

// Measures the fingers' midpoint and separation for smooth dragging and pinch scaling.
function getTouchPosition(event: GestureResponderEvent): TouchPosition {
  const touches = event.nativeEvent.touches;
  const first = touches[0] ?? event.nativeEvent;
  const second = touches[1];
  return {
    x: second ? (first.pageX + second.pageX) / 2 : first.pageX,
    y: second ? (first.pageY + second.pageY) / 2 : first.pageY,
    distance: second ? Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY) : 0,
    count: touches.length
  };
};//func ends

const styles = StyleSheet.create({
  cropScrollContent: { flexGrow: 1 },
  cropContent: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md },
  cropStage: { flex: 1, alignItems: "center", justifyContent: "center" },
  cropFrame: { borderWidth: 0, borderRadius: radii.none },
  cropGuides: { position: "absolute", top: 0, left: 0 },
  cropHint: { color: colors.white.main, textAlign: "center", fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  exportHost: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  hint: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  cropWindow: { alignSelf: "center", overflow: "hidden", borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.md },
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  error: { color: colors.error.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 }
});
