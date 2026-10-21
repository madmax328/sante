import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A small in-memory stand-in for the MongoDB collections used by the programme.
type Doc = Record<string, unknown> & { _id: string };
const store = new Map<string, Map<string, Doc>>();
const col = (name: string) => {
  if (!store.has(name)) store.set(name, new Map());
  return store.get(name)!;
};
const get = (d: Doc, path: string) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], d);
const matches = (d: Doc, q: Record<string, unknown> = {}) =>
  Object.entries(q).every(([k, v]) => {
    const x = get(d, k);
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const op = v as Record<string, unknown>;
      if ("$ne" in op) return x !== op.$ne;
      if ("$lte" in op) return (x as Date) <= (op.$lte as Date);
    }
    return x === v;
  });
const update = (d: Doc, u: { $set?: Record<string, unknown>; $inc?: Record<string, number> }) => {
  Object.assign(d, u.$set ?? {});
  for (const [k, n] of Object.entries(u.$inc ?? {})) d[k] = ((d[k] as number) ?? 0) + n;
};
vi.mock("../src/lib/db", () => ({
  ensureIndexes: async () => undefined,
  db: {
    collection: (name: string) => ({
      findOne: async (q: Record<string, unknown>) => [...col(name).values()].find((d) => matches(d, q)) ?? null,
      find: (q: Record<string, unknown>) => ({ toArray: async () => [...col(name).values()].filter((d) => matches(d, q)).sort((a, b) => +(b.at as Date) - +(a.at as Date)) }),
      insertOne: async (d: Doc) => {
        if (col(name).has(d._id)) throw Object.assign(new Error("dup"), { code: 11000 });
        col(name).set(d._id, structuredClone(d));
      },
      updateOne: async (q: Record<string, unknown>, u: never) => {
        const d = [...col(name).values()].find((x) => matches(x, q));
        if (d) update(d, u);
        return { modifiedCount: d ? 1 : 0 };
      },
      updateMany: async (q: Record<string, unknown>, u: never) => {
        const list = [...col(name).values()].filter((x) => matches(x, q));
        list.forEach((d) => update(d, u));
        return { modifiedCount: list.length };
      },
      countDocuments: async (q: Record<string, unknown>) => [...col(name).values()].filter((d) => matches(d, q)).length,
    }),
  },
}));
vi.mock("../src/lib/repo", () => ({
  getProfile: async (id: string) => col("profiles").get(id) ?? null,
  updateProfile: async (id: string, patch: Record<string, unknown>) => {
    Object.assign(col("profiles").get(id)!, patch);
  },
}));

const aff = await import("../src/lib/affiliates");
const DAY = 86400_000;

function profile(id: string, extra: Record<string, unknown> = {}) {
  col("profiles").set(id, { _id: id, createdAt: new Date(), ...extra });
}

async function approvedAffiliate(id = "creator", name = "Julie Martin") {
  profile(id);
  await aff.applyAffiliate({ id, name, email: `${id}@example.com` }, { socials: [{ platform: "instagram", url: "@julie" }] });
  return (await aff.reviewAffiliate(id, "approve")).affiliate!;
}

beforeEach(() => store.clear());

