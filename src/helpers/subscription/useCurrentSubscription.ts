import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import GetError from "@/utils/general/Error";

import { getCurrentSubscription } from "./api";
import { getAppSubscriptionPlans } from "./plans";
import type { CurrentSubscription } from "./types";

/* ------------------ BREAK ------------------ */

// Refreshes account billing data on focus and cancels reads when leaving the page.
export function useCurrentSubscription() {
  const [data, setData] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    void getCurrentSubscription(controller.signal).then(async result => {
      const plans = await getAppSubscriptionPlans({ subscriptionId: result.subscription?.id, signal: controller.signal });
      const plan = plans.find(plan => plan.code === result.plan.code);
      if (!plan) throw new Error("Your plan details could not be loaded.");
      if (!controller.signal.aborted) setData({ ...result, plan });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(GetError({ error: cause, message: "Your subscription could not be loaded." }).message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();//return ends
  }, [revision]));
  return { data, loading, error, refresh: () => setRevision(current => current + 1) };
};//export ends
