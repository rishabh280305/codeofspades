import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectToDatabase } from "@/lib/db";
import { getStripeClient, fromMinorUnit } from "@/lib/stripe";
import { AppointmentModel } from "@/models/Appointment";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointmentId;
    if (appointmentId) {
      await connectToDatabase();
      await AppointmentModel.updateOne(
        { _id: appointmentId },
        {
          paymentStatus: "PAID_ONLINE",
          paymentMethod: "STRIPE",
          paymentPaidAt: new Date(),
          paymentRequestedAt: new Date(),
          paymentAmount:
            typeof session.amount_total === "number" ? fromMinorUnit(session.amount_total) : undefined,
          paymentCurrency: (session.currency || "inr").toUpperCase(),
          stripeCheckoutSessionId: session.id,
          stripePaymentUrl: "",
        },
      );
    }
  }

  return NextResponse.json({ received: true });
}
