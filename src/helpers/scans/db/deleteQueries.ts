import { eq } from 'drizzle-orm';
import { db } from '@/utils/sqlite/db';
import { scansTable } from './init';
import { Toast } from '@/utils/general/Toast';

/* ------------------ BREAK ------------------ */

// Deletes a scan row from the local database by ID.
export async function deleteScan(id: string) {
  if (!db) {
    return null;
  };//if ends

  //try catch
  try {
    const result = await db.delete(scansTable).where(eq(scansTable.id, id)).run();
    return result;
  } catch (error:any) {
    Toast.error({ message: error?.message });
    console.error('Error deleting scan:', error);
    return null;
  };//try catch ends
};//func ends

/* ------------------ BREAK ------------------ */
