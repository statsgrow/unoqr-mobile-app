import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { FileInputValue } from "@/components/form/PxFileInput";
import { db, sqliteDB } from "@/utils/sqlite/db";

import type { RemoteCard } from "../api/cards";

/* ------------------ BREAK ------------------ */

export const digitalCardsTable = sqliteTable("digital_cards", {
  id: text("id").primaryKey().notNull(),
  user_id: text("user_id").notNull().unique(),
  uid: text("uid").notNull(),
  url: text("url").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
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
  user_id: text("user_id").primaryKey().notNull(),
  photo: text("photo", { mode: "json" }).$type<FileInputValue | null>()
});//export ends

let initializationPromise: Promise<void> | null = null;

/* ------------------ BREAK ------------------ */

// Shares table initialization across all digital-card cache queries.
export function initDigitalCardsTable(): Promise<void> {
  initializationPromise ??= createDigitalCardsTable();
  return initializationPromise;
};//export ends

// Mirrors public.app_digital_cards without generating replacement UUIDs on the device.
async function createDigitalCardsTable(): Promise<void> {
  if (!db || !sqliteDB) return;
  await db.run(`CREATE TABLE IF NOT EXISTS digital_cards (
    id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL UNIQUE, uid TEXT NOT NULL, url TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unpublished',
    published_at TEXT, name TEXT NOT NULL DEFAULT 'My Card', company TEXT NOT NULL DEFAULT '',
    position TEXT NOT NULL DEFAULT '', phones TEXT NOT NULL, emails TEXT NOT NULL, social_links TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', layout TEXT NOT NULL DEFAULT 'modern',
    primary_color TEXT NOT NULL DEFAULT '#FF5528', qr_design TEXT NOT NULL, seo TEXT NOT NULL,
    allow_save_contact INTEGER NOT NULL DEFAULT 1, is_contact_required INTEGER NOT NULL DEFAULT 0,
    photo_url TEXT, feature_photo_url TEXT, fullname TEXT NOT NULL
  );`);
  // Adds the contact preference to existing installations without replacing their cached card.
  const columns = sqliteDB.getAllSync<{ name: string }>("PRAGMA table_info(digital_cards)");
  if (!columns.some((column) => column.name === "is_contact_required")) {
    await db.run("ALTER TABLE digital_cards ADD COLUMN is_contact_required INTEGER NOT NULL DEFAULT 0;");
  };//if ends
  await db.run(`CREATE TABLE IF NOT EXISTS digital_card_photos (user_id TEXT PRIMARY KEY NOT NULL, photo TEXT);`);
};//func ends
