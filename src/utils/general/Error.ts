
//Imports
import _ from 'lodash';
import React from "react";


//Interface
interface ReturnParams {
   name?: string|null, message?: string ,  
   error?: Error | any,
   consoleLog?: boolean,
   errorType?: "user-auth" | "general" | "response" | string,
   showToast?: boolean
};//ends 

/* --------------- BREAK ------------------- */

export default function GetError({ name, message, error, consoleLog=false, errorType, showToast=false }:ReturnParams){
   let errorInit = new Error(message || 'Unknown error');
   let responseError = GetResponseError(error) || null;

   
   //check if error object has response data
   if(responseError && responseError?.error){
      //try to extract message and name from response data
      errorInit.message = responseError?.message || message;
      errorInit.name = responseError?.name || name;
      
      //check if its validation error
      if(responseError?.name === "ValidationError"){
         errorInit = GetResponseValidationErrors({ error: responseError });
      };//if ends
   };//ends

   //set name
   if(name && !errorInit.name) errorInit.name = name;
   //set message
   if(message && !errorInit.message) errorInit.message = message;
   //set error cause if provided
   if(error && !errorInit.cause) errorInit.cause = error;

   //console log
   if(consoleLog) console.error(`Error.ts:-:-> `, { error: errorInit, type: errorType || 'general' });

   
   //return error
   return errorInit;
};//func ends 

/* ---------------  BREAK ----------------- */

function GetResponseError(error:any){
   let message = error?.message || 'Unknown Response error';
   let errorData = error?.response?.data || null;
   let errorCause = errorData?.error || null;

   //name
   let name = errorData?.name || errorCause?.name || "ResponseError";
   //message
   message = errorData?.message || message;
   
   //return
   return { name, message, error: errorCause || errorData || error }; 
};//func ends

/* ---------------  BREAK ----------------- */

function GetResponseValidationErrors({ error }: { error: any }): any {
   let errorInit : Error = { name: "ValidationError", message: "Validation error", cause: null } as Error;
   let errorObj = error?.error || null;
   
   //get all data
   errorInit.cause = errorObj || error;
   errorInit.message = error?.message || 'Validation error';
   errorInit.name = errorObj?.name || error?.name || "ValidationError";
   const errorsArr = errorObj?.errors || null;
   
   //if errors array available which will have string of validation errors 
   if(errorsArr && Array.isArray(errorsArr)){
      //join all errors into a single string with bullet prefix per row
      errorInit.message = errorsArr.map((msg:any) => `• ${String(msg)}`).join("\n");
   };//if ends

   //return
   return errorInit;
};//func ends

/* ---------------  BREAK ----------------- */

export function TriggerRHFErrors({ RHF, error }: { RHF: any, error: any }){
   if (!RHF || typeof RHF.setError !== "function") return;

   //get response error
   const responseError = GetResponseError(error) || null;
   // inner: array of Yup inner ValidationError objects, each with { path, message, errors[] }
   const innerErrors: any[] = responseError?.error?.inner || [];

   // If Yup validation errors are present, set them in RHF.
   if (innerErrors.length > 0) {
      // Set each field error from the inner Yup validation array.
      innerErrors.forEach((err: any) => {
         if (!err?.path) return;
         const msg = err.message || err.errors?.[0] || "Invalid value";
         RHF.setError(err.path, { type: "manual", message: String(msg) });
      });
      return;
   };//if ends

   // Fallback: top-level Yup error has a path itself (single field error).
   const topPath = responseError?.error?.path || null;
   const topMessage = responseError?.error?.message || responseError?.message || null;
   if (topPath && topMessage) {
      RHF.setError(topPath, { type: "manual", message: String(topMessage) });
   };//if ends

};//func ends

/* ---------------  BREAK ----------------- */

//get validation errors from response and return as array of strings
export function GetResponseValidationErrorsArray({ error, showToast }: { error: any, showToast?: boolean }): string[] {
   const responseError = error && error?.response?.data || null;
   const errorObj = responseError?.error || null;
   const validationErrors = errorObj?.errors || null;
   const errorMessages: string[] = [];

   //validation errors is object of key-value pairs where key is field name and value is array of error messages
   if (validationErrors && typeof validationErrors === "object") {
      //for each key
      for (const key in validationErrors) {
         if (Array.isArray(validationErrors[key])) {
            validationErrors[key].forEach((msg: any) => {
               errorMessages.push(`${String(msg)}`);
            });
         } else if (typeof validationErrors[key] === "string") {
            errorMessages.push(`${String(validationErrors[key])}`);
         }
      };
      

      //return
      return errorMessages;
   };//if ends

   //return
   return [];
};//func ends

/* ---------------  BREAK ----------------- */