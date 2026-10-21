import "server-only";
import { cancelCommission, netOfStorePurchase, recordCommission } from "./affiliates";
import { env } from "./env";
import { getProfile, updateProfile } from "./repo";
import { storeSubscriptionOf, type RcSubscriber } from "./store-subscription";
import type { StoreSubscription } from "./types";

/**
 * Purchases made in the iOS / Android app go through RevenueCat, which checks
 * the receipts with Apple and Google. The app identifies the buyer with the
 * Sorloo user id; the server always asks RevenueCat for the truth instead of
 * trusting what the phone says.
 */
const API = "https://api.revenuecat.com/v1/subscribers";

/** Fetches the user's in-app purchases from RevenueCat and saves them on the profile. */
export async function syncStoreSubscription(userId: string): Promise<StoreSubscription | null> {
  if (!env.revenuecatSecret) return null;
  const res = await fetch(`${API}/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${env.revenuecatSecret}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const body = (await res.json()) as { subscriber?: RcSubscriber };
  const store = storeSubscriptionOf(body.subscriber ?? {}, env.revenuecatEntitlement);
  await updateProfile(userId, { store });
  return store;
}

/** Called by RevenueCat on every purchase, renewal, cancellation or expiry. */
export async function handleRevenueCatEvent(event: {
  type?: string;
  environment?: string;
  store?: string;
  transaction_id?: string;
  cancel_reason?: string;
  price_in_purchased_currency?: number | null;
  currency?: string;
  tax_percentage?: number | null;
  commission_percentage?: number | null;
  purchased_at_ms?: number;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
}): Promise<number> {
  const ids = new Set(
    [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []), ...(event.transferred_from ?? []), ...(event.transferred_to ?? [])].filter(
      (id): id is string => !!id && !id.startsWith("$RCAnonymousID"),
    ),
  );
  let synced = 0;
  for (const id of ids) {
    // Only Sorloo accounts: anything else is ignored.
    if (!(await getProfile(id))) continue;
    await syncStoreSubscription(id);
    await affiliateShare(id, event);
    synced++;
  }
  return synced;
}

/** Deletes the user's purchase history at RevenueCat (account deletion). */
export async function deleteStoreCustomer(userId: string): Promise<void> {
  if (!env.revenuecatSecret) return;
  try {
    await fetch(`${API}/${encodeURIComponent(userId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${env.revenuecatSecret}` } });
  } catch (e) {
    console.error("RevenueCat delete failed", e);
  }
}

/** Affiliate programme: payments in the app of a referred customer (test purchases never count). */
async function affiliateShare(userId: string, event: Parameters<typeof handleRevenueCatEvent>[0]): Promise<void> {
  if (event.environment === "SANDBOX" || !event.transaction_id) return;
  const id = `rc:${event.transaction_id}`;
  // A refund comes as a cancellation by customer support.
  if (event.type === "CANCELLATION" && event.cancel_reason === "CUSTOMER_SUPPORT") {
    await cancelCommission(id);
    return;
  }
  if (!["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"].includes(event.type ?? "")) return;
  await recordCommission({
    id,
    customerId: userId,
    source: event.store === "PLAY_STORE" ? "play_store" : "app_store",
    net: netOfStorePurchase(event),
    currency: event.currency ?? "EUR",
    at: event.purchased_at_ms ? new Date(event.purchased_at_ms) : undefined,
  });
}
