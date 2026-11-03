import type { BillingAddress } from "@/utils/auth/UserTypes";

/* ------------------ BREAK ------------------ */

export type AppOrderBillingDetails = {
  name: string;
  email?: string | null;
  address: Omit<BillingAddress, "name">;
};
export type AppSubscriptionOrder = {
  uid: string;
  number: string;
  status: string;
  currency: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  billing_details: AppOrderBillingDetails;
  provider?: string;
  items?: { price_snapshot: { interval: "monthly" | "yearly" }; item_price_id: string }[];
};
