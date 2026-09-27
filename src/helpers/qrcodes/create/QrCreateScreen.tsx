import { useEffect, useRef, useState, type ReactNode } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { ArrowLeft, ChevronRight, ExternalLink, Eye, FileCode2, FileImage, FileText, Grip, ImagePlus, Palette, Pencil, Plus, QrCode, VectorSquare } from "lucide-react-native";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useForm } from "react-hook-form";
import Svg, { SvgXml } from "react-native-svg";
import * as yup from "yup";

import { PxModal } from "@/components/elements/PxModal";
import { fileDownload, openDownloadedFile, type DownloadedFile } from "@/components/files/FileDownload";
import { describeQrContent, type QrContentData, type QrContentSelection, type QrContentType } from "@/helpers/qrcodes/create/QrContent";
import ColorDialog from "@/helpers/qrcodes/create/dialogs/ColorDialog";
import ContentDialog from "@/helpers/qrcodes/create/dialogs/ContentDialog";
import DotDialog from "@/helpers/qrcodes/create/dialogs/DotDialog";
import EyeDialog from "@/helpers/qrcodes/create/dialogs/EyeDialog";
import FrameDialog from "@/helpers/qrcodes/create/dialogs/FrameDialog";
import LogoDialog from "@/helpers/qrcodes/create/dialogs/LogoDialog";
import { createQrFile, createQrSvg, type QrCreateFormValues, type QrExportFormat } from "@/helpers/qrcodes/create/QrCreate";
import QrQuality, { checkContentLength, MAX_QR_CHARACTERS } from "@/helpers/qrcodes/create/QrQuality";
import type { QrUserLogo } from "@/helpers/qrcodes/modify/logo";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type ExportRowProps = {
  label: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
  disabled: boolean;
};

