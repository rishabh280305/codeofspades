import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

let cachedStripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!cachedStripeClient) {
    cachedStripeClient = new Stripe(stripeSecretKey, {
      apiVersion: "2026-03-25.dahlia",
    });
  }

  return cachedStripeClient;
}

export function toMinorUnit(amount: number) {
  return Math.round(amount * 100);
}

export function fromMinorUnit(amountMinor: number) {
  return amountMinor / 100;
}
