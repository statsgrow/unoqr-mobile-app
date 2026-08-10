import { eq } from 'drizzle-orm';
import { db } from '@/utils/sqlite/db';
import { InsertScanInput, scansTable } from './init';
import { Toast } from '@/utils/general/Toast';

/* ------------------ BREAK ------------------ */

export type UpdateScanInput = Partial<InsertScanInput>;

/* ------------------ BREAK ------------------ */

// Updates an existing scan row by its ID.
export async function updateScan(id: string, data: UpdateScanInput) {
  if (!db) {
    return null;
  };//if ends

  //try catch
  try {
    const result = await db.update(scansTable).set(data).where(eq(scansTable.id, id)).run();
    return result;
  } catch (error:any) {
    Toast.error({ message: error?.message });
    console.error('Error updating scan:', error);
    return null;
  };//try catch ends
};//func ends

/* ------------------ BREAK ------------------ */
