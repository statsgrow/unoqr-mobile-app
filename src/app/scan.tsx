import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Mask, Rect } from "react-native-svg";

import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { PxButton } from "@/components/elements/PxButton";
import { insertScan } from "@/helpers/scans/db/insertQueries";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";
import { getUUIDv4 } from "@/utils/general/Uid";
import { getScanById } from "@/helpers/scans/db/getQueries";

/* ------------------ BREAK ------------------ */

type ScannerOverlayProps = {
  targetSize: number;
  torchEnabled: boolean;
  scanComplete: boolean;
  showTestDestination: boolean;
  testDestination: string;
  onClose: () => void;
  onSubmitTestDestination: () => void;
  onTestDestinationChange: (value: string) => void;
  onToggleTorch: () => void;
};

type ScanResultCardProps = {
  value: string;
  onClose: () => void;
  onScanAgain: () => void;
};

type RoundedTargetMaskProps = {
  screenWidth: number;
  screenHeight: number;
  targetSize: number;
};

/* ------------------ BREAK ------------------ */

const scanTargetRadius = radii.xl + spacing.sm;

/* ------------------ BREAK ------------------ */

// Renders the full-screen camera scanner and manages QR detection states.
export default function ScanScreen() {
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [testDestination, setTestDestination] = useState("");
  const targetSize = Math.min(340, Math.max(260, width - spacing.lg * 2));
  const showTestDestination = process.env.EXPO_PUBLIC_API_ENV === "development"
    && (Platform.OS === "android" || Platform.OS === "ios");

  
  // Persists completed scan results to the local SQLite database on native platforms.
  useEffect(() => {
    //sqlite is not available on web, so we skip the insert
    if (!scanResult || Platform.OS === "web") return;
    //Olny insert scan if platform is android or ios
    if (Platform.OS !== "android" && Platform.OS !== "ios") return;
   

    const now = new Date().toISOString();
    const scanType = /^https?:\/\//i.test(scanResult) ? "url" : "text";

    const scanData = {
      id: getUUIDv4(),
      value: scanResult,
      type: scanType,
      status: "pending",
      lantitude: null,
      longitude: null,
      location: null,
      created_at: now,
      updated_at: now
    };  

    void insertScan(scanData);

    //also get this row 
    getScanById(scanData.id)
    .then((d) => {
      // Successfully fetched scan data
      console.log('Successfully fetched scan data after insert', d);
    })
    .catch((error) => {
      console.error('Error fetching scan by ID after insert:', error);
    });//try catch ends

  }, [scanResult]);

  // Closes the scanner and returns to the previous app screen.
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    };//if ends

    router.replace("/");
  };//func ends

  // Locks the scanner after receiving the first valid destination value.
  const handleScannedValue = (value: string) => {
    const normalizedValue = value.trim();
    console.log("Scanned value:", normalizedValue);
    //If scan is set or normalized value is empty, return
    if (scanResult || !normalizedValue) return;
  
    //Set the scan result to the normalized value
    setScanResult(normalizedValue);

  };//func ends

  // Passes a detected camera barcode into the shared destination flow.
  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    handleScannedValue(data);
  };//func ends

  if (!permission) {
    //Default Return
    return <View style={styles.loadingScreen} />;
  };//if ends

  if (!permission.granted) {
    //Default Return
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <StatusBar style="dark" />
        <View style={styles.permissionIcon}>
          <MaterialCommunityIcons name="camera-outline" size={38} color={colors.secondary.main} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Uno QR uses your camera only while this screen is open to detect QR codes.
        </Text>
        <PxButton color="secondary" size="lg" fullWidth onPress={requestPermission}>
          Allow camera access
        </PxButton>
        <PxButton mode="text" color="primary" onPress={handleClose}>
          Not now
        </PxButton>
      </SafeAreaView>
    );//return ends
  };//if ends

  //Default Return
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchEnabled}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanResult ? undefined : handleBarcodeScanned}
      />

      <ScannerOverlay
        targetSize={targetSize}
        torchEnabled={torchEnabled}
        scanComplete={Boolean(scanResult)}
        showTestDestination={showTestDestination}
        testDestination={testDestination}
        onClose={handleClose}
        onSubmitTestDestination={() => handleScannedValue(testDestination)}
        onTestDestinationChange={setTestDestination}
        onToggleTorch={() => setTorchEnabled((currentValue) => !currentValue)}
      />

      {scanResult ? (
        <ScanResultCard
          value={scanResult}
          onClose={handleClose}
          onScanAgain={() => setScanResult(null)}
        />
      ) : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Draws the camera controls, dimmed mask, and animated QR targeting frame.
function ScannerOverlay({
  targetSize,
  torchEnabled,
  scanComplete,
  showTestDestination,
  testDestination,
  onClose,
  onSubmitTestDestination,
  onTestDestinationChange,
  onToggleTorch
}: ScannerOverlayProps) {
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const scanLineProgress = useRef(new Animated.Value(0)).current;
  const screenWidth = overlaySize.width;
  const screenHeight = overlaySize.height;

  // Animates the scan line continuously while the scanner is active.
  useEffect(() => {
    if (scanComplete) {
      scanLineProgress.stopAnimation();
      return;
    };//if ends

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineProgress, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true
        }),
        Animated.timing(scanLineProgress, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true
        })
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [scanComplete, scanLineProgress]);

  const scanLineTranslate = scanLineProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [spacing.lg, targetSize - spacing.lg - 2]
  });

  //Default Return
  return (
    <View
      pointerEvents="box-none"
      style={styles.overlay}
      onLayout={({ nativeEvent }) => setOverlaySize(nativeEvent.layout)}
    >
      <SafeAreaView pointerEvents="box-none" style={styles.controlsSafeArea}>
        <View style={styles.topControls}>
          <Pressable accessibilityLabel="Close scanner" onPress={onClose} style={styles.controlButton}>
            <MaterialCommunityIcons name="close" size={26} color={colors.white.main} />
          </Pressable>
          <Text style={styles.scannerTitle}>Scan QR code</Text>
          <Pressable accessibilityLabel="Toggle flashlight" onPress={onToggleTorch} style={styles.controlButton}>
            <MaterialCommunityIcons
              name={torchEnabled ? "flashlight" : "flashlight-off"}
              size={23}
              color={torchEnabled ? colors.secondary.main : colors.white.main}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      {screenWidth > 0 && screenHeight > 0 ? (
        <RoundedTargetMask
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          targetSize={targetSize}
        />
      ) : null}

      <View style={styles.targetLayout} pointerEvents="box-none">
        {showTestDestination && !scanComplete ? (
          <View
            style={[
              styles.testDestinationWrap,
              { top: screenHeight / 2 - targetSize / 2 - 68 }
            ]}
          >
            <TextInput
              accessibilityLabel="Test destination URL"
              value={testDestination}
              onChangeText={onTestDestinationChange}
              onSubmitEditing={onSubmitTestDestination}
              placeholder="Paste a test destination"
              placeholderTextColor={colors.mute.light}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              style={styles.testDestinationInput}
            />
            <Pressable
              accessibilityLabel="Use test destination"
              accessibilityRole="button"
              disabled={!testDestination.trim()}
              onPress={onSubmitTestDestination}
              style={({ pressed }) => [
                styles.testDestinationButton,
                !testDestination.trim() && styles.testDestinationButtonDisabled,
                pressed && styles.testDestinationButtonPressed
              ]}
            >
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.white.main} />
            </Pressable>
          </View>
        ) : null}

        <View pointerEvents="none" style={[styles.target, { width: targetSize, height: targetSize }]}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          {!scanComplete ? (
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanLineTranslate }] }]}
            />
          ) : null}
        </View>
        <View
          style={[
            styles.instructionWrap,
            { top: screenHeight / 2 + targetSize / 2 + spacing.xl }
          ]}
        >
          <Text style={styles.instruction}>Align the QR code inside the frame</Text>
          <Text style={styles.instructionHint}>Scanning happens automatically</Text>
        </View>
      </View>

      <SafeAreaView pointerEvents="none" edges={["bottom"]} style={styles.poweredBySafeArea}>
        <View style={styles.poweredByWrap}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <UnoQrLogo width={72} color={colors.white.main} />
        </View>
      </SafeAreaView>
    </View>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Dims the target's square corners so its camera opening matches the rounded brackets.
