import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handleStripeEvent, stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!env.stripeWebhookSecret || !env.stripeSecret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const payload = await request.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, env.stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  try {
    await handleStripeEvent(event);
  } catch (e) {
    console.error("Stripe webhook failed", event.type, e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
