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
      if ("$exists" in op) return (x !== undefined) === op.$exists;
    }
    return x === v;
  });
const update = (d: Doc, u: { $set?: Record<string, unknown>; $inc?: Record<string, number>; $unset?: Record<string, unknown> }) => {
  Object.assign(d, u.$set ?? {});
  for (const k of Object.keys(u.$unset ?? {})) delete d[k];
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
      insertMany: async (list: Doc[]) => list.forEach((d, i) => col(name).set(`${Date.now()}-${i}-${Math.random()}`, d)),
      deleteOne: async (q: Record<string, unknown>) => {
        const d = [...col(name).values()].find((x) => matches(x, q));
        if (d) col(name).delete(d._id);
      },
      findOneAndUpdate: async (q: { _id: string }, u: { $inc: Record<string, number> }) => {
        const d = col(name).get(q._id) ?? { _id: q._id };
        update(d, u);
        col(name).set(q._id, d);
        return d;
      },
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
const { payoutPdf } = await import("../src/lib/affiliate-pdf");
const DAY = 86400_000;
const IBAN = "FR76 3000 6000 0112 3456 7890 189";

function profile(id: string, extra: Record<string, unknown> = {}) {
  col("profiles").set(id, { _id: id, createdAt: new Date(), ...extra });
}

async function approvedAffiliate(email = "julie@example.com", name = "Julie Martin") {
  const res = await aff.applyAffiliate({ name, email }, { socials: [{ platform: "instagram", url: "@julie" }] });
  if (!res.ok) throw new Error("apply failed");
  return (await aff.reviewAffiliate(res.affiliate._id, "approve")).affiliate!;
}

async function referredCustomer(code: string, id = "customer") {
  profile(id);
  await aff.attachReferral(id, code);
}

beforeEach(() => store.clear());

describe("applications", () => {
  it("needs no Sorloo account and waits for the admin before giving a random code", async () => {
    const res = await aff.applyAffiliate({ name: "Julie Martin", email: "Julie@Example.com" }, { socials: [{ platform: "tiktok", url: "@julie" }] });
    expect(res.ok && res.affiliate.status).toBe("pending");
    expect(res.ok && res.affiliate.email).toBe("julie@example.com");
    expect(col("profiles").size).toBe(0);
    const id = res.ok ? res.affiliate._id : "";
    const review = await aff.reviewAffiliate(id, "approve");
    expect(review.affiliate?.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(review.passwordToken).toBeTruthy();
    expect((await aff.affiliateByCode(review.affiliate!.code!.toLowerCase()))?._id).toBe(id);
  });

  it("lets a pending or refused application be completed, not an approved one", async () => {
    const first = await aff.applyAffiliate({ name: "Marc", email: "marc@example.com" }, { socials: [{ platform: "youtube", url: "@marc" }] });
    const again = await aff.applyAffiliate({ name: "Marc D.", email: "marc@example.com" }, { socials: [{ platform: "youtube", url: "@marcd" }] });
    expect(again.ok && again.affiliate._id).toBe(first.ok && first.affiliate._id);
    expect(again.ok && again.created).toBe(false);
    await aff.reviewAffiliate(first.ok ? first.affiliate._id : "", "approve");
    expect(await aff.applyAffiliate({ name: "Marc", email: "marc@example.com" }, { socials: [{ platform: "youtube", url: "@marc" }] })).toEqual({ ok: false, error: "already" });
  });

  it("makes codes that are easy to read", () => {
    for (let i = 0; i < 200; i++) expect(aff.randomCode()).toMatch(/^[^01OIL]{6}$/);
  });
});

describe("password", () => {
  it("is chosen with the emailed link, once, then used to sign in", async () => {
    const res = await aff.applyAffiliate({ name: "Julie", email: "julie@example.com" }, { socials: [{ platform: "instagram", url: "@julie" }] });
    const id = res.ok ? res.affiliate._id : "";
    expect(await aff.verifyAffiliateLogin("julie@example.com", "anything-long")).toBeNull();
    const { passwordToken } = await aff.reviewAffiliate(id, "approve");
    expect(await aff.setPasswordWithToken(id, "wrong-token", "correct horse battery")).toBeNull();
    expect(await aff.setPasswordWithToken(id, passwordToken!, "short")).toBeNull();
    expect((await aff.setPasswordWithToken(id, passwordToken!, "correct horse battery"))?.sessionVersion).toBe(1);
    // The link works only once.
    expect(await aff.setPasswordWithToken(id, passwordToken!, "another password")).toBeNull();
    expect((await aff.verifyAffiliateLogin(" JULIE@example.com", "correct horse battery"))?._id).toBe(id);
    expect(await aff.verifyAffiliateLogin("julie@example.com", "wrong password")).toBeNull();
  });

  it("can be reset by approved affiliates only", async () => {
    await aff.applyAffiliate({ name: "Pending", email: "pending@example.com" }, { socials: [{ platform: "instagram", url: "@p" }] });
    expect(await aff.passwordResetFor("pending@example.com")).toBeNull();
    expect(await aff.passwordResetFor("nobody@example.com")).toBeNull();
    const a = await approvedAffiliate();
    expect((await aff.passwordResetFor("julie@example.com"))?.affiliate._id).toBe(a._id);
  });
});

describe("referrals and commissions", () => {
  it("links a new account to the affiliate, once, and never to themselves", async () => {
    const a = await approvedAffiliate();
    await referredCustomer(a.code!);
    expect(col("profiles").get("customer")?.referral).toMatchObject({ affiliateId: a._id, code: a.code });
    profile("me");
    expect(await aff.attachReferral("me", a.code!, { email: "julie@example.com" })).toBe("self");
    const other = await approvedAffiliate("marc@example.com", "Marc");
    expect(await aff.attachReferral("customer", other.code!)).toBe("already");
    profile("old", { createdAt: new Date(Date.now() - 40 * DAY) });
    expect(await aff.attachReferral("old", a.code!, { late: true })).toBe("too_late");
    profile("subscriber", { subscription: { subscriptionId: "sub_1" } });
    expect(await aff.attachReferral("subscriber", a.code!, { late: true })).toBe("too_late");
  });

  it("pays 25 % of each payment for 12 months, once per payment", async () => {
    const a = await approvedAffiliate();
    await referredCustomer(a.code!);
    const start = new Date("2026-01-10T10:00:00Z");
    const c = await aff.recordCommission({ id: "stripe:in_1", customerId: "customer", source: "stripe", net: 41.66, currency: "eur", at: start });
    expect(c?.amount).toBe(10.42);
    expect(c?.currency).toBe("EUR");
    expect(await aff.recordCommission({ id: "stripe:in_1", customerId: "customer", source: "stripe", net: 41.66, currency: "eur", at: start })).toBeNull();
    expect(await aff.recordCommission({ id: "stripe:in_2", customerId: "customer", source: "stripe", net: 5.83, currency: "eur", at: new Date("2026-12-20T10:00:00Z") })).not.toBeNull();
    expect(await aff.recordCommission({ id: "stripe:in_3", customerId: "customer", source: "stripe", net: 41.66, currency: "eur", at: new Date("2027-01-15T10:00:00Z") })).toBeNull();
    profile("direct");
    expect(await aff.recordCommission({ id: "stripe:in_4", customerId: "direct", source: "stripe", net: 41.66, currency: "eur" })).toBeNull();
  });

  it("stops earning while suspended", async () => {
    const a = await approvedAffiliate();
    await referredCustomer(a.code!);
    await aff.reviewAffiliate(a._id, "suspend");
    expect(await aff.recordCommission({ id: "stripe:x", customerId: "customer", source: "stripe", net: 10, currency: "EUR" })).toBeNull();
    expect(await aff.affiliateByCode(a.code!)).toBeNull();
  });

  it("works out what Sorloo really receives", () => {
    expect(aff.netOfStripeInvoice({ amount_paid: 4999, total: 4999, total_taxes: [] })).toBe(41.66);
    expect(aff.netOfStripeInvoice({ amount_paid: 4999, total: 4999, total_taxes: [{ amount: 833 }] })).toBe(41.66);
    expect(aff.netOfStorePurchase({ price_in_purchased_currency: 49.99, tax_percentage: 0.1667, commission_percentage: 0.15 })).toBe(35.41);
  });
});

describe("payouts", () => {
  const address = { line1: "1 rue de la Paix", postalCode: "75002", city: "Paris", country: "FR" };

  async function withAvailable(amounts: number[]) {
    const a = await approvedAffiliate();
    await referredCustomer(a.code!);
    const old = new Date(Date.now() - 40 * DAY);
    for (const [i, net] of amounts.entries()) await aff.recordCommission({ id: `rc:${i}`, customerId: "customer", source: "app_store", net, currency: "EUR", at: old });
    return a;
  }

  it("checks the payment details and keeps the IBAN encrypted", async () => {
    const a = await approvedAffiliate();
    expect(await aff.savePayoutProfile(a._id, { kind: "individual", legalName: "Julie Martin", address, holder: "Julie Martin", iban: "FR76 3000 6000 0112 3456 7890 188" })).toEqual({ ok: false, error: "iban" });
    expect(await aff.savePayoutProfile(a._id, { kind: "business", legalName: "Julie Martin EI", address, siret: "123", holder: "Julie Martin", iban: IBAN })).toEqual({ ok: false, error: "siret" });
    expect(await aff.savePayoutProfile(a._id, { kind: "business", legalName: "Julie Martin EI", address, siret: "12345678900012", vat: "franchise", holder: "Julie Martin", iban: IBAN })).toEqual({ ok: false, error: "mandate" });
    expect(await aff.savePayoutProfile(a._id, { kind: "individual", legalName: "Julie Martin", address, holder: "Julie Martin", iban: IBAN })).toEqual({ ok: true });
    const saved = (await aff.getAffiliate(a._id))!.payout!;
    expect(JSON.stringify(saved)).not.toContain("300060000112");
    expect(saved.ibanMasked).toBe("FR76 •••• •••• 0189");
    expect(aff.revealIban(saved.iban)).toBe("FR7630006000011234567890189");
    // Saving again without an IBAN keeps the one already saved.
    expect(await aff.savePayoutProfile(a._id, { kind: "individual", legalName: "Julie M.", address, holder: "Julie Martin" })).toEqual({ ok: true });
    expect((await aff.getAffiliate(a._id))!.payout!.ibanMasked).toBe("FR76 •••• •••• 0189");
  });

  it("opens from 50 € available, reserves the commissions and numbers the document", async () => {
    const a = await withAvailable([80, 80, 80]);
    // 3 × 20 € = 60 € available, but no payment details yet.
    expect(await aff.requestPayout(a._id)).toEqual({ ok: false, error: "profile" });
    await aff.savePayoutProfile(a._id, { kind: "individual", legalName: "Julie Martin", address, holder: "Julie Martin", iban: IBAN });
    const res = await aff.requestPayout(a._id);
    expect(res.ok).toBe(true);
    const p = res.ok ? res.payout : null!;
    expect(p.kind).toBe("statement");
    expect(p.number).toBe(`RC-${new Date().getFullYear()}-0001`);
    expect(p.total).toBe(60);
    expect(p.lines).toHaveLength(3);
    // A second click finds nothing left to ask for.
    expect(await aff.requestPayout(a._id)).toEqual({ ok: false, error: "minimum" });
    let stats = await aff.affiliateStats((await aff.getAffiliate(a._id))!);
    expect(stats.totals[0]).toMatchObject({ available: 0, requested: 60, paid: 0 });
    await aff.markPayoutPaid(p._id);
    stats = await aff.affiliateStats((await aff.getAffiliate(a._id))!);
    expect(stats.totals[0]).toMatchObject({ requested: 0, paid: 60 });
    expect(aff.paidByYear(await aff.listPayouts())[`${a._id}:${new Date().getFullYear()}`]).toBe(60);
    // A paid commission can't be cancelled by a late refund.
    expect(await aff.cancelCommission("rc:0")).toBe(false);
  });

  it("stays locked under 50 € and gives cancelled requests back", async () => {
    const a = await withAvailable([80, 80]);
    await aff.savePayoutProfile(a._id, { kind: "individual", legalName: "Julie Martin", address, holder: "Julie Martin", iban: IBAN });
    expect(await aff.requestPayout(a._id)).toEqual({ ok: false, error: "minimum" });
    let stats = await aff.affiliateStats((await aff.getAffiliate(a._id))!);
    expect(stats.totals[0]).toMatchObject({ available: 40, requested: 0 });
    await aff.recordCommission({ id: "rc:new", customerId: "customer", source: "app_store", net: 80, currency: "EUR", at: new Date(Date.now() - 31 * DAY) });
    const res = await aff.requestPayout(a._id);
    expect(res.ok).toBe(true);
    expect(await aff.cancelPayout(res.ok ? res.payout._id : "")).toBe(true);
    stats = await aff.affiliateStats((await aff.getAffiliate(a._id))!);
    expect(stats.totals[0]).toMatchObject({ available: 60, requested: 0 });
  });

  it("writes a self-billed invoice for professionals, with VAT when they charge it", async () => {
    const a = await withAvailable([100, 100]);
    await aff.savePayoutProfile(a._id, { kind: "business", legalName: "Julie Martin EI", address, siret: "12345678900012", vat: "fr_vat", vatNumber: "FR12345678901", acceptMandate: true, holder: "Julie Martin", iban: IBAN });
    const res = await aff.requestPayout(a._id);
    const p = res.ok ? res.payout : null!;
    expect(p.kind).toBe("invoice");
    expect(p.number).toMatch(/^AF-\d{4}-0001$/);
    expect(p).toMatchObject({ amount: 50, vat: 10, total: 60 });
    const pdf = await payoutPdf(p);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("prints a statement for individuals, whatever letters their name has", async () => {
    const a = await withAvailable([100, 100]);
    await aff.savePayoutProfile(a._id, { kind: "individual", legalName: "Łukasz Żółć", address: { ...address, country: "PL" }, holder: "Łukasz Żółć", iban: "PL61109010140000071219812874" });
    const res = await aff.requestPayout(a._id);
    const pdf = await payoutPdf(res.ok ? res.payout : null!);
    expect(pdf.length).toBeGreaterThan(1000);
  });
});

describe("social profiles", () => {
  it("opens them safely", () => {
    expect(aff.socialHref({ platform: "tiktok", url: "@julie.cuisine" })).toBe("https://www.tiktok.com/@julie.cuisine");
    expect(aff.socialHref({ platform: "youtube", url: "https://youtube.com/@julie" })).toBe("https://youtube.com/@julie");
    expect(aff.socialHref({ platform: "instagram", url: "javascript:alert(1)" })).toBeNull();
    expect(aff.socialHref({ platform: "blog", url: "julie" })).toBeNull();
  });
});