describe("affiliate programme", () => {
  it("waits for the admin before giving a code", async () => {
    profile("creator");
    const a = await aff.applyAffiliate({ id: "creator", name: "Julie Martin", email: "j@example.com" }, { socials: [{ platform: "tiktok", url: "@julie" }] });
    expect(a.status).toBe("pending");
    expect(await aff.affiliateByCode("JULIEMARTIN")).toBeNull();
    const res = await aff.reviewAffiliate("creator", "approve");
    expect(res.affiliate?.code).toBe("JULIEMARTIN");
    expect((await aff.affiliateByCode("juliemartin"))?._id).toBe("creator");
  });

  it("links a new account to the affiliate, once, and never to themselves", async () => {
    const a = await approvedAffiliate();
    profile("customer");
    expect(await aff.attachReferral("customer", a.code!)).toBe("ok");
    expect(await aff.attachReferral("creator", a.code!)).toBe("self");
    const other = await approvedAffiliate("other", "Marc");
    expect(await aff.attachReferral("customer", other.code!)).toBe("already");
    profile("old", { createdAt: new Date(Date.now() - 40 * DAY) });
    expect(await aff.attachReferral("old", a.code!, { late: true })).toBe("too_late");
    profile("subscriber", { subscription: { subscriptionId: "sub_1" } });
    expect(await aff.attachReferral("subscriber", a.code!, { late: true })).toBe("too_late");
  });

  it("pays 25 % of each payment for 12 months, once per payment", async () => {
    const a = await approvedAffiliate();
    profile("customer");
    await aff.attachReferral("customer", a.code!);
    const start = new Date("2026-01-10T10:00:00Z");
    const c = await aff.recordCommission({ id: "stripe:in_1", customerId: "customer", source: "stripe", net: 41.66, currency: "eur", at: start });
    expect(c?.amount).toBe(10.42);
    expect(c?.currency).toBe("EUR");
    // The same webhook delivered twice counts once.
    expect(await aff.recordCommission({ id: "stripe:in_1", customerId: "customer", source: "stripe", net: 41.66, currency: "eur", at: start })).toBeNull();
    // Still within the first year, then after it.
    expect(await aff.recordCommission({ id: "stripe:in_2", customerId: "customer", source: "stripe", net: 5.83, currency: "eur", at: new Date("2026-12-20T10:00:00Z") })).not.toBeNull();
    expect(await aff.recordCommission({ id: "stripe:in_3", customerId: "customer", source: "stripe", net: 41.66, currency: "eur", at: new Date("2027-01-15T10:00:00Z") })).toBeNull();
    // Customers who did not come through an affiliate earn nothing.
    profile("direct");
    expect(await aff.recordCommission({ id: "stripe:in_4", customerId: "direct", source: "stripe", net: 41.66, currency: "eur" })).toBeNull();
  });

  it("drops refunded commissions and pays the rest after 30 days", async () => {
    const a = await approvedAffiliate();
    profile("customer");
    await aff.attachReferral("customer", a.code!);
    const at = new Date(Date.now() - 40 * DAY);
    await aff.recordCommission({ id: "rc:1", customerId: "customer", source: "app_store", net: 35.4, currency: "EUR", at });
    await aff.recordCommission({ id: "rc:2", customerId: "customer", source: "app_store", net: 4.95, currency: "EUR", at });
    await aff.recordCommission({ id: "rc:3", customerId: "customer", source: "app_store", net: 4.95, currency: "EUR", at: new Date() });
    expect(await aff.cancelCommission("rc:2")).toBe(true);
    let stats = await aff.affiliateStats((await aff.getAffiliate("creator"))!);
    expect(stats.customers).toBe(1);
    expect(stats.signups).toBe(1);
    expect(stats.totals).toEqual([{ currency: "EUR", pending: 1.24, available: 8.85, paid: 0 }]);
    expect(await aff.markPaid("creator")).toBe(1);
    stats = await aff.affiliateStats((await aff.getAffiliate("creator"))!);
    expect(stats.totals).toEqual([{ currency: "EUR", pending: 1.24, available: 0, paid: 8.85 }]);
    // A paid commission is not cancelled any more.
    expect(await aff.cancelCommission("rc:1")).toBe(false);
  });

  it("stops earning while suspended", async () => {
    const a = await approvedAffiliate();
    profile("customer");
    await aff.attachReferral("customer", a.code!);
    await aff.reviewAffiliate("creator", "suspend");
    expect(await aff.recordCommission({ id: "stripe:x", customerId: "customer", source: "stripe", net: 10, currency: "EUR" })).toBeNull();
    expect(await aff.affiliateByCode(a.code!)).toBeNull();
  });

  it("works out what Sorloo really receives", () => {
    // 49.99 € paid on the website, French VAT included, no tax line on the invoice.
    expect(aff.netOfStripeInvoice({ amount_paid: 4999, total: 4999, total_taxes: [] })).toBe(41.66);
    // Stripe Tax computed 8.33 € of VAT.
    expect(aff.netOfStripeInvoice({ amount_paid: 4999, total: 4999, total_taxes: [{ amount: 833 }] })).toBe(41.66);
    // 49.99 € on the App Store: VAT, then Apple's 15 %.
    expect(aff.netOfStorePurchase({ price_in_purchased_currency: 49.99, tax_percentage: 0.1667, commission_percentage: 0.15 })).toBe(35.41);
  });

  it("opens social profiles safely", () => {
    expect(aff.socialHref({ platform: "tiktok", url: "@julie.cuisine" })).toBe("https://www.tiktok.com/@julie.cuisine");
    expect(aff.socialHref({ platform: "youtube", url: "https://youtube.com/@julie" })).toBe("https://youtube.com/@julie");
    expect(aff.socialHref({ platform: "instagram", url: "javascript:alert(1)" })).toBeNull();
    expect(aff.socialHref({ platform: "blog", url: "julie" })).toBeNull();
  });
});
