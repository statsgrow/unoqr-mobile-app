import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Device from "expo-device";
import {
  CameraView,
  scanFromURLAsync,
  useCameraPermissions,
  type BarcodeScanningResult
} from "expo-camera";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Mask, Rect } from "react-native-svg";

import { scannerBarcodeTypes } from "@/helpers/scans/Barcode";
import { BarcodeScanDialog, type BarcodeScanDetails } from "@/helpers/scans/dialogs/BarcodeScanDialog";
import { redirect } from "@/utils/general/Redirect";
import { UnoQrLogo } from "@/components/brand/UnoQrLogo";
import { PxButton } from "@/components/elements/PxButton";
import { PxDialog } from "@/components/elements/PxDialog";
import { PxPageLoader } from "@/components/elements/PxPageLoader";
import { selectImage, type ImagePickerFile } from "@/components/files/ImagePicker";
import {
  UpiPaymentDetailsDialog,
  type UpiPaymentDialogDetails
} from "@/helpers/scans/components/UpiPaymentDetailsDialog";
import { prepareScanLocation } from "@/helpers/scans/location";
import {
  prepareScannedValue,
  processPreparedScan,
  type PreparedScan
} from "@/helpers/scans/scanIdentifier";
import { TextScanDialog } from "@/helpers/scans/scanTypes/Text";
import { getUpiPaymentDetails } from "@/helpers/scans/scanTypes/UpiPayment";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ScannerOverlayProps = {
  targetSize: number;
  torchEnabled: boolean;
  scanComplete: boolean;
  imageSelectionDisabled: boolean;
  cameraDisabledForEmulator: boolean;
  showTestDestination: boolean;
  hasTestDestination: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSubmitTestDestination: () => void;
  onTestDestinationChange: (value: string) => void;
  onToggleTorch: () => void;
};

type RoundedTargetMaskProps = {
  screenWidth: number;
  screenHeight: number;
  targetSize: number;
};

type ScannerAlertState = {
  title: string;
  message?: string;
  guidance: string;
  color: "danger" | "warning";
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  actionLabel: string;
};

type ScannerAlertDialogProps = {
  alert: ScannerAlertState | null;
  onClose: () => void;
};

/* ------------------ BREAK ------------------ */

const scanTargetRadius = radii.xl + spacing.sm;
const testDestinationHeight = 50;
const instructionTopOffset = spacing.xxl + spacing.lg;

/* ------------------ BREAK ------------------ */

