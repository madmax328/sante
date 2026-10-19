import type { StoreSubscription } from "./types";

/** What RevenueCat returns for a subscriber (the fields Sorloo uses). */
interface RcEntitlement {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
}

interface RcSubscription {
  store?: string;
  expires_date?: string | null;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  is_sandbox?: boolean;
}

export interface RcSubscriber {
  entitlements?: Record<string, RcEntitlement>;
  subscriptions?: Record<string, RcSubscription>;
}

/** Reads the Premium entitlement from a RevenueCat subscriber (null = never bought in the app). */
export function storeSubscriptionOf(subscriber: RcSubscriber, entitlement = "premium"): StoreSubscription | null {
  const ent = subscriber.entitlements?.[entitlement];
  if (!ent) return null;
  const sub = subscriber.subscriptions?.[ent.product_identifier];
  const end = ent.grace_period_expires_date ?? ent.expires_date;
  return {
    source: sub?.store ?? "promotional",
    productId: ent.product_identifier,
    expiresAt: end ? new Date(end) : null,
    willRenew: !!sub && !sub.unsubscribe_detected_at,
    billingIssue: !!sub?.billing_issues_detected_at,
    sandbox: !!sub?.is_sandbox,
    updatedAt: new Date(),
  };
}
