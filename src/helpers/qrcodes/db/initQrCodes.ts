import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { QrCreateFormValues } from "@/helpers/qrcodes/create/QrCreate";
import { db, sqliteDB } from "@/utils/sqlite/db";

/* ------------------ BREAK ------------------ */

export type QrDownloadType = "svg" | "png" | "jpg" | "pdf";
export type QrSyncStatus = "pending" | "completed";

export type InsertQrInput = QrCreateFormValues & {
  id: string;
  created_at: string;
  updated_at?: string | null;
  user_id?: string | null;
  sync_status?: QrSyncStatus;
  last_download_type?: QrDownloadType | null;
  last_download_at?: string | null;
};

/* ------------------ BREAK ------------------ */

// Defines the saved QR form fields, storing nested values as JSON and the logo flag as a boolean.
export const qrCodesTable = sqliteTable("static_qrcodes", {
  id: text("id").primaryKey(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at"),
  user_id: text("user_id"),
  sync_status: text("sync_status").$type<QrSyncStatus>().notNull().default("pending"),
  last_download_type: text("last_download_type").$type<QrDownloadType>(),
  last_download_at: text("last_download_at"),
  name: text("name").notNull(),
  hide_logo: integer("hide_logo", { mode: "boolean" }).notNull().default(false),
  content: text("content").notNull(),
  content_type: text("content_type").$type<QrCreateFormValues["content_type"]>(),
  content_data: text("content_data", { mode: "json" }).$type<QrCreateFormValues["content_data"]>(),
  size: integer("size").notNull(),
  type: text("type").$type<QrCreateFormValues["type"]>().notNull(),
  dot: text("dot", { mode: "json" }).$type<QrCreateFormValues["dot"]>().notNull(),
  eye: text("eye", { mode: "json" }).$type<QrCreateFormValues["eye"]>().notNull(),
  frame: text("frame", { mode: "json" }).$type<QrCreateFormValues["frame"]>().notNull(),
  logo: text("logo", { mode: "json" }).$type<QrCreateFormValues["logo"]>(),
  styles: text("styles", { mode: "json" }).$type<QrCreateFormValues["styles"]>().notNull()
});//export ends

export type QrCode = typeof qrCodesTable.$inferSelect;

// Retains offline deletions until the owning user's API confirms them.
export const qrCodeDeletionsTable = sqliteTable("static_qrcode_deletions", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull()
});//export ends

let initializationPromise: Promise<void> | null = null;

/* ------------------ BREAK ------------------ */

// Initializes the QR table once on the existing native SQLite database connection.
export function initQrCodes(): Promise<void> {
  initializationPromise ??= createQrCodesTable();
  return initializationPromise;
};//export ends

// Creates the QR table with columns matching the main React Hook Form object.
async function createQrCodesTable(): Promise<void> {
  if (!db) return;

  await db.run(`
    CREATE TABLE IF NOT EXISTS static_qrcodes (
      id TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      user_id TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      last_download_type TEXT,
      last_download_at TEXT,
      name TEXT NOT NULL,
      hide_logo INTEGER NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      content_type TEXT,
      content_data TEXT,
      size INTEGER NOT NULL,
      type TEXT NOT NULL,
      dot TEXT NOT NULL,
      eye TEXT NOT NULL,
      frame TEXT NOT NULL,
      logo TEXT,
      styles TEXT NOT NULL
    );
  `);

  await db.run("CREATE TABLE IF NOT EXISTS static_qrcode_deletions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL);");

  migrateQrCodesColumns();

};//func ends

// Migrates existing QR settings without deleting their saved content or logo references.
function migrateQrCodesColumns(): void {
  if (!sqliteDB) return;
  const connection = sqliteDB;

  connection.withTransactionSync(() => {
    const columns = connection.getAllSync<{ name: string }>("PRAGMA table_info(static_qrcodes)");
    const names = new Set(columns.map((column) => column.name));

    if (!names.has("user_id")) {
      connection.execSync("ALTER TABLE static_qrcodes ADD COLUMN user_id TEXT;");
    };//if ends
    if (!names.has("sync_status")) {
      connection.execSync("ALTER TABLE static_qrcodes ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';");
    };//if ends

    if (!names.has("last_download_type")) {
      connection.execSync("ALTER TABLE static_qrcodes ADD COLUMN last_download_type TEXT;");
    };//if ends
    if (!names.has("last_download_at")) {
      connection.execSync("ALTER TABLE static_qrcodes ADD COLUMN last_download_at TEXT;");
    };//if ends
    if (names.has("hide_unoqr_logo")) {
      connection.execSync("ALTER TABLE static_qrcodes RENAME COLUMN hide_unoqr_logo TO hide_logo;");
    };//if ends
    if (!names.has("styles")) {
      connection.execSync("ALTER TABLE static_qrcodes ADD COLUMN styles TEXT NOT NULL DEFAULT '{}';");
      connection.execSync("UPDATE static_qrcodes SET styles = json_object('bg_color', bg_color, 'fg_color', fg_color);");
      connection.execSync("ALTER TABLE static_qrcodes DROP COLUMN bg_color;");
      connection.execSync("ALTER TABLE static_qrcodes DROP COLUMN fg_color;");
    };//if ends
  });
};//func ends
