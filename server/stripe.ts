import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export async function createStripeCheckoutSession(params: {
  amountCents: number;
  orderId: number;
  paymentMethodType: "card" | "paypal";
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: [params.paymentMethodType],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "RULF.CC Order" },
          unit_amount: params.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { orderId: String(params.orderId) },
  });
  return { id: session.id, url: session.url! };
}

export function constructStripeEvent(payload: Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
