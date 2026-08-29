import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { db, sqliteDB } from "@/utils/sqlite/db";

/* ------------------ BREAK ------------------ */

export type ScanSyncStatus = "pending" | "processing" | "synced" | "incomplete";

export type ScanLocation = {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
};

export type ScanSecurityMetadata = {
  status: "secure" | "insecure";
  isSecure: boolean;
  inputProtocol: "http:" | "https:" | null;
  finalProtocol: "http:" | "https:" | null;
  tlsValid: boolean | null;
  warning: string | null;
};

export type ScanUrlMetadata = {
  url: string | null;
  isSecure: boolean;
  httpStatus: number | null;
  protocol: "http:" | "https:" | null;
  warning: string | null;
  favicons: string[];
};

export type ScanMetadata = {
  [key: string]: unknown;
  id?: string;
  inputUrl?: string | ScanUrlMetadata;
  finalUrl?: string | ScanUrlMetadata | null;
  redirectStatus?: "direct" | "redirected" | "unresolved";
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  canonicalUrl?: string | null;
  logoUrl?: string | null;
  mediaType?: string | null;
  contentType?: string | null;
  server?: string | null;
  images?: string[];
  favicons?: string[];
  metadataSource?: {
    title: "browser_page" | null;
    description: "browser_page" | null;
    logo: "browser_page" | null;
  };
  metadataStatus?: "pending" | "resolved" | "partial";
  scan_to_final_duration?: number | null;
  crawlInfo?: {
    duration: number;
    attempts: number | null;
    retries: number | null;
  };
  httpStatus?: number | null;
  security?: ScanSecurityMetadata;
  error?: unknown;
  payeeVpa?: string | null;
  payeeName?: string | null;
  transactionNote?: string | null;
  transactionRefId?: string | null;
  amount?: string | null;
  currency?: string | null;
};

export type InsertScanInput = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  value: string;
  input_url?: string | null;
  final_url?: string | null;
  type?: string | null;
  status?: string | null;
  user_ip?: string | null;
  location?: ScanLocation | null;
  user_id?: string | null;
  website_id?: string | null;
  install_id?: string | null;
  sync_status: ScanSyncStatus;
  metadata?: ScanMetadata | null;
};

type ScanColumn = {
  name: string;
};

/* ------------------ BREAK ------------------ */

const legacyScanColumns = [
  "lantitude",
  "longitude",
  "metadata_json",
  "canonical_url",
  "logo_url",
  "scan_to_final_duration"
] as const;

let initializationPromise: Promise<void> | null = null;

/* ------------------ BREAK ------------------ */

export const scansTable = sqliteTable("scans", {
  id: text("id").primaryKey(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at"),
  value: text("value").notNull(),
  input_url: text("input_url"),
  final_url: text("final_url"),
  type: text("type"),
  status: text("status").default("pending"),
  user_ip: text("user_ip"),
  location: text("location", { mode: "json" }).$type<ScanLocation | null>(),
  user_id: text("user_id"),
  website_id: text("website_id"),
  install_id: text("install_id"),
  sync_status: text("sync_status").$type<ScanSyncStatus>().notNull().default("pending"),
  metadata: text("metadata", { mode: "json" }).$type<ScanMetadata | null>()
});

/* ------------------ BREAK ------------------ */

// Creates the SQLite scan table with the same logical fields as public.app_scans.
export async function createScansTable() {
  if (!db) return;

  await db.run(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      value TEXT NOT NULL,
      input_url TEXT,
      final_url TEXT,
      type TEXT,
      status TEXT DEFAULT 'pending',
      user_ip TEXT,
      location TEXT,
      user_id TEXT,
      website_id TEXT,
      install_id TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (sync_status IN ('pending', 'processing', 'synced', 'incomplete')),
      metadata TEXT
    );
  `);
};//func ends

/* ------------------ BREAK ------------------ */

// Drops only the pre-JSON scan table while preserving rows using the current compact contract.
export async function removeLegacyScansTable() {
  if (!sqliteDB) return;

  const existingTable = sqliteDB.getFirstSync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'scans'"
  );

  if (!existingTable) return;

  const columns = sqliteDB.getAllSync<ScanColumn>("PRAGMA table_info(scans)");
  const columnNames = new Set(columns.map((column) => column.name));
  const isLegacySchema = !columnNames.has("sync_status")
    || !columnNames.has("metadata")
    || legacyScanColumns.some((columnName) => columnNames.has(columnName));

  if (isLegacySchema) {
    sqliteDB.execSync("DROP TABLE scans;");
  };//if ends
};//func ends

/* ------------------ BREAK ------------------ */

// Adds URL lookup columns without deleting rows already stored in the compact scan table.
export async function migrateScanUrlColumns() {
  if (!sqliteDB) return;

  const columns = sqliteDB.getAllSync<ScanColumn>("PRAGMA table_info(scans)");
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("input_url")) {
    sqliteDB.execSync("ALTER TABLE scans ADD COLUMN input_url TEXT;");
  };//if ends

  if (!columnNames.has("final_url")) {
    sqliteDB.execSync("ALTER TABLE scans ADD COLUMN final_url TEXT;");
  };//if ends
};//func ends

/* ------------------ BREAK ------------------ */

// Replaces the legacy table once and shares initialization across all scan queries.
export function initScansTable(): Promise<void> {
  initializationPromise ??= initializeScansTable();
  return initializationPromise;
};//func ends

// Performs the ordered legacy-table removal and current-table creation.
async function initializeScansTable() {
  await removeLegacyScansTable();
  await createScansTable();
  await migrateScanUrlColumns();
};//func ends

/* ------------------ BREAK ------------------ */
