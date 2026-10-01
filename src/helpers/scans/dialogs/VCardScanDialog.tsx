import { useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet } from "react-native";

import { PxDialog } from "@/components/elements/PxDialog";
import { VCardDetails, useVCardDownload } from "@/helpers/scans/scanTypes/VCard";
import { spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type VCardScanDialogProps = {
  value: string | null;
  onClose: () => void;
};

/* ------------------ BREAK ------------------ */

// Presents a saved vCard scan and dismisses its native dialog before opening Files.
export function VCardScanDialog({ value, onClose }: VCardScanDialogProps) {
  const [hiddenForDownload, setHiddenForDownload] = useState(false);
  const dismissResolver = useRef<(() => void) | null>(null);

  // Waits for iOS modal dismissal so the system picker can present successfully.
  const beforeDownload = (): Promise<void> => {
    if (Platform.OS !== "ios") return Promise.resolve();
    return new Promise<void>((resolve) => {
      dismissResolver.current = resolve;
      setHiddenForDownload(true);
    });
  };//func ends

  // Continues the download once iOS has dismissed the result dialog.
  const handleDismiss = (): void => {
    dismissResolver.current?.();
    dismissResolver.current = null;
  };//func ends

  const download = useVCardDownload(value || "", beforeDownload, () => setHiddenForDownload(false));

  //Default Return
  return (
    <PxDialog open={Boolean(value) && !hiddenForDownload} setOpen={(open) => { if (!open) onClose(); }} onDismiss={handleDismiss} title="vCard scanned" subtitle="This contact was saved to My Scans.">
      {value ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <VCardDetails value={value} {...download} />
        </ScrollView>
      ) : null}
    </PxDialog>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  scroll: { maxHeight: 440 },
  content: { paddingBottom: spacing.xs }
});
