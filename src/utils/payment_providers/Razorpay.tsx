import { Platform, TurboModuleRegistry } from "react-native";

import type { AppSubscriptionOrder } from "@/helpers/subscription/orders";
import { apiSettings } from "@/settings";
import { colors } from "@/theme/tokens";
import type { BillingAddress } from "@/utils/auth/UserTypes";
import { Axios } from "@/utils/general/Axios";

/* ------------------ BREAK ------------------ */

export type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_signature: string;
  razorpay_subscription_id?: string;
  razorpay_order_id?: string;
};
export type RazorpayCheckout = {
  provider: "razorpay";
  key_id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  subscription_id?: string;
  order_id?: string;
  notes?: Record<string, string>;
  prefill?: { name?: string; email?: string; contact?: string };
};
export type RazorpayOrderState = {
  order: AppSubscriptionOrder;
  checkout: RazorpayCheckout | null;
  payment: { status: string } | null;
};
type CreateOrderInput = { priceId: string; billingAddress: BillingAddress; email: string };

/* ------------------ BREAK ------------------ */

// Confirms the native checkout is linked before creating an order or a recurring agreement.
export function assertCheckoutReady(): void {
  if (Platform.OS === "web" || !TurboModuleRegistry.get("RNRazorpayCheckout")) {
    throw new Error("Rebuild and reopen the mobile app to enable Razorpay payments.");
  };//if ends
};//export ends

// Creates an account-owned Pro order with server-resolved Razorpay pricing.
export async function createOrder({ priceId, billingAddress, email }: CreateOrderInput): Promise<AppSubscriptionOrder> {
  const { name, ...address } = billingAddress;
  const response = await Axios.post<{ data: AppSubscriptionOrder }>(apiSettings.getApiUrl({ path: "/app/subscriptions/orders" }).href,
    { item_price_id: priceId, provider: "razorpay", quantity: 1, billing_details: { name, address, email } }, { timeout: 30_000 });
  return response.data.data;
};//export ends

// Reloads the owned order so retries use its immutable amount and payment state.
export async function getOrder(orderUid: string): Promise<RazorpayOrderState> {
  const response = await Axios.get<{ data: RazorpayOrderState }>(apiSettings.getApiUrl({ path: "/app/subscriptions/orders" }).href,
    { params: { order_uid: orderUid }, timeout: 30_000 });
  return response.data.data;
};//export ends

// Reuses the server's pending payment and initializes its signed checkout contract.
export async function createPayment(orderUid: string): Promise<RazorpayOrderState> {
  const response = await Axios.post<{ data: RazorpayOrderState }>(apiSettings.getApiUrl({ path: "/app/subscriptions/orders/payment" }).href,
    { order_uid: orderUid }, { timeout: 60_000 });
  return response.data.data;
};//export ends

// Opens the native SDK with only the checkout values returned by the authorized API.
export async function openCheckout(checkout: RazorpayCheckout): Promise<RazorpayResponse> {
  assertCheckoutReady();
  const { default: Razorpay } = await import("react-native-razorpay");
  try {
    return await Razorpay.open({ key: checkout.key_id, name: checkout.name, description: checkout.description,
      amount: checkout.amount, currency: checkout.currency, prefill: checkout.prefill, notes: checkout.notes,
      ...(checkout.order_id ? { order_id: checkout.order_id } : { subscription_id: checkout.subscription_id }),
      theme: { color: colors.secondary.main } });
  } catch (error: unknown) {
    const failure = error as { description?: string };
    throw new Error(failure?.description || "Payment was not completed. Please try again.");
  };//try-catch ends
};//export ends

// Verifies the SDK signature and captured transaction on the server before checking paid status.
export async function verifyPayment(orderUid: string, result: RazorpayResponse): Promise<RazorpayOrderState> {
  await Axios.post(apiSettings.getApiUrl({ path: "/app/subscriptions/orders/payment/verify" }).href,
    { order_uid: orderUid, razorpay_payment_id: result.razorpay_payment_id, razorpay_signature: result.razorpay_signature,
      ...(result.razorpay_order_id ? { razorpay_order_id: result.razorpay_order_id } : { razorpay_subscription_id: result.razorpay_subscription_id }) },
    { timeout: 60_000 });
  return getOrder(orderUid);
};//export ends

// Recovers captured payments after a missed callback without creating another purchase.
export async function reconcilePayment(orderUid: string): Promise<RazorpayOrderState> {
  await Axios.post(apiSettings.getApiUrl({ path: "/app/subscriptions/orders/payment/reconcile" }).href,
    { order_uid: orderUid }, { timeout: 60_000 });
  return getOrder(orderUid);
};//export ends
