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

export async function createCheckout(userId: string, email: string, plan: "monthly" | "yearly", locale: string): Promise<string> {
  const price = plan === "yearly" ? env.stripePriceYearly : env.stripePriceMonthly;
  if (!price) throw new Error("Stripe price missing");
  const customer = await customerFor(userId, email);
  const prefix = locale === "fr" ? "" : `/${locale}`;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: userId,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    automatic_tax: { enabled: false },
    locale: locale === "en" ? "en" : "fr",
    subscription_data: {
      metadata: { userId },
      ...(env.stripeTrialDays > 0 ? { trial_period_days: env.stripeTrialDays } : {}),
    },
    success_url: `${env.appUrl}${prefix}/app/account?checkout=success`,
    cancel_url: `${env.appUrl}${prefix}/app/account?checkout=cancel`,
  });
  if (!session.url) throw new Error("No checkout URL");
  return session.url;
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
