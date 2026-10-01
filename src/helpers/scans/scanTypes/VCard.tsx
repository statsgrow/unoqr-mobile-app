import { useEffect, useRef, useState } from "react";
import { File, Paths } from "expo-file-system";
import { ContactRound, Download } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { PxButton } from "@/components/elements/PxButton";
import { fileDownload } from "@/components/files/FileDownload";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type VCardScanProps = {
  value: string;
  createdAt?: string;
};

type VCardDownloadState = {
  downloading: boolean;
  downloadMessage: string | null;
  handleDownload: () => Promise<void>;
};

type VCardDetailsProps = VCardScanProps & VCardDownloadState;

type ContactField = { label: string; value: string };

/* ------------------ BREAK ------------------ */

// Shows a saved vCard with its download action in My Scans.
export function VCardScan({ value, createdAt }: VCardScanProps) {
  const download = useVCardDownload(value);

  //Default Return
  return <VCardDetails value={value} createdAt={createdAt} {...download} />;
};//export ends

// Keeps download state outside native modals so it survives their dismissal.
export function useVCardDownload(value: string, beforeDownload?: () => Promise<void>, afterDownload?: () => void): VCardDownloadState {
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const downloadLock = useRef(false);

  // Clears the previous contact's download result when a new scan is shown.
  useEffect(() => {
    setDownloadMessage(null);
  }, [value]);

  // Saves the original payload after any result dialog has finished dismissing.
  const handleDownload = async (): Promise<void> => {
    if (downloadLock.current) return;
    downloadLock.current = true;
    setDownloading(true);
    setDownloadMessage(null);
    let file: File | null = null;
    try {
      await beforeDownload?.();
      const fileName = `unoqr-contact-${Date.now()}.vcf`;
      file = new File(Paths.cache, fileName);
      file.create();
      file.write(value);
      const saved = await fileDownload({ uri: file.uri, fileName, mimeType: "text/vcard" });
      if (saved) setDownloadMessage(`Contact saved to ${saved.location}.`);
    } catch (error: unknown) {
      setDownloadMessage(error instanceof Error ? error.message : "Unable to download this contact. Please try again.");
    } finally {
      if (file?.exists) file.delete();
      downloadLock.current = false;
      setDownloading(false);
      afterDownload?.();
    };//try-catch ends
  };//func ends

  return { downloading, downloadMessage, handleDownload };
};//export ends

// Renders readable contact fields and the primary download action.
export function VCardDetails({ value, createdAt, downloading, downloadMessage, handleDownload }: VCardDetailsProps) {
  const fields = getVCardFields(value);

  //Default Return
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.heading}>
          <ContactRound size={28} strokeWidth={1.25} color={colors.neutral.main} />
          <Text style={styles.title}>vCard contact</Text>
        </View>
        {createdAt ? <Text style={styles.label}>{new Date(createdAt).toLocaleString()}</Text> : null}
        {fields.map((field, index) => (
          <View key={`${field.label}-${index}`} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>
            <Text selectable style={styles.value}>{field.value}</Text>
          </View>
        ))}
        {fields.length === 0 ? <Text style={styles.label}>Download this contact to view it in a contacts app.</Text> : null}
      </View>
      <PxButton fullWidth color="secondary" loading={downloading} disabled={downloading} icon={({ color, size }) => <Download color={color} size={size} strokeWidth={1.25} />} onPress={() => void handleDownload()}>
        Download contact
      </PxButton>
      {downloadMessage ? <Text accessibilityLiveRegion="polite" style={styles.label}>{downloadMessage}</Text> : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

// Unfolds vCard lines and displays common contact properties without changing the download.
function getVCardFields(value: string): ContactField[] {
  const labels: Record<string, string> = { FN: "Name", ORG: "Organization", TITLE: "Job title", TEL: "Phone", EMAIL: "Email", URL: "Website", ADR: "Address", NOTE: "Notes", VERSION: "Version" };
  const lines = value.replace(/\r?\n[ \t]/g, "").split(/\r\n|\n|\r/);
  const fields: ContactField[] = [];
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const property = line.slice(0, separator).split(";")[0].split(".").at(-1)?.toUpperCase() || "";
    const label = labels[property];
    if (!label) continue;
    const text = line.slice(separator + 1).replace(/\\([nN,;\\])|;/g, (match: string, escaped: string | undefined): string => escaped ? /n/i.test(escaped) ? "\n" : escaped : ", ").trim();
    if (text) fields.push({ label, value: text });
  };//for ends
  return fields;
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border.main, borderRadius: radii.lg, backgroundColor: colors.white.main },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: fontFamilies.primarySemiBold, fontSize: fontSizes.subtitle1, color: colors.primary.main },
  field: { gap: spacing.xxs },
  label: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.caption, color: colors.mute.main },
  value: { fontFamily: fontFamilies.primaryRegular, fontSize: fontSizes.body2, color: colors.primary.main }
});
