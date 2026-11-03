import { apiSettings } from "@/settings";
import { Axios } from "@/utils/general/Axios";

import type { AppPlanCatalogue, CurrentSubscription } from "./types";

/* ------------------ BREAK ------------------ */

// Loads feature details for an owned subscription, or all available app plans.
export async function getAppSubscriptionPlans({ subscriptionId, signal }: { subscriptionId?: string | null; signal?: AbortSignal } = {}): Promise<CurrentSubscription['plan'][]> {
  const url = apiSettings.getApiUrl({ path: "/app/subscriptions/plan" });
  if (subscriptionId) url.searchParams.set("subscription_id", subscriptionId);
  const response = await Axios.get<{ data: { plans: CurrentSubscription['plan'][] } }>(url.href, { signal });
  //Default Return
  return response.data.data.plans;
};//export ends

/* ------------------ BREAK ------------------ */

// Fetches app plan prices for the selected market and native platform.
export async function getAppPlanCatalogue({ country, provider, signal }: { country: string; provider: 'razorpay' | 'app_store' | 'google_play'; signal?: AbortSignal }): Promise<AppPlanCatalogue> {
  const url = apiSettings.getApiUrl({ path: "/app/subscriptions/plans" });
  url.searchParams.set("country", country);
  url.searchParams.set("provider", provider);
  const response = await Axios.get<{ data: AppPlanCatalogue }>(url.href, { signal });
  //Default Return
  return response.data.data;
};//export ends
