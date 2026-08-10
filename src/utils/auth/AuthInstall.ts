
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import { apiSettings, installSettings } from "@/settings";
import axios from "axios";
import { getData, setData } from '../general/Storage';
import { getExpoPushToken } from '../general/PushNotifications';



/* ------------------- BREAK ---------------- */

//get install information from API
export async function getAppInstallInfo(): Promise<any> {
   //try-catch
   try {
      //check if install info already exists in local storage
      const existingInstallInfo = await getData({ key: installSettings.storageKeys.installInfo.name });
      
      //get install id
      const installId = existingInstallInfo?.id || null;

      //url
      const apiUrl = apiSettings.getApiUrl({ path: `/app/install?id=${installId}` }).href;
      //insert install info from API
      const appInstallData = (await axios.get(apiUrl)).data?.data || null;

      //return the app install data
      return appInstallData;
   } catch (error) {
      console.error("Error fetching install info:", error);
      return null;
   };//trycatch ends
};//func ends

/* ------------------- BREAK ---------------- */

//insert install information from API
export async function insertAppInstall(): Promise<any> {


   //try-catch
   try {
      //check if install info already exists in local storage
      const existingInstallInfo = await getData({ key: installSettings.storageKeys.installInfo.name });
      //if exists, return it
      //if(existingInstallInfo) return existingInstallInfo;

      //get device details
      const deviceDetails:any = await getDeviceDetails();

      //add expo push token if exists
      const expoPushTokenInfo = await getExpoPushToken();
      deviceDetails.expo_token = expoPushTokenInfo?.token;
      deviceDetails.expo_token_updated_at = expoPushTokenInfo?.updated_at;
      
      //url
      const apiUrl = apiSettings.getApiUrl({ path: '/app/install' }).href;
      //insert install info from API
      const appInstallData = (await axios.post(apiUrl, deviceDetails)).data?.data || null;

      //insert to storage
      if (appInstallData){
         //store in local storage
         setData({
            key: installSettings.storageKeys.installInfo.name,
            value: appInstallData,  
         })   
      };

      //show the log 
      console.log("App Installed Successfully:", appInstallData.id);

      //return the app install data
      return appInstallData;
   } catch (error) {
      console.error("Error fetching install info:", error);
      return null;
   };//trycatch ends
};//func ends

/* ------------------- BREAK ---------------- */

//get this device details
export async function getDeviceDetails() {
  const locale = getLocales()[0];
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

   //Default return
   return {
      platform: Platform.OS,
      language: locale?.languageCode,
      region: locale?.regionCode,
      timezone,
      is_real_device: Device.isDevice,
      installed_at: await Application.getInstallationTimeAsync(),

      //device details
      device: {
         manufacturer: Device.manufacturer,
         model: Device.modelName,
         brand: Device.brand,
         type: await Device.getDeviceTypeAsync(),
         name: Device.deviceName,
         os_name: Device.osName,
         os_version: Device.osVersion,
      },

      //app info
      app_info: {
         build: Application.nativeBuildVersion,
         version: Application.nativeApplicationVersion,
         installation_id: await Application.getInstallationTimeAsync(),
      },      
   };
};//func ends

/* ------------------- BREAK ---------------- */