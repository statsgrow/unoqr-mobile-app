import type { UserSubscription } from '@/helpers/subscription/types';

/* ------------------- BREAK ---------------- */

export type UserType = {
   id: string;
   email: string, first_name: string, last_name: string,
   full_name?: string,
   avatar_url?: string,
   role: UserRolesType,
   phone?: string,
   created_at: string, updated_at: string | null,
   subscription: UserSubscription,
   billing_address?: BillingAddress | null,
   active_space?: string | null,
   tokens?: UserTokensType
};

/* ------------------- BREAK ---------------- */

export type BillingAddress = {
   name: string;
   line_1: string;
   line_2: string;
   city: string;
   state: string;
   postal_code: string;
   country: string;
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
export type UserRolesType = "user" | "admin" | "member" | "staff" | "visitor";

/* ------------------- BREAK ---------------- */