function RoundedTargetMask({ screenWidth, screenHeight, targetSize }: RoundedTargetMaskProps) {
  const targetX = (screenWidth - targetSize) / 2;
  const targetY = (screenHeight - targetSize) / 2;

  //Default Return
  return (
    <Svg pointerEvents="none" width={screenWidth} height={screenHeight} style={styles.roundedTargetMask}>
      <Defs>
        <Mask id="roundedScannerOpening">
          <Rect width={screenWidth} height={screenHeight} fill={colors.white.main} />
          <Rect
            x={targetX}
            y={targetY}
            width={targetSize}
            height={targetSize}
            rx={scanTargetRadius}
            ry={scanTargetRadius}
            fill={colors.black.main}
          />
        </Mask>
      </Defs>
      <Rect
        width={screenWidth}
        height={screenHeight}
        fill="rgba(0,0,0,0.62)"
        mask="url(#roundedScannerOpening)"
      />
    </Svg>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Shows the detected QR value and the next available actions.
function ScanResultCard({ value, onClose, onScanAgain }: ScanResultCardProps) {
  //Default Return
  return (
    <SafeAreaView edges={["bottom"]} style={styles.resultWrap}>
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check" size={22} color={colors.white.main} />
          </View>
          <View style={styles.resultCopy}>
            <Text style={styles.resultTitle}>QR code found</Text>
            <Text numberOfLines={2} style={styles.resultValue}>{value}</Text>
          </View>
        </View>
        <View style={styles.resultActions}>
          <View style={styles.resultAction}>
            <PxButton mode="outlined" color="primary" fullWidth onPress={onScanAgain}>
              Scan again
            </PxButton>
          </View>
          <View style={styles.resultAction}>
            <PxButton color="secondary" fullWidth onPress={onClose}>
              Done
            </PxButton>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black.main
  },
  camera: {
    ...StyleSheet.absoluteFill
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.black.main
  },
  permissionScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.cream.main
  },
  permissionIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.light
  },
  permissionTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h5,
    textAlign: "center"
  },
  permissionBody: {
    maxWidth: 330,
    marginBottom: spacing.sm,
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: 21,
    textAlign: "center"
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2
  },
  controlsSafeArea: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    zIndex: 4
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm
  },
  controlButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,0,0,0.48)"
  },
  scannerTitle: {
    color: colors.white.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  targetLayout: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3
  },
  target: {
    position: "relative",
    overflow: "hidden",
    borderRadius: scanTargetRadius
  },
  roundedTargetMask: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1
  },
  instructionWrap: {
    position: "absolute",
    right: spacing.lg,
    left: spacing.lg,
    alignItems: "center",
    zIndex: 3
  },
  instruction: {
    color: colors.white.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1,
    textAlign: "center"
  },
  instructionHint: {
    marginTop: spacing.xxs,
    color: "rgba(255,255,255,0.68)",
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption,
    textAlign: "center"
  },
  testDestinationWrap: {
    position: "absolute",
    right: spacing.lg,
    left: spacing.lg,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: radii.lg,
    backgroundColor: "rgba(0,0,0,0.68)",
    zIndex: 5
  },
  testDestinationInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.white.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2
  },
  testDestinationButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.main
  },
  testDestinationButtonDisabled: {
    opacity: 0.45
  },
  testDestinationButtonPressed: {
    opacity: 0.72
  },
  poweredBySafeArea: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 4
  },
  poweredByWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
    paddingBottom: spacing.xxl
  },
  poweredByText: {
    color: "rgba(255,255,255,0.68)",
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  corner: {
    position: "absolute",
    width: 42,
    height: 42,
    borderColor: colors.secondary.main
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: scanTargetRadius
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: scanTargetRadius
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: scanTargetRadius
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderBottomRightRadius: scanTargetRadius
  },
  scanLine: {
    position: "absolute",
    top: 0,
    right: spacing.xl,
    left: spacing.xl,
    height: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary.main,
    shadowColor: colors.secondary.main,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6
  },
  resultWrap: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 6,
    padding: spacing.md
  },
  resultCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  successIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.success.main
  },
  resultCopy: {
    flex: 1
  },
  resultTitle: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primarySemiBold,
    fontSize: fontSizes.subtitle1
  },
  resultValue: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.caption
  },
  resultActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  resultAction: {
    flex: 1
  }
});