// Renders the full-screen camera scanner and manages QR detection states.
export default function ScanScreen() {
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanResult, setScanResult] = useState<PreparedScan | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSavingScan, setIsSavingScan] = useState(false);
  const [hasTestDestination, setHasTestDestination] = useState(false);
  const [textDialogValue, setTextDialogValue] = useState<string | null>(null);
  const [barcodeDialogDetails, setBarcodeDialogDetails] = useState<BarcodeScanDetails | null>(null);
  const [upiDialogDetails, setUpiDialogDetails] = useState<UpiPaymentDialogDetails | null>(null);
  const [scannerAlert, setScannerAlert] = useState<ScannerAlertState | null>(null);
  const scanLockRef = useRef(false);
  const testDestinationRef = useRef("");
  const targetSize = Math.min(340, Math.max(260, width - spacing.lg * 2));
  const showTestDestination = process.env.EXPO_PUBLIC_API_ENV === "development"
    && (Platform.OS === "android" || Platform.OS === "ios");
  const cameraDisabledForEmulator = showTestDestination && !Device.isDevice;

  // Unlocks camera scanning whenever the user returns from the completed browser flow.
  useFocusEffect(
    useCallback(() => {
      scanLockRef.current = false;
      setScanResult(null);
      setIsProcessingImage(false);
      setIsSavingScan(false);
      setTextDialogValue(null);
      setBarcodeDialogDetails(null);
      setUpiDialogDetails(null);
      setScannerAlert(null);

      if (Platform.OS === "android" || Platform.OS === "ios") {
        void prepareScanLocation();
      };//if ends
    }, [])
  );

  // Closes the scanner and returns to the previous app screen.
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    };//if ends

    redirect("replace", "/");
  };//func ends

  // Locks the scanner after receiving the first valid destination value.
  const handleScannedValue = (value: string, format?: string | number) => {
    const preparedScan = prepareScannedValue(value, format);

    //If scan is set or the scanned value is empty, return
    if (scanLockRef.current || !preparedScan) return;

    console.log("Scanned value:", preparedScan.value);
  
    //Lock repeated camera callbacks and process the destination once.
    scanLockRef.current = true;
    setScanResult(preparedScan);
    setIsSavingScan(true);
    void processPreparedScan(preparedScan)
      .then(({ scanId, textValue }) => {
        setIsSavingScan(false);

        if (!scanId) {
          scanLockRef.current = false;
          setScanResult(null);
          setScannerAlert({
            title: "Unable to save scan",
            message: "The scan could not be saved on this device.",
            guidance: "Check the app storage and try scanning again.",
            color: "danger",
            icon: "database-alert-outline",
            actionLabel: "Try again"
          });
          return;
        };//if ends

        if (textValue) setTextDialogValue(textValue);

        // Show the barcode result only after its local scan row has been saved.
        if (preparedScan.type === "barcode") {
          setBarcodeDialogDetails({ id: scanId, kind: preparedScan.kind, value: preparedScan.value });
        };//if ends

        if (preparedScan.type === "upi_payment") {
          const paymentDetails = getUpiPaymentDetails(preparedScan.value);
          if (paymentDetails) {
            setUpiDialogDetails({
              payeeName: paymentDetails.payeeName,
              payeeVpa: paymentDetails.payeeVpa
            });
          };//if ends
        };//if ends
      })
      .catch((error: unknown) => {
        console.info("Unable to process scanned destination:", error);
        scanLockRef.current = false;
        setScanResult(null);
        setIsSavingScan(false);
        setScannerAlert({
          title: "Unable to open scan",
          message: "The scan was saved, but no compatible app could open this destination.",
          guidance: "Check that an appropriate app is installed, then try again.",
          color: "danger",
          icon: "open-in-new",
          actionLabel: "Close"
        });
      });
  };//func ends

  // Closes the text dialog and unlocks the camera for another scan.
  const handleTextDialogClose = () => {
    setTextDialogValue(null);
    setScanResult(null);
    scanLockRef.current = false;
  };//func ends

  // Closes the UPI details dialog and unlocks the camera for another scan.
  const handleUpiDialogClose = () => {
    setUpiDialogDetails(null);
    setScanResult(null);
    scanLockRef.current = false;
  };//func ends

  // Close the barcode result and unlock scanning for the next code.
  const handleBarcodeDialogClose = (): void => {
    setBarcodeDialogDetails(null);
    setScanResult(null);
    scanLockRef.current = false;
  };//func ends

  // Passes a detected camera barcode into the shared destination flow.
  const handleBarcodeScanned = ({ data, type }: BarcodeScanningResult) => {
    handleScannedValue(data, type);
  };//func ends

  // Stores development test input without re-rendering the camera overlay for every character.
  const handleTestDestinationChange = (value: string) => {
    testDestinationRef.current = value;
    const hasValue = Boolean(value.trim());
    setHasTestDestination((currentValue) => currentValue === hasValue ? currentValue : hasValue);
  };//func ends

  // Reads the detected value and format from a gallery image into the scan flow.
  const handleImageSelection = async () => {
    if (scanLockRef.current || isProcessingImage) return;

    setIsProcessingImage(true);

    try {
      const value = await processBarcodeFromImage(setScannerAlert);
      if (value) handleScannedValue(value.data, value.type);
    } finally {
      setIsProcessingImage(false);
    };//try-finally ends
  };//func ends

  if (!permission && !cameraDisabledForEmulator) {
    //Default Return
    return <View style={styles.loadingScreen} />;
  };//if ends

  if (!permission?.granted && !cameraDisabledForEmulator) {
    //Default Return
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <StatusBar style="dark" />
        <View style={styles.permissionIcon}>
          <MaterialCommunityIcons name="camera-outline" size={38} color={colors.secondary.main} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Uno QR uses your camera only while this screen is open to detect QR codes and barcodes.
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
      {cameraDisabledForEmulator ? (
        <View style={styles.emulatorCameraBackground} />
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torchEnabled}
          barcodeScannerSettings={{ barcodeTypes: scannerBarcodeTypes }}
          onBarcodeScanned={scanResult ? undefined : handleBarcodeScanned}
        />
      )}

      <ScannerOverlay
        targetSize={targetSize}
        torchEnabled={torchEnabled}
        scanComplete={Boolean(scanResult)}
        imageSelectionDisabled={Boolean(scanResult) || isProcessingImage}
        cameraDisabledForEmulator={cameraDisabledForEmulator}
        showTestDestination={showTestDestination}
        hasTestDestination={hasTestDestination}
        onClose={handleClose}
        onSelectImage={() => void handleImageSelection()}
        onSubmitTestDestination={() => handleScannedValue(testDestinationRef.current)}
        onTestDestinationChange={handleTestDestinationChange}
        onToggleTorch={() => setTorchEnabled((currentValue) => !currentValue)}
      />

      <PxPageLoader
        visible={isSavingScan}
        title="Saving your scan"
        description="We’re securely saving this scan to My Scans."
      />

      <TextScanDialog
        value={textDialogValue}
        onClose={handleTextDialogClose}
      />

      <UpiPaymentDetailsDialog
        details={scanResult?.type === "upi_payment" ? upiDialogDetails : null}
        onClose={handleUpiDialogClose}
      />

      <ScannerAlertDialog
        alert={scannerAlert}
        onClose={() => setScannerAlert(null)}
      />

      <BarcodeScanDialog details={barcodeDialogDetails} onClose={handleBarcodeDialogClose} />

    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Opens the gallery and returns a decoded QR code or barcode.
