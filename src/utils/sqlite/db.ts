//Imports
import * as SQLite from 'expo-sqlite';
import { drizzle } from "drizzle-orm/expo-sqlite";
import { Platform } from 'react-native';

import { sqliteSettings } from '../../settings';

/* ------------------ BREAK ------------------ */

// Keeps the production local database on native while web uses a preview fallback.
export const isLocalDatabaseAvailable = Platform.OS !== 'web';

// Opens the native SQLite connection used by database setup and migrations.
export const sqliteDB = isLocalDatabaseAvailable
  ? SQLite.openDatabaseSync(sqliteSettings.dbName)
  : null;

// Initializes Drizzle only when the native SQLite connection is available.
export const db = sqliteDB ? drizzle(sqliteDB) : null;

/* ------------------ BREAK ------------------ */
