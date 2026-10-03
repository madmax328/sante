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

export type Plan = "monthly" | "yearly";

function priceFor(plan: Plan): string {
  const priceId = plan === "yearly" ? env.stripePriceYearly : env.stripePriceMonthly;
  if (!priceId) throw new Error("Stripe price missing");
  return priceId;
}

/** A free trial is offered once per customer, never to someone who already had one. */
async function trialDaysFor(customer: string | undefined): Promise<number> {
  if (env.stripeTrialDays <= 0) return 0;
  if (!customer) return env.stripeTrialDays;
  const previous = await stripe().subscriptions.list({ customer, status: "all", limit: 20 });
  return previous.data.some((s) => s.trial_start || s.status === "active" || s.status === "past_due" || s.status === "canceled")
    ? 0
    : env.stripeTrialDays;
}

export interface CheckoutOffer {
  plan: Plan;
  /** Amount in major units (6.99) and in minor units for Stripe Elements (699) */
  amount: number;
  amountMinor: number;
  currency: string;
  trialDays: number;
}

/** What the payment page shows. Read-only: nothing is created in Stripe here. */
export async function checkoutOffer(userId: string, plan: Plan): Promise<CheckoutOffer> {
  const price = await stripe().prices.retrieve(priceFor(plan));
  const profile = await getProfile(userId);
  const unit = price.unit_amount ?? 0;
  return {
    plan,
    amount: unit / 100,
    amountMinor: unit,
    currency: price.currency,
    trialDays: await trialDaysFor(profile?.subscription?.customerId),
  };
}

export type PreparedPayment =
  | { kind: "payment"; clientSecret: string; subscriptionId: string }
  | { kind: "setup"; clientSecret: string; setupIntentId: string };

/** Subscriptions that never got a card: left over from an abandoned or older checkout. */
async function dropUnpaid(customer: string): Promise<void> {
  const subs = await stripe().subscriptions.list({ customer, status: "all", limit: 20 });
  for (const s of subs.data) {
    const unpaidTrial = s.status === "trialing" && !s.default_payment_method;
    if (s.status === "incomplete" || unpaidTrial) await stripe().subscriptions.cancel(s.id).catch(() => undefined);
  }
}

/**
 * Called only when the user submits the payment form, after the card details
 * passed Stripe's validation. Nothing grants Premium until Stripe confirms
 * the card: either the first invoice is paid, or (free trial) the card is
 * saved through a SetupIntent before the trial subscription is created.
 */
export async function prepareCheckout(userId: string, email: string, plan: Plan): Promise<PreparedPayment> {
  const priceId = priceFor(plan);
  const customer = await customerFor(userId, email);
  await dropUnpaid(customer);

  if ((await trialDaysFor(customer)) > 0) {
    const setup = await stripe().setupIntents.create({
      customer,
      usage: "off_session",
      allowed_payment_method_types: ["card"],
      metadata: { userId, plan },
    });
    return { kind: "setup", clientSecret: setup.client_secret!, setupIntentId: setup.id };
  }

  const sub = await stripe().subscriptions.create({
    customer,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    // Same payment methods as the form on our page, otherwise Stripe rejects the confirmation.
    payment_settings: { save_default_payment_method: "on_subscription", payment_method_types: ["card"] },
    metadata: { userId },
    expand: ["latest_invoice.confirmation_secret"],
  });
  const invoice = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
  const clientSecret = invoice?.confirmation_secret?.client_secret;
  if (!clientSecret) {
    // A zero-amount invoice (coupon, misconfigured price) must not unlock Premium silently.
    await stripe().subscriptions.cancel(sub.id).catch(() => undefined);
    throw new Error("No payment required for subscription " + sub.id + ": check the Stripe price");
  }
  return { kind: "payment", clientSecret, subscriptionId: sub.id };
}

/** Free trial: the card is saved and verified, now the trial subscription can start. */
export async function startTrial(userId: string, setupIntentId: string): Promise<boolean> {
  const setup = await stripe().setupIntents.retrieve(setupIntentId);
  const profile = await getProfile(userId);
  const customer = typeof setup.customer === "string" ? setup.customer : setup.customer?.id;
  const paymentMethod = typeof setup.payment_method === "string" ? setup.payment_method : setup.payment_method?.id;
  if (setup.status !== "succeeded" || !paymentMethod || !customer || customer !== profile?.subscription?.customerId) return false;
  if (setup.metadata?.userId !== userId) return false;
  const plan: Plan = setup.metadata?.plan === "yearly" ? "yearly" : "monthly";
  const trialDays = await trialDaysFor(customer);

  await stripe().customers.update(customer, { invoice_settings: { default_payment_method: paymentMethod } });
  const sub = await stripe().subscriptions.create(
    {
      customer,
      items: [{ price: priceFor(plan) }],
      default_payment_method: paymentMethod,
      metadata: { userId },
      ...(trialDays > 0 ? { trial_period_days: trialDays } : { payment_behavior: "error_if_incomplete" as const }),
    },
    { idempotencyKey: `weeko-trial-${setupIntentId}` },
  );
  await syncSubscription(sub);
  return sub.status === "active" || (sub.status === "trialing" && !!sub.default_payment_method);
}

/** Called right after the payment form succeeds, without waiting for the webhook. */
export async function refreshSubscription(userId: string, subscriptionId: string): Promise<boolean> {
  // Stripe marks the invoice paid a moment after the card is charged: wait for it briefly.
  let sub = await stripe().subscriptions.retrieve(subscriptionId);
  for (let i = 0; i < 8 && sub.status === "incomplete"; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    sub = await stripe().subscriptions.retrieve(subscriptionId);
  }
  const profile = await getProfile(userId);
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  if (!profile?.subscription?.customerId || profile.subscription.customerId !== customer) return false;
  await syncSubscription(sub);
  return sub.status === "active" || (sub.status === "trialing" && !!sub.default_payment_method);
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
    hasPaymentMethod: !!sub.default_payment_method,
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
  // Events can arrive out of order: an abandoned checkout being cancelled must
  // not overwrite the subscription the user actually paid for.
  const current = profile.subscription;
  const live = ["active", "trialing", "past_due"];
  if (current?.subscriptionId && current.subscriptionId !== sub.id && live.includes(current.status ?? "") && !live.includes(sub.status)) return;
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
