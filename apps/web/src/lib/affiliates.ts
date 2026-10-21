import "server-only";
import { db, ensureIndexes } from "./db";
import { getProfile, updateProfile } from "./repo";
import type { Profile } from "./types";
export type { Referral } from "./types";

/**
 * Affiliate programme. Creators apply with their social networks; the admin
 * approves them. Each approved affiliate gets a code and a link
 * (sorloo.com/r/CODE). People who sign up through it are linked to the
 * affiliate for good, and every payment they make in their first 12 months
 * of subscription (website or app) earns the affiliate 25 % of what Sorloo
 * actually receives (excluding VAT, after Apple's or Google's share).
 */
export const COMMISSION_RATE = 0.25;
export const COMMISSION_MONTHS = 12;
/** Commissions wait this long before they can be paid (refunds). */
export const HOLD_DAYS = 30;
/** Smallest amount paid out. */
export const PAYOUT_MIN = 50;
export const REF_COOKIE = "sorloo_ref";
export const REF_COOKIE_DAYS = 60;
/** A code typed after sign-up is still accepted for this long. */
export const LATE_CODE_DAYS = 30;
/** French VAT included in the website prices when the invoice carries no tax line. */
const VAT_INCLUDED = 0.2;

export const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "x", "twitch", "pinterest", "snapchat", "blog", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface Social {
  platform: Platform;
  /** Profile address or @handle */
  url: string;
  followers?: number;
}

const PROFILE_URL: Partial<Record<Platform, (handle: string) => string>> = {
  instagram: (h) => `https://www.instagram.com/${h}/`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  x: (h) => `https://x.com/${h}`,
  twitch: (h) => `https://www.twitch.tv/${h}`,
  pinterest: (h) => `https://www.pinterest.com/${h}/`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
};

/** A safe address to open a profile (a full https link, or a @handle on a known network). */
export function socialHref(s: Social): string | null {
  const v = s.url.trim();
  if (/^https?:\/\/[^\s]+$/i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  if (!/^[\w.\-]{1,60}$/.test(handle)) return null;
  return PROFILE_URL[s.platform]?.(handle) ?? null;
}

export type AffiliateStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Affiliate {
  /** The affiliate's Sorloo user id */
  _id: string;
  name: string;
  email: string;
  status: AffiliateStatus;
  socials: Social[];
  /** How they plan to talk about Sorloo */
  message?: string;
  /** Given on approval */
  code?: string;
  clicks: number;
  appliedAt: Date;
  reviewedAt?: Date;
}

export type CommissionSource = "stripe" | "app_store" | "play_store";

export interface Commission {
  /** "stripe:<invoice>" or "rc:<transaction>": one commission per payment */
  _id: string;
  affiliateId: string;
  /** The paying customer (pseudonymous id, never shown to the affiliate) */
  customerId: string;
  source: CommissionSource;
  /** What Sorloo received, excluding VAT and store fees */
  net: number;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "cancelled";
  at: Date;
  availableAt: Date;
  paidAt?: Date;
}

const affiliates = () => db.collection<Affiliate>("affiliates");
const commissions = () => db.collection<Commission>("commissions");
const DAY = 86400_000;
const round = (n: number) => Math.round(n * 100) / 100;

export const normalizeCode = (code: unknown) => (typeof code === "string" ? code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) : "");

export async function getAffiliate(userId: string): Promise<Affiliate | null> {
  await ensureIndexes();
  return affiliates().findOne({ _id: userId });
}

export async function affiliateByCode(code: string): Promise<Affiliate | null> {
  const c = normalizeCode(code);
  if (!c) return null;
  await ensureIndexes();
  return affiliates().findOne({ code: c, status: "approved" });
}

/** New application, or a new try after a refusal. Approved affiliates only update their networks. */
export async function applyAffiliate(user: { id: string; name: string; email: string }, input: { socials: Social[]; message?: string }): Promise<Affiliate> {
  await ensureIndexes();
  const existing = await affiliates().findOne({ _id: user.id });
  const now = new Date();
  if (!existing) {
    const doc: Affiliate = { _id: user.id, name: user.name, email: user.email, status: "pending", socials: input.socials, message: input.message, clicks: 0, appliedAt: now };
    await affiliates().insertOne(doc);
    return doc;
  }
  const status: AffiliateStatus = existing.status === "rejected" ? "pending" : existing.status;
  await affiliates().updateOne(
    { _id: user.id },
    { $set: { socials: input.socials, message: input.message, name: user.name, email: user.email, status, ...(status !== existing.status ? { appliedAt: now } : {}) } },
  );
  return { ...existing, socials: input.socials, message: input.message, status };
}

