declare module "react-native-razorpay" {
  const RazorpayCheckout: {
    open(options: Record<string, unknown>): Promise<{
      razorpay_payment_id: string;
      razorpay_signature: string;
      razorpay_subscription_id?: string;
      razorpay_order_id?: string;
    }>;
  };
  export default RazorpayCheckout;
}
