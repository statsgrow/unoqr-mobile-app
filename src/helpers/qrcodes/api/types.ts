import type { QrCode, QrSyncStatus } from "@/helpers/qrcodes/db/initQrCodes";

/* ------------------ BREAK ------------------ */

export type QrApiData = Omit<QrCode, "user_id" | "updated_at" | "sync_status" | "logo" | "type" | "content_type"> & {
  content_type: string;
  logo_device_path: string | null;
};

export type QrSyncConfirmation = { id: string; sync_status: "completed" };
export type QrDeleteConfirmation = { id: string; deleted: boolean };
export type QrRemoteRecord = QrApiData & { user_id: string | null; updated_at: string | null; sync_status: QrSyncStatus };
export type QrApiResponse<T> = { data?: T | null; message?: string };

// Limits API waits so failed download preparation can return control to the user.
export const QR_API_TIMEOUT = 15_000;
