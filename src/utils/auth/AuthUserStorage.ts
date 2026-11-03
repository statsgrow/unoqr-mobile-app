import { userTokenSettings } from '@/settings';
import { removeData, setData } from '@/utils/general/Storage';
import type { UserType } from './UserTypes';

/* ------------------ BREAK ------------------ */

const listeners = new Set<(user: UserType | null) => void>();

/* ------------------ BREAK ------------------ */

// Saves the complete API user and notifies mounted account views after refresh.
export async function saveAuthUser(user: UserType): Promise<void> {
  await setData({ key: userTokenSettings.storageTokens.userData.name, value: user });
  listeners.forEach(listener => listener(user));
};//export ends

/* ------------------ BREAK ------------------ */

// Removes the cached account and clears subscribed views when the session ends.
export async function clearAuthUser(): Promise<void> {
  await removeData({ key: userTokenSettings.storageTokens.userData.name });
  listeners.forEach(listener => listener(null));
};//export ends

/* ------------------ BREAK ------------------ */

// Shares refreshed account/subscription data without another request per page.
export function subscribeAuthUser(listener: (user: UserType | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};//export ends
