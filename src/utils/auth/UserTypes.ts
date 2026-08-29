

/* ------------------- BREAK ---------------- */

export type UserType = {
   id: string;
   email: string, first_name: string, last_name: string,
   full_name?: string,
   avatar_url?: string,
   role: UserRolesType, is_authenticated: boolean,
   phone?: string,
   created_at: string, updated_at: string,
   active_space?: string | null,
   tokens?: UserTokensType
};

/* ------------------- BREAK ---------------- */

export type UserTokensType = {
   access_token: string | null;
   refresh_token: string | null;
};

/* ------------------- BREAK ---------------- */

export type UserSessionType = {
   access_token: string | null;
   refresh_token: string | null;
   user: UserType | null;
};

/* ------------------- BREAK ---------------- */

//Type Roles
export type UserRolesType = "user";

/* ------------------- BREAK ---------------- */
