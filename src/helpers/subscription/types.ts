/* ------------------ BREAK ------------------ */

export type SubscriptionPeriod = { current_period_start: string | null; current_period_end: string | null };
export type CurrentSubscription = {
  plan: { code: string; name: string; included_cards: number; allows_addons: boolean; inclusions: string[]; exclusions: string[] };
  subscription: (SubscriptionPeriod & { id: string | null; code: string; status: string; interval: string; provider?: string; cancel_at_period_end?: boolean }) | null;
  active_addons: (SubscriptionPeriod & { id: string; code: string; extra_cards: number })[];
  limits: { included: number; additional: number; total: number; used: number; available: number; over_limit: number; can_create: boolean };
};

/* ------------------ BREAK ------------------ */

export type UserSubscription = NonNullable<CurrentSubscription['subscription']> & {
  uid: string | null;
  plan: CurrentSubscription['plan'];
  addons: CurrentSubscription['active_addons'];
  can_buy_addons: boolean;
  limits: CurrentSubscription['limits'];
};

/* ------------------ BREAK ------------------ */

export type AppPlanCatalogue = {
  currency: string;
  plans: (CurrentSubscription['plan'] & {
    prices: { id: string; interval: 'monthly' | 'yearly'; rate: number; currency: string; available: boolean }[];
  })[];
};
