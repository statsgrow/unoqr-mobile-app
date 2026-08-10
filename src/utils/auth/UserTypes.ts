

/* ------------------- BREAK ---------------- */

export type UserType = {
   id: any;
   email: string, first_name: string, last_name: string,
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