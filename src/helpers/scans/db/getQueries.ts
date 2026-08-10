import { eq } from 'drizzle-orm';
import { db } from '@/utils/sqlite/db';
import { dummyScans, scansTable } from './init';

/* ------------------ BREAK ------------------ */

// Fetches all saved scans from the local database.
export async function getAllScans() {
  if (!db) {
    return dummyScans;
  };//if ends

   return db.select().from(scansTable);
}

/* ------------------ BREAK ------------------ */

export async function getScanById(id: string) {
   if (!db) {
      return null;
   };//if ends

   //try catch 
   try {
      const result = await db.select().from(scansTable).where(eq(scansTable.id, id));
      return result[0] ?? null;
   } catch (error) {
      console.error('Error fetching scan by ID:', error);
      return null;
   };//try catch ends
};//func ends

/* ------------------ BREAK ------------------ */
