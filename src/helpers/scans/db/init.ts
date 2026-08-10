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

export const dummyScans = [
  {
    id: 'dummy-scan-001',
    value: 'https://www.amazon.in/deals',
    type: 'url',
    status: 'processed',
    lantitude: 19.076,
    longitude: 72.8777,
    location: 'Mumbai, Maharashtra',
    created_at: '2026-08-09T09:30:00.000Z',
    updated_at: '2026-08-09T09:31:00.000Z',
  },
  {
    id: 'dummy-scan-002',
    value: 'https://maps.google.com/?q=Bandra+West',
    type: 'url',
    status: 'processed',
    lantitude: 19.0596,
    longitude: 72.8295,
    location: 'Bandra West, Mumbai',
    created_at: '2026-08-08T15:12:00.000Z',
    updated_at: '2026-08-08T15:13:00.000Z',
  },
  {
    id: 'dummy-scan-003',
    value: 'upi://pay?pa=unoqr@upi&pn=UnoQR',
    type: 'text',
    status: 'processed',
    lantitude: 18.5204,
    longitude: 73.8567,
    location: 'Pune, Maharashtra',
    created_at: '2026-08-07T12:45:00.000Z',
    updated_at: '2026-08-07T12:46:00.000Z',
  },
  {
    id: 'dummy-scan-004',
    value: 'https://www.bookmyshow.com/events',
    type: 'url',
    status: 'pending',
    lantitude: 19.1136,
    longitude: 72.8697,
    location: 'Andheri East, Mumbai',
    created_at: '2026-08-06T18:20:00.000Z',
    updated_at: '2026-08-06T18:20:00.000Z',
  },
  {
    id: 'dummy-scan-005',
    value: 'https://www.99acres.com/property-in-mumbai-ffid',
    type: 'url',
    status: 'processed',
    lantitude: 19.0178,
    longitude: 72.8478,
    location: 'Dadar, Mumbai',
    created_at: '2026-08-05T10:05:00.000Z',
    updated_at: '2026-08-05T10:06:00.000Z',
  },
  {
    id: 'dummy-scan-006',
    value: 'https://www.flipkart.com/offers-store',
    type: 'url',
    status: 'processed',
    lantitude: 19.2183,
    longitude: 72.9781,
    location: 'Thane, Maharashtra',
    created_at: '2026-08-04T14:18:00.000Z',
    updated_at: '2026-08-04T14:19:00.000Z',
  },
  {
    id: 'dummy-scan-007',
    value: 'https://pay.google.com/about/',
    type: 'url',
    status: 'failed',
    lantitude: null,
    longitude: null,
    location: null,
    created_at: '2026-08-03T08:40:00.000Z',
    updated_at: '2026-08-03T08:41:00.000Z',
  },
  {
    id: 'dummy-scan-008',
    value: 'https://in.bookmyshow.com/explore/events-mumbai',
    type: 'url',
    status: 'processed',
    lantitude: 19.1197,
    longitude: 72.8468,
    location: 'Juhu, Mumbai',
    created_at: '2026-08-02T17:35:00.000Z',
    updated_at: '2026-08-02T17:36:00.000Z',
  },
  {
    id: 'dummy-scan-009',
    value: 'https://www.magicbricks.com/property-for-sale-rent-in-Mumbai/residential-real-estate-Mumbai',
    type: 'url',
    status: 'pending',
    lantitude: 19.033,
    longitude: 73.0297,
    location: 'Navi Mumbai, Maharashtra',
    created_at: '2026-08-01T11:10:00.000Z',
    updated_at: '2026-08-01T11:10:00.000Z',
  },
  {
    id: 'dummy-scan-010',
    value: 'https://www.myntra.com/shop/men',
    type: 'url',
    status: 'processed',
    lantitude: 19.1646,
    longitude: 72.8493,
    location: 'Goregaon, Mumbai',
    created_at: '2026-07-31T16:55:00.000Z',
    updated_at: '2026-07-31T16:56:00.000Z',
  },
] satisfies InsertScanInput[];

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

// Adds the ten development records without duplicating existing dummy rows.
export async function seedDummyScans() {
  if (!db) {
    return;
  };//if ends

  await db.insert(scansTable).values(dummyScans).onConflictDoNothing().run();
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

// Creates the scans table and seeds its development records.
export async function initScansTable() {
  await createScansTable();
  await migrateScansTable();
  await seedDummyScans();
};//func ends

/* ------------------ BREAK ------------------ */