/** A short, readable code from the name ("Julie Martin" → JULIEMARTIN), unique. */
async function freeCode(name: string): Promise<string> {
  const base = normalizeCode(name.normalize("NFD").replace(/[̀-ͯ]/g, "")).slice(0, 12) || "SORLOO";
  for (let i = 0; i < 50; i++) {
    const code = i === 0 ? base : `${base}${i + 1}`;
    if (!(await affiliates().findOne({ code }, { projection: { _id: 1 } }))) return code;
  }
  return `${base}${Date.now().toString(36).toUpperCase()}`;
}

export async function reviewAffiliate(id: string, decision: "approve" | "reject" | "suspend", wantedCode?: string): Promise<{ ok: boolean; error?: "taken" | "missing"; affiliate?: Affiliate }> {
  await ensureIndexes();
  const a = await affiliates().findOne({ _id: id });
  if (!a) return { ok: false, error: "missing" };
  const status: AffiliateStatus = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "suspended";
  let code = a.code;
  if (decision === "approve") {
    const wanted = normalizeCode(wantedCode);
    if (wanted && wanted !== a.code) {
      if (await affiliates().findOne({ code: wanted, _id: { $ne: id } }, { projection: { _id: 1 } })) return { ok: false, error: "taken" };
      code = wanted;
    }
    code ??= await freeCode(a.name);
  }
  await affiliates().updateOne({ _id: id }, { $set: { status, reviewedAt: new Date(), ...(code ? { code } : {}) } });
  return { ok: true, affiliate: { ...a, status, code } };
}

/** A visit through the link (counted once per browser). */
export async function recordClick(code: string): Promise<Affiliate | null> {
  const a = await affiliateByCode(code);
  if (a) await affiliates().updateOne({ _id: a._id }, { $inc: { clicks: 1 } });
  return a;
}

/**
 * Links a new account to the affiliate whose link or code brought it. Never
 * changes an existing link, never links someone to themselves or someone who
 * already paid for Premium.
 */
export async function attachReferral(userId: string, code: string, opts: { late?: boolean } = {}): Promise<"ok" | "invalid" | "already" | "self" | "too_late"> {
  const a = await affiliateByCode(code);
  if (!a) return "invalid";
  if (a._id === userId) return "self";
  const profile = await getProfile(userId);
  if (!profile) return "invalid";
  if (profile.referral) return profile.referral.affiliateId === a._id ? "ok" : "already";
  if (opts.late && !codeStillAccepted(profile)) return "too_late";
  await updateProfile(userId, { referral: { affiliateId: a._id, code: a.code!, at: new Date() } });
  return "ok";
}

/** A creator's code can still be typed: young account, never paid for Premium. */
export function codeStillAccepted(profile: Pick<Profile, "referral" | "subscription" | "store" | "createdAt">): boolean {
  if (profile.referral) return false;
  const paid = !!profile.subscription?.subscriptionId || !!profile.store;
  return !paid && Date.now() - new Date(profile.createdAt).getTime() <= LATE_CODE_DAYS * DAY;
}

/** Records the affiliate's share of a payment (idempotent: one commission per payment id). */
export async function recordCommission(input: { id: string; customerId: string; source: CommissionSource; net: number; currency: string; at?: Date }): Promise<Commission | null> {
  if (!(input.net > 0)) return null;
  const profile = await getProfile(input.customerId);
  const ref = profile?.referral;
  if (!profile || !ref) return null;
  const at = input.at ?? new Date();
  const first = ref.firstPaidAt ?? at;
  const end = new Date(first);
  end.setMonth(end.getMonth() + COMMISSION_MONTHS);
  if (at > end) return null;
  const affiliate = await affiliates().findOne({ _id: ref.affiliateId });
  // A suspended affiliate earns nothing on new payments.
  if (affiliate?.status !== "approved") return null;
  if (!ref.firstPaidAt) await updateProfile(profile._id, { referral: { ...ref, firstPaidAt: first } });
  const doc: Commission = {
    _id: input.id,
    affiliateId: ref.affiliateId,
    customerId: input.customerId,
    source: input.source,
    net: round(input.net),
    amount: round(input.net * COMMISSION_RATE),
    currency: input.currency.toUpperCase(),
    status: "pending",
    at,
    availableAt: new Date(at.getTime() + HOLD_DAYS * DAY),
  };
  try {
    await commissions().insertOne(doc);
  } catch (e) {
    // Webhooks are retried: the same payment is only counted once.
    if ((e as { code?: number }).code === 11000) return null;
    throw e;
  }
  return doc;
}

