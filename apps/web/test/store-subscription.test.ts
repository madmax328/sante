import { describe, expect, it } from "vitest";
import { isPremium } from "../src/lib/premium";
import { storeSubscriptionOf } from "../src/lib/store-subscription";

const future = new Date(Date.now() + 20 * 86400000).toISOString();
const past = new Date(Date.now() - 2 * 86400000).toISOString();

describe("in-app purchases", () => {
  it("reads the Premium entitlement bought on the App Store", () => {
    const s = storeSubscriptionOf({
      entitlements: { premium: { expires_date: future, product_identifier: "sorloo_yearly" } },
      subscriptions: { sorloo_yearly: { store: "app_store", expires_date: future, unsubscribe_detected_at: null, is_sandbox: true } },
    });
    expect(s).toMatchObject({ source: "app_store", productId: "sorloo_yearly", willRenew: true, sandbox: true, billingIssue: false });
    expect(isPremium({ store: s })).toBe(true);
  });

  it("keeps Premium during the grace period and ends it after expiry", () => {
    const grace = storeSubscriptionOf({
      entitlements: { premium: { expires_date: past, grace_period_expires_date: future, product_identifier: "m" } },
      subscriptions: { m: { store: "play_store", billing_issues_detected_at: past } },
    });
    expect(grace?.billingIssue).toBe(true);
    expect(isPremium({ store: grace })).toBe(true);
    const expired = storeSubscriptionOf({
      entitlements: { premium: { expires_date: past, product_identifier: "m" } },
      subscriptions: { m: { store: "play_store", unsubscribe_detected_at: past } },
    });
    expect(expired?.willRenew).toBe(false);
    expect(isPremium({ store: expired })).toBe(false);
  });

  it("treats a lifetime grant as Premium and no purchase as free", () => {
    const gift = storeSubscriptionOf({ entitlements: { premium: { expires_date: null, product_identifier: "rc_promo_premium_lifetime" } } });
    expect(gift?.source).toBe("promotional");
    expect(isPremium({ store: gift })).toBe(true);
    expect(storeSubscriptionOf({})).toBeNull();
    expect(isPremium({ store: null })).toBe(false);
  });
});
