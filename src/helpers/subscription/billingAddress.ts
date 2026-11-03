import { apiSettings } from "@/settings";
import { getUser } from "@/utils/auth/AuthUser";
import type { BillingAddress } from "@/utils/auth/UserTypes";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

// Saves account billing details and refreshes the shared app user and subscription cache.
export async function saveAppBillingAddress(billingAddress: BillingAddress): Promise<void> {
  await Axios.put(apiSettings.getApiUrl({ path: "/app/auth/user/billing_address" }).href, billingAddress);
  const user = await getUser();
  if (!user) throw new Error("Your saved billing address could not be loaded.");
};//export ends