/** Refund: the commission is dropped if it was not paid out yet. */
export async function cancelCommission(id: string): Promise<boolean> {
  const res = await commissions().updateOne({ _id: id, status: "pending" }, { $set: { status: "cancelled" } });
  return res.modifiedCount > 0;
}

/** Website payment: the amount without VAT. */
export function netOfStripeInvoice(invoice: { amount_paid: number; total_excluding_tax?: number | null; total_taxes?: { amount: number }[] | null; total: number }): number {
  const paid = invoice.amount_paid / 100;
  const taxes = (invoice.total_taxes ?? []).reduce((s, t) => s + t.amount, 0);
  if (taxes > 0 && invoice.total > 0) return round(paid * (1 - taxes / invoice.total));
  return round(paid / (1 + VAT_INCLUDED));
}

/** App payment: the price without VAT and without the store's share, as reported by RevenueCat. */
export function netOfStorePurchase(event: { price_in_purchased_currency?: number | null; tax_percentage?: number | null; commission_percentage?: number | null }): number {
  const price = event.price_in_purchased_currency ?? 0;
  const tax = event.tax_percentage ?? VAT_INCLUDED / (1 + VAT_INCLUDED);
  const fee = event.commission_percentage ?? 0.15;
  return round(price * (1 - tax) * (1 - fee));
}

export interface Totals {
  currency: string;
  /** Waiting for the refund period */
  pending: number;
  /** Can be paid */
  available: number;
  paid: number;
}

function totalsOf(list: Commission[], now: number): Totals[] {
  const by = new Map<string, Totals>();
  for (const c of list) {
    if (c.status === "cancelled") continue;
    const t = by.get(c.currency) ?? { currency: c.currency, pending: 0, available: 0, paid: 0 };
    if (c.status === "paid") t.paid += c.amount;
    else if (c.availableAt.getTime() <= now) t.available += c.amount;
    else t.pending += c.amount;
    by.set(c.currency, t);
  }
  return [...by.values()].map((t) => ({ ...t, pending: round(t.pending), available: round(t.available), paid: round(t.paid) }));
}

export interface AffiliateStats {
  clicks: number;
  signups: number;
  customers: number;
  totals: Totals[];
  recent: { at: Date; source: CommissionSource; amount: number; currency: string; status: "pending" | "available" | "paid" | "cancelled" }[];
}

export async function affiliateStats(a: Affiliate, now = Date.now()): Promise<AffiliateStats> {
  const [signups, list] = await Promise.all([
    db.collection("profiles").countDocuments({ "referral.affiliateId": a._id }),
    commissions().find({ affiliateId: a._id }, { sort: { at: -1 } }).toArray(),
  ]);
  return {
    clicks: a.clicks,
    signups,
    customers: new Set(list.filter((c) => c.status !== "cancelled").map((c) => c.customerId)).size,
    totals: totalsOf(list, now),
    recent: list.slice(0, 30).map((c) => ({
      at: c.at,
      source: c.source,
      amount: c.amount,
      currency: c.currency,
      status: c.status === "pending" && c.availableAt.getTime() <= now ? "available" : c.status,
    })),
  };
}

/** Everything the admin page shows, newest applications first. */
export async function allAffiliates(now = Date.now()): Promise<(Affiliate & { stats: AffiliateStats })[]> {
  await ensureIndexes();
  const list = await affiliates().find({}, { sort: { appliedAt: -1 } }).toArray();
  return Promise.all(list.map(async (a) => ({ ...a, stats: await affiliateStats(a, now) })));
}

/** After the bank transfer: the available commissions become paid. */
export async function markPaid(affiliateId: string, now = new Date()): Promise<number> {
  const res = await commissions().updateMany({ affiliateId, status: "pending", availableAt: { $lte: now } }, { $set: { status: "paid", paidAt: now } });
  return res.modifiedCount;
}

/** Account deletion: the application goes; commissions stay for the accounts (no personal data in them). */
export async function deleteAffiliateData(userId: string): Promise<void> {
  await affiliates().deleteOne({ _id: userId });
  await commissions().updateMany({ customerId: userId }, { $set: { customerId: "deleted" } });
}
