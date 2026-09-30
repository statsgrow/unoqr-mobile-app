import { router, type Href } from 'expo-router';
import { getRouteInfoFromState } from 'expo-router/build/global-state/getRouteInfoFromState';
import { store } from 'expo-router/build/global-state/store';

/* ------------------ BREAK ------------------ */

export type RedirectType = 'push' | 'replace';
export type RedirectPath = Href;

/* ------------------ BREAK ------------------ */

// Navigate with Expo Router only when the destination route or parameters differ.
export function redirect(type: RedirectType, path: RedirectPath): void {
   const destinationState = store.getStateForHref(path);

   if (destinationState && store.getRouteInfo().pathnameWithParams === getRouteInfoFromState(destinationState).pathnameWithParams) {
      return;
   };//if ends

   router[type](path);
};//export ends