/* ------------------ BREAK ------------------ */

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const OPTIONAL_HEX_COLOR = /^(|#[0-9A-Fa-f]{6})$/;
const QR_SCHEMA: yup.ObjectSchema<QrCreateFormValues> = yup.object({
  content: yup.string().trim().required("Enter QR content.").test("character-limit", "Use 500 characters or fewer.", (value) => checkContentLength(value || "").length <= MAX_QR_CHARACTERS),
  content_type: yup.mixed<QrContentType>().oneOf(["website", "vcard", "phone", "text"]).nullable().defined(),
  content_data: yup.mixed<QrContentData>().nullable().defined(),
  size: yup.number().integer().min(0).required(),
  type: yup.mixed<"static">().oneOf(["static"]).required(),
  dot: yup.object({
    type: yup.mixed<QrCreateFormValues["dot"]["type"]>().oneOf(["square", "rounded", "dots", "classy", "connected"]).required(),
    color: yup.string().matches(OPTIONAL_HEX_COLOR).defined()
  }).required(),
  eye: yup.object({
    type: yup.mixed<QrCreateFormValues["eye"]["type"]>().oneOf(["square", "rounded", "circle", "leaf", "frame"]).required(),
    color: yup.string().matches(OPTIONAL_HEX_COLOR).defined()
  }).required(),
  frame: yup.object({
    type: yup.mixed<QrCreateFormValues["frame"]["type"]>().oneOf(["squircle", "round", "square", "none"]).required(),
    color: yup.string().matches(OPTIONAL_HEX_COLOR).defined()
  }).required(),
  logo: yup.mixed<QrUserLogo>().nullable().defined(),
  bg_color: yup.string().matches(HEX_COLOR).required(),
  fg_color: yup.string().matches(HEX_COLOR).required()
});

const QR_DEFAULTS: QrCreateFormValues = {
  content: "",
  content_type: null,
  content_data: null,
  size: 0,
  type: "static",
  dot: { type: "square", color: "" },
  eye: { type: "square", color: "" },
  frame: { type: "squircle", color: colors.secondary.main },
  logo: null,
  bg_color: colors.white.main,
  fg_color: colors.primary.main
};

/* ------------------ BREAK ------------------ */

// Shows a QR preview with eye, dot, and frame styling plus a download format picker.
export default function CreateQrScreen() {
  const form = useForm<QrCreateFormValues>({ defaultValues: QR_DEFAULTS, resolver: yupResolver(QR_SCHEMA), mode: "onChange" });
  const settings = form.watch();
  const { content, content_type, content_data, dot, eye, frame, logo, bg_color, fg_color } = settings;
  const contentSelection: QrContentSelection | null = content_type && content_data ? { type: content_type, data: content_data } : null;
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [renderedKey, setRenderedKey] = useState("");
  const [settledSettings, setSettledSettings] = useState<QrCreateFormValues>(QR_DEFAULTS);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadedFile, setDownloadedFile] = useState<DownloadedFile | null>(null);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [isEyeDialogOpen, setIsEyeDialogOpen] = useState(false);
  const [isDotDialogOpen, setIsDotDialogOpen] = useState(false);
  const [isFrameDialogOpen, setIsFrameDialogOpen] = useState(false);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const svgRef = useRef<Svg | null>(null);
  const generationRef = useRef(0);
  const previewKey = getQrPreviewKey(settings);
  const hasValue = checkContentLength(content).canCreate && form.formState.isValid;

  // Keeps the download footer clear of the modal keyboard.
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Renders the latest submitted content or style change and discards older results.
  function updateQrPreview() {
    const current = form.getValues();
    const next: QrCreateFormValues = {
      ...current,
      dot: { ...current.dot },
      eye: { ...current.eye },
      frame: { ...current.frame },
      logo: current.logo ? { ...current.logo } : null
    };
    const nextKey = getQrPreviewKey(next);
    const generation = ++generationRef.current;
    setSettledSettings(next);
    setQrSvg(null);
    setPreviewError(null);
    setRenderedKey("");

    if (!checkContentLength(next.content).canCreate) return;

    void createQrSvg(next).then((svg) => {
      if (generationRef.current !== generation) return;
      setQrSvg(svg);
      setRenderedKey(nextKey);
    }).catch((error: unknown) => {
      if (generationRef.current !== generation) return;
      console.error("Unable to generate QR preview:", error);
      setPreviewError("This content is too dense for a QR code. Shorten it and try again.");
    });
  };//func ends

  // Applies a form change and regenerates its preview immediately.
  function updateQrSetting(change: () => void) {
    change();
    updateQrPreview();
  };//func ends

  // Saves the selected format from the same SVG used for the preview.
  const handleDownload = async (format: QrExportFormat): Promise<void> => {
    if (!qrSvg || renderedKey !== previewKey || isDownloading) return;
    setIsDownloadModalOpen(false);
    setIsDownloading(true);

    try {
      const file = await createQrFile(qrSvg, format, svgRef.current);
      const saved = await fileDownload({
        ...file,
        fileName: `unoqr-${Date.now()}.${format === "jpeg" ? "jpg" : format}`
      });
      if (saved) setDownloadedFile(saved);
    } catch (error: unknown) {
      console.error("Unable to download QR code:", error);
      Alert.alert("Download failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsDownloading(false);
    };//try-catch ends
  };//func ends

  // Opens the saved file through the platform's available system file actions.
  const handleOpenDownloadedFile = async (): Promise<void> => {
    if (!downloadedFile || isOpeningFile) return;
    setIsOpeningFile(true);
    try {
      await openDownloadedFile(downloadedFile);
    } catch (error: unknown) {
      console.error("Unable to open downloaded file:", error);
      Alert.alert("Cannot open file", error instanceof Error ? error.message : "No compatible app is available to open this file.");
    } finally {
      setIsOpeningFile(false);
    };//try-catch ends
  };//func ends

  // Saves structured content and refreshes its QR without a typing delay.
  function handleContentSave(selection: QrContentSelection, encoded: string) {
    form.setValue("content_type", selection.type, { shouldValidate: true });
    form.setValue("content_data", selection.data, { shouldValidate: true });
    form.setValue("content", encoded, { shouldValidate: true });
    form.setValue("size", Array.from(encoded).length, { shouldValidate: true });
    updateQrPreview();
  };//func ends

  //Default Return
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to More"
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={colors.primary.main} size={25} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.headerTitle}>Create QR code</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.lg + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewArea}>
          {qrSvg ? (
            <View style={styles.qrFrame}>
              <SvgXml xml={qrSvg} override={{ ref: svgRef, width: "100%", height: "100%" }} />
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <QrCode color={colors.mute.light} size={88} strokeWidth={1.15} />
              <Text style={styles.emptyPreviewText}>{previewError || "Add content to preview your QR"}</Text>
            </View>
          )}
        </View>

        <QrQuality
          content={settledSettings.content}
          backgroundColor={settledSettings.bg_color}
          foregroundColor={settledSettings.fg_color}
          dotColor={settledSettings.dot.color}
          eyeColor={settledSettings.eye.color}
        />

        {contentSelection && content ? (
          <Pressable accessibilityLabel="Edit QR content" accessibilityRole="button" onPress={() => setIsContentDialogOpen(true)} style={styles.inputCard}>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>{content_type === "vcard" ? "vCard" : content_type === "website" ? "Website" : content_type === "phone" ? "Phone" : "Text"}</Text>
              <Text numberOfLines={2} style={styles.inputValue}>{describeQrContent(contentSelection)}</Text>
            </View>
            <Pencil color={colors.mute.main} size={20} strokeWidth={1.75} />
          </Pressable>
        ) : (
          <Pressable accessibilityLabel="Add QR content" accessibilityRole="button" onPress={() => setIsContentDialogOpen(true)} style={styles.addContentButton}>
            <Plus color={colors.secondary.main} size={22} strokeWidth={1.75} />
            <Text style={styles.addContentText}>Add Content</Text>
          </Pressable>
        )}

        <View style={styles.tools}>
          <Pressable accessibilityLabel="Customize QR colors" accessibilityRole="button" onPress={() => setIsColorDialogOpen(true)} style={styles.tool}>
            <Palette color={colors.primary.main} size={25} strokeWidth={1.7} />
            <Text style={styles.toolLabel}>Color</Text>
          </Pressable>
          <Pressable accessibilityLabel="Customize QR eyes" accessibilityRole="button" onPress={() => setIsEyeDialogOpen(true)} style={styles.tool}>
            <Eye color={colors.primary.main} size={25} strokeWidth={1.7} />
            <Text style={styles.toolLabel}>Eye</Text>
          </Pressable>
          <Pressable accessibilityLabel="Customize QR frame" accessibilityRole="button" onPress={() => setIsFrameDialogOpen(true)} style={styles.tool}>
            <VectorSquare color={colors.primary.main} size={25} strokeWidth={1.25} />
            <Text style={styles.toolLabel}>Frame</Text>
          </Pressable>
          <Pressable accessibilityLabel="Customize QR dots" accessibilityRole="button" onPress={() => setIsDotDialogOpen(true)} style={styles.tool}>
            <Grip color={colors.primary.main} size={25} strokeWidth={1.25} />
            <Text style={styles.toolLabel}>Dot</Text>
          </Pressable>
          <Pressable accessibilityLabel="Add center logo" accessibilityRole="button" onPress={() => setIsLogoDialogOpen(true)} style={styles.tool}>
            <ImagePlus color={colors.primary.main} size={25} strokeWidth={1.7} />
            <Text style={styles.toolLabel}>Logo</Text>
          </Pressable>
        </View>
      </ScrollView>

      {keyboardHeight === 0 ? <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasValue || !qrSvg || renderedKey !== previewKey || isDownloading }}
          disabled={!hasValue || !qrSvg || renderedKey !== previewKey || isDownloading}
          onPress={() => setIsDownloadModalOpen(true)}
          style={[styles.downloadButton, (!hasValue || !qrSvg || renderedKey !== previewKey || isDownloading) && styles.downloadButtonDisabled]}
        >
          <Text style={styles.downloadText}>{isDownloading ? "Saving..." : "Download QR"}</Text>
        </Pressable>
      </View> : null}

      <PxModal
        visible={isDownloadModalOpen}
        onRequestClose={() => setIsDownloadModalOpen(false)}
        name="Download QR"
        height="auto"
        maxHeight={500}
      >
        <View style={styles.exportOptions}>
          <ExportRow label="SVG" description="Scalable vector file" icon={<FileCode2 color={colors.secondary.main} size={24} />} disabled={isDownloading} onPress={() => void handleDownload("svg")} />
          <ExportRow label="PNG" description="High-resolution image" icon={<FileImage color={colors.secondary.main} size={24} />} disabled={isDownloading} onPress={() => void handleDownload("png")} />
          <ExportRow label="JPEG" description="Standard image file" icon={<FileImage color={colors.secondary.main} size={24} />} disabled={isDownloading} onPress={() => void handleDownload("jpeg")} />
          <ExportRow label="PDF" description="Ready for printing" icon={<FileText color={colors.secondary.main} size={24} />} disabled={isDownloading} onPress={() => void handleDownload("pdf")} />
        </View>
      </PxModal>

      <PxModal
        visible={downloadedFile !== null}
        onRequestClose={() => setDownloadedFile(null)}
        name="Download complete"
        height="auto"
        maxHeight={300}
        footer={downloadedFile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isOpeningFile }}
            disabled={isOpeningFile}
            onPress={() => void handleOpenDownloadedFile()}
            style={styles.openFileButton}
          >
            <ExternalLink color={colors.white.main} size={20} strokeWidth={1.8} />
            <Text style={styles.openFileText}>Open file</Text>
          </Pressable>
        ) : undefined}
      >
        <View style={styles.downloadComplete}>
          <Text style={styles.downloadCompleteName}>{downloadedFile?.fileName}</Text>
          <Text style={styles.downloadCompleteLocation}>
            {downloadedFile?.location === "Downloads"
              ? "Saved to Downloads on this phone."
              : "Saved to the Files folder you selected."}
          </Text>
        </View>
      </PxModal>

      <EyeDialog
        visible={isEyeDialogOpen}
        onClose={() => setIsEyeDialogOpen(false)}
        eyeStyle={eye.type}
        eyeColor={eye.color || fg_color}
        onChangeStyle={(type) => updateQrSetting(() => form.setValue("eye.type", type, { shouldValidate: true }))}
        onChangeColor={(color) => updateQrSetting(() => form.setValue("eye.color", color, { shouldValidate: true }))}
      />

      <DotDialog
        visible={isDotDialogOpen}
        onClose={() => setIsDotDialogOpen(false)}
        dotStyle={dot.type}
        dotColor={dot.color || fg_color}
        onChangeStyle={(type) => updateQrSetting(() => form.setValue("dot.type", type, { shouldValidate: true }))}
        onChangeColor={(color) => updateQrSetting(() => form.setValue("dot.color", color, { shouldValidate: true }))}
      />

      <FrameDialog
        visible={isFrameDialogOpen}
        onClose={() => setIsFrameDialogOpen(false)}
        frameStyle={frame.type}
        frameColor={frame.color || fg_color}
        onChangeStyle={(type) => updateQrSetting(() => form.setValue("frame.type", type, { shouldValidate: true }))}
        onChangeColor={(color) => updateQrSetting(() => form.setValue("frame.color", color, { shouldValidate: true }))}
      />

      <ColorDialog
        visible={isColorDialogOpen}
        onClose={() => setIsColorDialogOpen(false)}
        foregroundColor={fg_color}
        backgroundColor={bg_color}
        onChangeForeground={(color) => updateQrSetting(() => form.setValue("fg_color", color, { shouldValidate: true }))}
        onChangeBackground={(color) => updateQrSetting(() => form.setValue("bg_color", color, { shouldValidate: true }))}
      />

      <LogoDialog
        visible={isLogoDialogOpen}
        onClose={() => setIsLogoDialogOpen(false)}
        logo={logo}
        onChangeLogo={(nextLogo) => updateQrSetting(() => form.setValue("logo", nextLogo, { shouldValidate: true }))}
      />

      <ContentDialog
        visible={isContentDialogOpen}
        onClose={() => setIsContentDialogOpen(false)}
        selection={contentSelection}
        onSave={handleContentSave}
      />
    </KeyboardAvoidingView>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Renders one selectable download format inside the bottom sheet.
