
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

type ExpoPushTokenInfo = {
   token: string | null;
   updated_at: string | null;
};


/* ------------------- BREAK ---------------- */

export async function getExpoPushToken(): Promise<ExpoPushTokenInfo | null>{
   if (!Device.isDevice) return null;
   
   // Check for existing permissions
   const { status: existingStatus } = await Notifications.getPermissionsAsync();
   let finalStatus = existingStatus;

   // If no existing permission, ask for permission
   if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
   };//if ends
   
   // If no permission, exit the function
   if (finalStatus !== 'granted') return null;

   // Get the Expo push token
   const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

   // If no projectId, exit the function
   if (!projectId) return null;

   // Set notification channel for Android
   if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
         name: 'default',
         importance: Notifications.AndroidImportance.MAX,
      });
   };//if ends

   // Get the Expo push token
   const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
   const token = tokenResponse.data ?? null;

   // Return token and update time together for install/update payloads.
   return {
      token,
      updated_at: token ? new Date().toISOString() : null,
   };
};//func ends

/* ------------------- BREAK ---------------- */