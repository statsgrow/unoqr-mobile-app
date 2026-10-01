import { PxDialog } from "@/components/elements/PxDialog";
import { PhoneScan } from "@/helpers/scans/scanTypes/Phone";

/* ------------------ BREAK ------------------ */

type PhoneScanDialogProps = {
  value: string | null;
  onClose: () => void;
};

/* ------------------ BREAK ------------------ */

// Presents a saved phone QR with an explicit Call action.
export function PhoneScanDialog({ value, onClose }: PhoneScanDialogProps) {
  //Default Return
  return (
    <PxDialog open={Boolean(value)} setOpen={(open) => { if (!open) onClose(); }} title="Phone number scanned" subtitle="This phone number was saved to My Scans.">
      {value ? <PhoneScan key={value} value={value} /> : null}
    </PxDialog>
  );//return ends
};//export ends