function ExportRow({ label, description, icon, onPress, disabled }: ExportRowProps) {
  //Default Return
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.exportRow}
    >
      <View style={styles.exportIcon}>{icon}</View>
      <View style={styles.exportCopy}>
        <Text style={styles.exportLabel}>{label}</Text>
        <Text style={styles.exportDescription}>{description}</Text>
      </View>
      <ChevronRight color={colors.mute.main} size={21} strokeWidth={1.75} />
    </Pressable>
  );//return ends
};//func ends

// Identifies the QR payload and visual settings without serializing logo image data.
function getQrPreviewKey(settings: QrCreateFormValues): string {
  return JSON.stringify([
    settings.content,
    settings.dot.type, settings.dot.color,
    settings.eye.type, settings.eye.color,
    settings.frame.type, settings.frame.color,
    settings.logo?.uri,
    settings.bg_color, settings.fg_color
  ]);
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream.main },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
    backgroundColor: colors.white.main
  },
  backButton: { width: 32, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.primary.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.h6 },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg
  },
  previewArea: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center"
  },
  qrFrame: {
    width: 264,
    height: 264
  },
  emptyPreview: { alignItems: "center", gap: spacing.md },
  emptyPreviewText: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2,
    textAlign: "center"
  },
  inputCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md + 5,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  inputContent: { flex: 1, gap: spacing.xxs },
  inputLabel: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  inputValue: { color: colors.primary.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body1 },
  addContentButton: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.xl,
    backgroundColor: colors.white.main
  },
  addContentText: { color: colors.secondary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tool: {
    width: "22.5%",
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  toolLabel: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.main,
    backgroundColor: colors.white.main
  },
  downloadButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.main
  },
  downloadButtonDisabled: { opacity: 0.45 },
  downloadText: { color: colors.white.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.body1 },
  exportOptions: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  exportRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.lg,
    backgroundColor: colors.white.main
  },
  exportIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.light
  },
  exportCopy: { flex: 1, gap: spacing.xxs },
  exportLabel: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  exportDescription: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption },
  downloadComplete: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  downloadCompleteName: { color: colors.primary.main, fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.body1 },
  downloadCompleteLocation: { color: colors.mute.main, fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2 },
  openFileButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.secondary.main
  },
  openFileText: { color: colors.white.main, fontFamily: fontFamilies.primaryBold, fontSize: fontSizes.body1 }
});
