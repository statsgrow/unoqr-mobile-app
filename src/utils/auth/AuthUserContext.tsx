import { createContext, useContext } from "react";

import type { UserType } from "./UserTypes";

/* ------------------ BREAK ------------------ */

// Shares the account already verified by the protected route layout.
export const AuthUserContext = createContext<UserType | null>(null);

// Returns the layout-verified account without repeating storage or network checks in pages.
export function useUser(): UserType {
  const user = useContext(AuthUserContext);
  if (!user) throw new Error("Account pages must be rendered inside the authenticated layout.");
  return user;
};//export ends
