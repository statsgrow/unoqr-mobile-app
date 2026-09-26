import { createContext, useContext } from "react";

/* ------------------ BREAK ------------------ */

// Shares whether the initial stored-session check is still running.
export const SessionRefreshContext = createContext(true);

// Reads the initial session-check state for account controls.
export function useSessionRefreshPending(): boolean {
  return useContext(SessionRefreshContext);
};//export ends
