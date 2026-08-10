import { eq } from 'drizzle-orm';

import { db } from '@/utils/sqlite/db';
import { Toast } from '@/utils/general/Toast';

import { scansTable } from './init';

/* ------------------ BREAK ------------------ */

// Fetches all saved scans from the local database.
export async function getAllScans() {
  if (!db) {
    return [];
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
   } catch (error:any) {
      Toast.error({ message: error?.message });
      console.error('Error fetching scan by ID:', error);
      return null;
   };//try catch ends
};//func ends

/* ------------------ BREAK ------------------ */