async function processBarcodeFromImage(showAlert: (alert: ScannerAlertState) => void): Promise<BarcodeScanningResult | null> {
  try {
    const selectedImage = await selectImage();
    if (!selectedImage) return null;

    const value = await getBarcodeFromImage(selectedImage);

    if (!value) {
      showAlert({
        title: Platform.OS === "ios" ? "No QR code found" : "No code found",
        message: Platform.OS === "ios" ? "UnoQR could not detect a QR code in the selected image." : "UnoQR could not detect a QR code or barcode in the selected image.",
        guidance: Platform.OS === "ios" ? "Choose a clear image with the complete QR code visible. Use the camera for barcodes." : "Choose a clear, uncropped image with the complete code visible.",
        color: "warning",
        icon: "qrcode-scan",
        actionLabel: "Choose another"
      });
    };//if ends

    return value;
  } catch (error: unknown) {
    console.info("Unable to scan QR code from image:", error);
    showAlert({
      title: "Unable to read image",
      message: "The selected image could not be processed.",
      guidance: "Try another JPG or PNG image containing a clear QR code.",
      color: "danger",
      icon: "image-broken-variant",
      actionLabel: "Close"
    });
    return null;
  };//try-catch ends
};//func ends

// Decodes an image barcode while respecting the native iOS QR-only image decoder.
async function getBarcodeFromImage(imageData: ImagePickerFile): Promise<BarcodeScanningResult | null> {
  const codes = await scanFromURLAsync(imageData.uri, Platform.OS === "ios" ? ["qr"] : scannerBarcodeTypes);
  return codes.find((code) => code.data.trim()) ?? null;
};//func ends

/* ------------------ BREAK ------------------ */

