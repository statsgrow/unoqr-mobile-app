import { getUser } from "@/utils/auth/AuthUser";

import type { CurrentSubscription } from "./types";

/* ------------------ BREAK ------------------ */

// Refreshes the shared app user so subscription pages and cached account checks see the same plan.
export async function getCurrentSubscription(signal: AbortSignal): Promise<CurrentSubscription> {
  const user = await getUser({ signal });
  if (!user) throw new Error("Sign in to view your subscription.");
  const subscription = user.subscription;
  //Default Return
  return { subscription, plan: subscription.plan, active_addons: subscription.addons, limits: subscription.limits };
};//export ends
