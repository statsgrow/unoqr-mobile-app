import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { FileInputValue } from "@/components/form/PxFileInput";
import { db, sqliteDB } from "@/utils/sqlite/db";

import type { RemoteCard } from "../api/cards";

/* ------------------ BREAK ------------------ */

export const digitalCardsTable = sqliteTable("digital_cards", {
  id: text("id").primaryKey().notNull(),
  user_id: text("user_id").notNull(),
  uid: text("uid").notNull().unique(),
  url: text("url").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  version: integer("version").notNull().default(0),
  status: text("status").$type<RemoteCard["status"]>().notNull().default("unpublished"),
  published_at: text("published_at"),
  name: text("name").notNull().default("My Card"),
  company: text("company").notNull().default(""),
  position: text("position").notNull().default(""),
  phones: text("phones", { mode: "json" }).$type<RemoteCard["phones"]>().notNull(),
  emails: text("emails", { mode: "json" }).$type<RemoteCard["emails"]>().notNull(),
  social_links: text("social_links", { mode: "json" }).$type<RemoteCard["social_links"]>().notNull(),
  bio: text("bio").notNull().default(""),
  address: text("address").notNull().default(""),
  layout: text("layout").$type<RemoteCard["layout"]>().notNull().default("modern"),
  primary_color: text("primary_color").notNull().default("#FF5528"),
  qr_design: text("qr_design", { mode: "json" }).$type<RemoteCard["qr_design"]>().notNull(),
  seo: text("seo", { mode: "json" }).$type<RemoteCard["seo"]>().notNull(),
  allow_save_contact: integer("allow_save_contact", { mode: "boolean" }).notNull().default(true),
  is_contact_required: integer("is_contact_required", { mode: "boolean" }).notNull().default(false),
  photo_url: text("photo_url"),
  feature_photo_url: text("feature_photo_url"),
  fullname: text("fullname").notNull()
});//export ends

// Keeps the API's joined file metadata separate from the mirrored Supabase card fields.
export const digitalCardPhotosTable = sqliteTable("digital_card_photos", {
  card_uid: text("card_uid").primaryKey().notNull(),
  user_id: text("user_id").notNull(),
  photo: text("photo", { mode: "json" }).$type<FileInputValue | null>(),
  feature_photo: text("feature_photo", { mode: "json" }).$type<FileInputValue | null>()
});//export ends

let initializationPromise: Promise<void> | null = null;

/* ------------------ BREAK ------------------ */

// Shares table initialization across all digital-card cache queries.
export function initDigitalCardsTable(): Promise<void> {
  initializationPromise ??= createDigitalCardsTable();
  return initializationPromise;
};//export ends

// Mirrors server-owned versions and migrates older single-card caches without losing their saved data.
async function createDigitalCardsTable(): Promise<void> {
  if (!db || !sqliteDB) return;
  const createCardsSql = `CREATE TABLE IF NOT EXISTS digital_cards (
    id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, uid TEXT NOT NULL UNIQUE, url TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'unpublished',
    published_at TEXT, name TEXT NOT NULL DEFAULT 'My Card', company TEXT NOT NULL DEFAULT '',
    position TEXT NOT NULL DEFAULT '', phones TEXT NOT NULL, emails TEXT NOT NULL, social_links TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', layout TEXT NOT NULL DEFAULT 'modern',
    primary_color TEXT NOT NULL DEFAULT '#FF5528', qr_design TEXT NOT NULL, seo TEXT NOT NULL,
    allow_save_contact INTEGER NOT NULL DEFAULT 1, is_contact_required INTEGER NOT NULL DEFAULT 0,
    photo_url TEXT, feature_photo_url TEXT, fullname TEXT NOT NULL
  );`;
  const createPhotosSql = `CREATE TABLE IF NOT EXISTS digital_card_photos (
    card_uid TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, photo TEXT, feature_photo TEXT
  );`;
  const connection = sqliteDB;
  connection.withTransactionSync(() => {
    connection.execSync(createCardsSql);
    connection.execSync(createPhotosSql);
    let columns = connection.getAllSync<{ name: string }>("PRAGMA table_info(digital_cards)");
    if (!columns.some((column) => column.name === "is_contact_required")) {
      connection.execSync("ALTER TABLE digital_cards ADD COLUMN is_contact_required INTEGER NOT NULL DEFAULT 0;");
    };//if ends
    if (!columns.some((column) => column.name === "version")) {
      connection.execSync("ALTER TABLE digital_cards ADD COLUMN version INTEGER NOT NULL DEFAULT 0;");
    };//if ends
    const photos = connection.getAllSync<{ name: string }>("PRAGMA table_info(digital_card_photos)");
    if (!photos.some((column) => column.name === "feature_photo")) {
      connection.execSync("ALTER TABLE digital_card_photos ADD COLUMN feature_photo TEXT;");
    };//if ends
    if (!photos.some((column) => column.name === "card_uid")) {
      columns = connection.getAllSync<{ name: string }>("PRAGMA table_info(digital_cards)");
      const names = columns.map((column) => `"${column.name}"`).join(", ");
      connection.execSync("ALTER TABLE digital_cards RENAME TO digital_cards_legacy;");
      connection.execSync(createCardsSql);
      connection.execSync(`INSERT INTO digital_cards (${names}) SELECT ${names} FROM digital_cards_legacy;`);
      connection.execSync("DROP TABLE digital_cards_legacy;");
      connection.execSync("ALTER TABLE digital_card_photos RENAME TO digital_card_photos_legacy;");
      connection.execSync(createPhotosSql);
      connection.execSync(`INSERT INTO digital_card_photos (card_uid, user_id, photo)
        SELECT card.uid, photo.user_id, photo.photo FROM digital_card_photos_legacy photo
        JOIN digital_cards card ON card.user_id = photo.user_id;`);
      connection.execSync("DROP TABLE digital_card_photos_legacy;");
    };//if ends
  });
};//func ends