// Presents scanner failures with the shared themed dialog and a clear recovery action.
function ScannerAlertDialog({ alert, onClose }: ScannerAlertDialogProps) {
  const isWarning = alert?.color === "warning";
  const accentColor = isWarning ? colors.warning.main : colors.error.main;
  const accentBackground = isWarning ? `${colors.warning.main}1A` : `${colors.error.main}1A`;

  //Default Return
  return (
    <PxDialog
      open={Boolean(alert)}
      setOpen={(open) => {
        if (!open) onClose();
      }}
      title={alert?.title}
      subtitle={alert?.message}
      color={alert?.color}
    >
      {alert ? (
        <>
          <View style={styles.alertGuidanceRow}>
            <View style={[styles.alertIconShell, { backgroundColor: accentBackground }]}>
              <MaterialCommunityIcons name={alert.icon} size={24} color={accentColor} />
            </View>
            <Text style={styles.alertGuidance}>{alert.guidance}</Text>
          </View>
          <PxButton
            fullWidth
            color={isWarning ? "warning" : "error"}
            startIcon="check"
            onPress={onClose}
          >
            {alert.actionLabel}
          </PxButton>
        </>
      ) : null}
    </PxDialog>
  );//return ends
};//func ends

/* ------------------ BREAK ------------------ */

// Draws the camera controls, dimmed mask, and animated QR targeting frame.
function ScannerOverlay({
  targetSize,
  torchEnabled,
  scanComplete,
  imageSelectionDisabled,
  cameraDisabledForEmulator,
  showTestDestination,
  hasTestDestination,
  onClose,
  onSelectImage,
  onSubmitTestDestination,
  onTestDestinationChange,
  onToggleTorch
}: ScannerOverlayProps) {
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const scanLineProgress = useRef(new Animated.Value(0)).current;
  const screenWidth = overlaySize.width;
  const screenHeight = overlaySize.height;
  const targetTop = screenHeight / 2 - targetSize / 2;

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
              {
                top: targetTop - instructionTopOffset - testDestinationHeight - spacing.sm
              }
            ]}
          >
            <TextInput
              accessibilityLabel="Test destination URL"
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
              disabled={!hasTestDestination}
              onPress={onSubmitTestDestination}
              style={({ pressed }) => [
                styles.testDestinationButton,
                !hasTestDestination && styles.testDestinationButtonDisabled,
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
            { top: targetTop - instructionTopOffset }
          ]}
        >
          <Text style={styles.instruction}>
            {cameraDisabledForEmulator ? "Emulator camera paused" : "Align the QR code inside the frame"}
          </Text>
          <Text style={styles.instructionHint}>
            {cameraDisabledForEmulator
              ? "Paste a test value or choose a QR image"
              : "Scanning happens automatically"}
          </Text>
        </View>
      </View>

      <SafeAreaView pointerEvents="box-none" edges={["bottom"]} style={styles.poweredBySafeArea}>
        <View style={styles.poweredByWrap}>
          <IconButton
            accessibilityLabel="Scan QR code from image"
            disabled={imageSelectionDisabled}
            icon="image-outline"
            iconColor={colors.white.main}
            size={26}
            onPress={onSelectImage}
            style={styles.imagePickerButton}
          />
          <View pointerEvents="none" style={styles.poweredByBrand}>
            <Text style={styles.poweredByText}>Powered by</Text>
            <UnoQrLogo width={72} color={colors.white.main} />
          </View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black.main
  },
  camera: {
    ...StyleSheet.absoluteFill
  },
  emulatorCameraBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.black.main
  },
  alertGuidanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radii.lg,
    backgroundColor: colors.cream.main
  },
  alertIconShell: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill
  },
  alertGuidance: {
    minWidth: 0,
    flex: 1,
    color: colors.primary.light,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    lineHeight: 20
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
    minHeight: testDestinationHeight,
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
    gap: spacing.md,
    paddingBottom: spacing.xxl
  },
  imagePickerButton: {
    width: 52,
    height: 52,
    margin: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,0,0,0.52)"
  },
  poweredByBrand: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs
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
  }
});
