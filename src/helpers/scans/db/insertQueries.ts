import { db } from '@/utils/sqlite/db';
import { InsertScanInput, scansTable } from './init';
import { apiSettings, installSettings } from '@/settings';
import { Axios } from '@/utils/general/Axios';
import { getData } from '@/utils/general/Storage';
import { Toast } from '@/utils/general/Toast';

/* ------------------ BREAK ------------------ */

// Inserts a new scan row into the local SQLite database.
export async function insertScan(data: InsertScanInput) {
  if (!db) return null;

  //try catch
  try {
    //get install info from local storage
    const installInfo = await getData({ key: installSettings.storageKeys.installInfo.name });
    if (!installInfo) throw new Error('Install info not found');

    //add install_id to data
    data.install_id = installInfo.id;

    // Insert into local SQLite database
    const result = await db.insert(scansTable).values(data).run();

    //Insert into API as well
    await insertScanToAPI(data);

    //Default return
    return result;
  } catch (error:any) {
    Toast.error({ message: error?.message });
    console.error('Error inserting scan:', error);
    return null;
  };//try catch ends
};//func ends

/* ------------------ BREAK ------------------ */

//Insert the scan to API
export async function insertScanToAPI(data: InsertScanInput) {

  //try catch
  try {
    const apiUrl = apiSettings.getApiUrl({ path: `/app/scans` });
    //Request
    const scanData = await Axios.post(apiUrl.href, data);
  } catch (error) {
    console.error('Error inserting scan to API:', error);
    return null;
  };//try catch ends
};//func ends

/* ------------------ BREAK ------------------ */
