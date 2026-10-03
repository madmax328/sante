import "server-only";
import Stripe from "stripe";
import { env } from "./env";
import { findProfileByCustomer, getProfile, updateProfile } from "./repo";
import type { Subscription } from "./types";

let client: Stripe | undefined;
export function stripe(): Stripe {
  if (!env.stripeSecret) throw new Error("Stripe is not configured");
  client ??= new Stripe(env.stripeSecret, { appInfo: { name: "Weeko" } });
  return client;
}

async function customerFor(userId: string, email: string): Promise<string> {
  const profile = await getProfile(userId);
  if (profile?.subscription?.customerId) return profile.subscription.customerId;
  const customer = await stripe().customers.create({ email, metadata: { userId } });
  await updateProfile(userId, { subscription: { ...(profile?.subscription ?? {}), customerId: customer.id } });
  return customer.id;
}

export interface StartedSubscription {
  subscriptionId: string;
  clientSecret: string;
  /** "payment" for an invoice to pay now, "setup" when a free trial starts first */
  intent: "payment" | "setup";
  amount: number;
  currency: string;
  interval: "month" | "year";
  trialDays: number;
}

/**
 * Prepares a subscription that waits for the card entered on our own payment
 * page (Payment Element). It only becomes active once the payment succeeds.
 */
export async function startSubscription(userId: string, email: string, plan: "monthly" | "yearly"): Promise<StartedSubscription> {
  const priceId = plan === "yearly" ? env.stripePriceYearly : env.stripePriceMonthly;
  if (!priceId) throw new Error("Stripe price missing");
  const customer = await customerFor(userId, email);
  const price = await stripe().prices.retrieve(priceId);
  const expand = ["latest_invoice.confirmation_secret", "pending_setup_intent"];

  // Reuse a pending subscription for the same price; drop pending ones for the other plan.
  const pending = await stripe().subscriptions.list({ customer, status: "incomplete", limit: 10 });
  let sub: Stripe.Subscription | undefined;
  for (const p of pending.data) {
    if (!sub && p.items.data[0]?.price.id === priceId) sub = await stripe().subscriptions.retrieve(p.id, { expand });
    else await stripe().subscriptions.cancel(p.id).catch(() => undefined);
  }
  sub ??= await stripe().subscriptions.create({
    customer,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    metadata: { userId },
    ...(env.stripeTrialDays > 0 ? { trial_period_days: env.stripeTrialDays } : {}),
    expand,
  });

  const invoice = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
  const setup = typeof sub.pending_setup_intent === "object" ? sub.pending_setup_intent : null;
  const paymentSecret = invoice?.confirmation_secret?.client_secret;
  const clientSecret = paymentSecret ?? setup?.client_secret;
  if (!clientSecret) throw new Error("No client secret for subscription " + sub.id);
  return {
    subscriptionId: sub.id,
    clientSecret,
    intent: paymentSecret ? "payment" : "setup",
    amount: (price.unit_amount ?? 0) / 100,
    currency: price.currency.toUpperCase(),
    interval: price.recurring?.interval === "year" ? "year" : "month",
    trialDays: env.stripeTrialDays,
  };
}

/** Called right after the payment form succeeds, without waiting for the webhook. */
export async function refreshSubscription(userId: string, subscriptionId: string): Promise<boolean> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const profile = await getProfile(userId);
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  if (!profile?.subscription?.customerId || profile.subscription.customerId !== customer) return false;
  await syncSubscription(sub);
  return sub.status === "active" || sub.status === "trialing";
}

export async function createPortal(userId: string, locale: string): Promise<string | null> {
  const profile = await getProfile(userId);
  const customer = profile?.subscription?.customerId;
  if (!customer) return null;
  const prefix = locale === "fr" ? "" : `/${locale}`;
  const session = await stripe().billingPortal.sessions.create({ customer, return_url: `${env.appUrl}${prefix}/app/account` });
  return session.url;
}

function toSubscription(sub: Stripe.Subscription): Subscription {
  const item = sub.items.data[0];
  return {
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    subscriptionId: sub.id,
    status: sub.status,
    priceId: item?.price.id,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : undefined,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/** Keeps the profile's subscription in sync; the profile is what web and mobile read. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const data = toSubscription(sub);
  const userId = sub.metadata?.userId;
  const profile = userId ? await getProfile(userId) : await findProfileByCustomer(data.customerId!);
  if (!profile) {
    console.warn("Stripe subscription without matching profile", sub.id);
    return;
  }
  await updateProfile(profile._id, { subscription: data });
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(await stripe().subscriptions.retrieve(id));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object);
      break;
    default:
      break;
  }
}

export async function cancelSubscriptionNow(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  const id = profile?.subscription?.subscriptionId;
  if (!id || !env.stripeSecret) return;
  try {
    await stripe().subscriptions.cancel(id);
  } catch (e) {
    console.error("Stripe cancel failed", e);
  }
}
