import { sql } from 'drizzle-orm';
import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { db, sqliteDB } from '@/utils/sqlite/db';

/* ------------------ BREAK ------------------ */

// Defines the shape of a scan row for insert and update operations.
export type InsertScanInput = {
  id: string;
  value: string;
  type: string;
  status: string;
  lantitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
  install_id?: string; // Optional field for install ID
};

type ScanColumn = {
  name: string;
};

/* ------------------ BREAK ------------------ */

export const scansTable = sqliteTable('scans', {
  id: text('id').primaryKey(),
  value: text('value').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  lantitude: real('lantitude'),
  longitude: real('longitude'),
  location: text('location'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  install_id: text('install_id'),
});

/* ------------------ BREAK ------------------ */

// Creates the scans table when local SQLite is available.
export async function createScansTable() {
  if (!db) {
    return;
  };//if ends

  await db.run(
    sql`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        lantitude REAL,
        longitude REAL,
        location TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        install_id TEXT
      );
    `,
  );
};//func ends

/* ------------------ BREAK ------------------ */

// Migrates older URL-based scan tables to the current value and type columns.
export async function migrateScansTable() {
  if (!sqliteDB) {
    return;
  };//if ends

  const columns = sqliteDB.getAllSync<ScanColumn>('PRAGMA table_info(scans)');
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has('value')) {
    sqliteDB.execSync('ALTER TABLE scans ADD COLUMN value TEXT;');

    if (columnNames.has('url')) {
      sqliteDB.execSync('UPDATE scans SET value = url WHERE value IS NULL;');
    };//if ends
  };//if ends

  if (!columnNames.has('type')) {
    sqliteDB.execSync("ALTER TABLE scans ADD COLUMN type TEXT NOT NULL DEFAULT 'url';");
  };//if ends

  if (!columnNames.has('install_id')) {
    sqliteDB.execSync('ALTER TABLE scans ADD COLUMN install_id TEXT;');
  };//if ends

  if (columnNames.has('url')) {
    sqliteDB.execSync(`
      DROP TABLE IF EXISTS scans_migrated;
      CREATE TABLE scans_migrated (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        lantitude REAL,
        longitude REAL,
        location TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        install_id TEXT
      );
      INSERT OR REPLACE INTO scans_migrated (
        id, value, type, status, lantitude, longitude, location, created_at, updated_at, install_id
      )
      SELECT
        id,
        COALESCE(value, url),
        COALESCE(type, 'url'),
        status,
        lantitude,
        longitude,
        location,
        created_at,
        updated_at,
        install_id
      FROM scans;
      DROP TABLE scans;
      ALTER TABLE scans_migrated RENAME TO scans;
    `);
  };//if ends
};//func ends

/* ------------------ BREAK ------------------ */

// Removes legacy development seed rows while preserving all real scans.
export async function removeLegacyDummyScans() {
  if (!sqliteDB) {
    return;
  };//if ends

  sqliteDB.runSync("DELETE FROM scans WHERE id LIKE 'dummy-scan-%'");
};//func ends

/* ------------------ BREAK ------------------ */

// Creates and migrates the real local scans table.
export async function initScansTable() {
  await createScansTable();
  await migrateScansTable();
  await removeLegacyDummyScans();
};//func ends

/* ------------------ BREAK ------------------ */
