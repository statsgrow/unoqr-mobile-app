

//Imports
import { apiSettings, userTokenSettings } from "@/settings";
import { UserType } from './UserTypes';
import _ from 'lodash';
import GetError from '../general/Error';
import { getData } from "../general/Storage";
import { removeUserTokens } from "./AuthTokens";


/* ------------------- BREAK ---------------- */

export async function getUser({ errorOnFail=true, allowedRoles=['user'], activeSpaceUid }: { errorOnFail?: boolean, allowedRoles?: Array<'user'>, activeSpaceUid?: string } = {}): Promise<UserType | any> {
   //default user
   let user = null;
   
   //URL
   let authApiUrl = apiSettings.getApiUrl({ path: `/auth/user` });
   //Set active space in search params if provided
   //if(activeSpaceUid) authApiUrl.searchParams.append("space_uid", activeSpaceUid);

   //get headers
   const fHeaders : any = {};
   //set access token
   fHeaders[userTokenSettings.headerTokens.accessToken.name] = await getData({ key: userTokenSettings.storageTokens.accessToken.name }) || null;
   //set refresh token
   fHeaders[userTokenSettings.headerTokens.refreshToken.name] = await getData({ key: userTokenSettings.storageTokens.refreshToken.name }) || null;

   console.log("GetUser Headers:", fHeaders);

   //try-catch 
   try {
      //if(activeSpaceUid && !activeSpaceUid.startsWith("spc_")) throw new Error("Invalid space UID provided.");

      //request backend directly in server context
      const res = await fetch(authApiUrl.href, {
         cache: "no-store", headers: fHeaders,
         credentials: "include",   // important
      });
      //json
      const uData = await res.json();
      user = uData?.data || null;
     //console.log("Fetched User:", user);
      //show error 
      if(!user) throw new Error("User not found");

      //check if active space is provided and user has access to it
      //if(activeSpaceUid){
         //const user_space = user?.space && user?.space?.uid;
         //throw error if user does not have access to the active space
         //if(user_space !== activeSpaceUid) throw new Error("User does not have access to the active space."); 
      //};//if ends

      
      console.log("User Data:", user);
      //Default Return 
      return user;
   } catch (error:any) {//console.log("Get User Error:", error);
      const rError = GetError({ error, errorType: "user-auth" });
      
      //if Invalid token error, clear cookies
      if(rError.message && rError.message.includes("Invalid Refresh Token")){
         //remove cookies
         await removeUserTokens();
      };//if ends

      //error
      if(errorOnFail) throw GetError({ name: rError.name || "AuthError", message: rError.message || error?.message || "Failed to fetch user data", error: rError.cause, errorType: "user-auth" });
   };//trycatch ends 
};//func ends

/* ------------------- BREAK ---------------- */