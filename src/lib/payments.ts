/** Server-only payment boundary. No live provider is enabled in Phase 1. */
export type PaymentState =
  "pending" | "captured" | "failed" | "cancelled" | "refunded";
export type PaymentResult = {
  providerId: string;
  orderId: string;
  amount: number;
  currency: "USD";
  status: PaymentState;
};
export interface PaymentProvider {
  create(orderId: string): Promise<PaymentResult>;
  capture(providerId: string): Promise<PaymentResult>;
  verifyWebhook(
    request: Request,
  ): Promise<{ eventId: string; payment: PaymentResult; verified: true }>;
  reconcile(providerId: string): Promise<PaymentResult>;
}
const unavailable = async (): Promise<never> => {
  throw Error("PayPal is not configured. Live payments are disabled.");
};
export const paypal: PaymentProvider = {
  create: unavailable,
  capture: unavailable,
  verifyWebhook: unavailable,
  reconcile: unavailable,
};
export const demoPayment = {
  paymentStatus: "demo_unpaid",
  mode: "demo",
  message: "Test order only. No payment processed. Not a real kitchen order.",
} as const;
