

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserType } from './UserTypes';

// Context type
type AuthUserContextType = {
   user: UserType | null;
   setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
};

//MAIN CONTEXT
const UserContext = createContext<AuthUserContextType | undefined>(undefined);

/* --------------- EXPORT ------------------ */
export function UserContextProvider({ children }: { children: ReactNode }) {
   //STATE
   const [user, setUser] = useState<UserType | null>(null);

   //return
   return (
      <UserContext.Provider value={{ user, setUser }}>
         {children}
      </UserContext.Provider>
   );
};//func ends 
/* --------------- EXPORT ------------------ */

export const useUser = () => useContext(UserContext);

/* --------------- EXPORT ------------------ */