import "server-only";
import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Locale } from "@weeko/engine";
import { seal, unseal, type Sealed } from "./crypto";
import { db, ensureIndexes } from "./db";
import { cleanIban, isValidIban, maskIban } from "./iban";
import { getProfile, updateProfile } from "./repo";
import type { Profile } from "./types";
export type { Referral } from "./types";

/**
 * Affiliate programme. Creators apply from the public page (no Sorloo
 * account needed) with their social networks; the admin approves them. An
 * approved affiliate sets a password, gets a random code and a link
 * (sorloo.com/r/CODE). People who sign up through it are linked to the
 * affiliate for good, and every payment they make in their first 12 months
 * of subscription (website or app) earns the affiliate 25 % of what Sorloo
 * actually receives (excluding VAT, after Apple's or Google's share).
 * From 50 € available, the affiliate asks for a payout; the admin gets the
 * invoice (self-billing, for professionals) or the statement (individuals).
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
/** A link to choose the password works this long. */
const PASSWORD_LINK_DAYS = 7;
/** French VAT included in the website prices when the invoice carries no tax line. */
const VAT_INCLUDED = 0.2;
/** VAT added to the commission of a French business that charges VAT. */
export const FR_VAT_RATE = 0.2;
export const PASSWORD_MIN = 10;

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

/** How the affiliate is paid. Individuals get a statement, professionals a self-billed invoice. */
export type VatRegime = "franchise" | "fr_vat" | "eu_reverse";
export interface PayoutProfile {
  kind: "individual" | "business";
  /** Full name, or company name */
  legalName: string;
  address: { line1: string; line2?: string; postalCode: string; city: string; country: string };
  siret?: string;
  vat?: VatRegime;
  vatNumber?: string;
  /** Accepted once by professionals: Sorloo issues their invoices */
  mandateAt?: Date;
  holder: string;
  iban: Sealed;
  ibanMasked: string;
  updatedAt: Date;
}

export interface Affiliate {
  /** Random id (the Sorloo user id for the first affiliates, made with an account) */
  _id: string;
  name: string;
  email: string;
  locale?: Locale;
  status: AffiliateStatus;
  socials: Social[];
  /** How they plan to talk about Sorloo */
  message?: string;
  /** Given on approval */
  code?: string;
  clicks: number;
  appliedAt: Date;
  reviewedAt?: Date;
  password?: { hash: string; salt: string; setAt: Date };
  /** Choosing or resetting the password: only the hash of the emailed token is kept */
  reset?: { tokenHash: string; expiresAt: Date };
  /** Changing the password signs out every open session. */
  sessionVersion?: number;
  payout?: PayoutProfile;
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
  /** requested: part of a payout request not paid yet */
  status: "pending" | "requested" | "paid" | "cancelled";
  at: Date;
  availableAt: Date;
  payoutId?: string;
  paidAt?: Date;
}

export interface Payout {
  _id: string;
  /** AF-2026-0001 (self-billed invoice) or RC-2026-0001 (statement for an individual) */
  number: string;
  kind: "invoice" | "statement";
  affiliateId: string;
  currency: string;
  /** Commissions, excluding VAT */
  amount: number;
  vat: number;
  /** What is transferred */
  total: number;
  commissionIds: string[];
  lines: { at: Date; source: CommissionSource; net: number; amount: number }[];
  period: { from: Date; to: Date };
  /** Payment details at the time of the request (they appear on the document) */
  payee: Omit<PayoutProfile, "updatedAt">;
  status: "requested" | "paid" | "cancelled";
  requestedAt: Date;
  paidAt?: Date;
}

const affiliates = () => db.collection<Affiliate>("affiliates");
const commissions = () => db.collection<Commission>("commissions");
const payouts = () => db.collection<Payout>("affiliate_payouts");
const counters = () => db.collection<{ _id: string; seq: number }>("counters");
const DAY = 86400_000;
const round = (n: number) => Math.round(n * 100) / 100;
const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const normalizeCode = (code: unknown) => (typeof code === "string" ? code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) : "");
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function getAffiliate(id: string): Promise<Affiliate | null> {
  await ensureIndexes();
  return affiliates().findOne({ _id: id });
}

export async function affiliateByCode(code: string): Promise<Affiliate | null> {
  const c = normalizeCode(code);
  if (!c) return null;
  await ensureIndexes();
  return affiliates().findOne({ code: c, status: "approved" });
}

// ---------------------------------------------------------------- Application

/**
 * Application from the public page. The same email can complete a pending
 * application or apply again after a refusal; an existing affiliate is told
 * to sign in instead.
 */
export async function applyAffiliate(
  person: { name: string; email: string; locale?: Locale },
  input: { socials: Social[]; message?: string },
): Promise<{ ok: true; affiliate: Affiliate; created: boolean } | { ok: false; error: "already" }> {
  await ensureIndexes();
  const email = normalizeEmail(person.email);
  const existing = await affiliates().findOne({ email });
  const now = new Date();
  if (!existing) {
    const doc: Affiliate = { _id: randomBytes(12).toString("hex"), name: person.name.trim(), email, locale: person.locale, status: "pending", socials: input.socials, message: input.message, clicks: 0, appliedAt: now };
    await affiliates().insertOne(doc);
    return { ok: true, affiliate: doc, created: true };
  }
  if (existing.status === "approved" || existing.status === "suspended") return { ok: false, error: "already" };
  const set = { name: person.name.trim(), locale: person.locale ?? existing.locale, socials: input.socials, message: input.message, status: "pending" as const, ...(existing.status === "rejected" ? { appliedAt: now } : {}) };
  await affiliates().updateOne({ _id: existing._id }, { $set: set });
  return { ok: true, affiliate: { ...existing, ...set }, created: existing.status === "rejected" };
}

/** Easy to read out and type: no 0/O, 1/I/L. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function randomCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

async function freeCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = randomCode(i < 10 ? 6 : 8);
    if (!(await affiliates().findOne({ code }, { projection: { _id: 1 } }))) return code;
  }
  throw new Error("No free affiliate code");
}

/**
 * The admin's decision. On approval the affiliate gets a random code (kept if
 * they already had one) and, without a password yet, a link to choose it.
 */
export async function reviewAffiliate(id: string, decision: "approve" | "reject" | "suspend"): Promise<{ ok: boolean; affiliate?: Affiliate; passwordToken?: string }> {
  await ensureIndexes();
  const a = await affiliates().findOne({ _id: id });
  if (!a) return { ok: false };
  const status: AffiliateStatus = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "suspended";
  const code = decision === "approve" ? (a.code ?? (await freeCode())) : a.code;
  await affiliates().updateOne({ _id: id }, { $set: { status, reviewedAt: new Date(), ...(code ? { code } : {}) } });
  const affiliate = { ...a, status, code };
  const passwordToken = decision === "approve" && !a.password ? await issuePasswordToken(id) : undefined;
  return { ok: true, affiliate, passwordToken };
}

/** A visit through the link (counted once per browser). */
export async function recordClick(code: string): Promise<Affiliate | null> {
  const a = await affiliateByCode(code);
  if (a) await affiliates().updateOne({ _id: a._id }, { $inc: { clicks: 1 } });
  return a;
}

// ---------------------------------------------------------------- Password

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, 64);
  return { hash: hash.toString("base64"), salt: salt.toString("base64") };
}

async function checkPassword(password: string, stored: { hash: string; salt: string }): Promise<boolean> {
  const hash = await scrypt(password.normalize("NFKC"), Buffer.from(stored.salt, "base64"), 64);
  const expected = Buffer.from(stored.hash, "base64");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

/** A one-time link to choose (or reset) the password; returns the token to email. */
export async function issuePasswordToken(id: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await affiliates().updateOne({ _id: id }, { $set: { reset: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + PASSWORD_LINK_DAYS * DAY) } } });
  return token;
}

/** Forgotten password: a link for approved affiliates only (nothing tells whether the email exists). */
export async function passwordResetFor(email: string): Promise<{ affiliate: Affiliate; token: string } | null> {
  await ensureIndexes();
  const a = await affiliates().findOne({ email: normalizeEmail(email) });
  if (!a || (a.status !== "approved" && a.status !== "suspended")) return null;
  return { affiliate: a, token: await issuePasswordToken(a._id) };
}

export async function setPasswordWithToken(id: string, token: string, password: string): Promise<Affiliate | null> {
  if (password.length < PASSWORD_MIN || password.length > 200) return null;
  const a = await affiliates().findOne({ _id: id });
  if (!a?.reset || a.reset.expiresAt < new Date()) return null;
  const given = Buffer.from(sha256(token));
  const expected = Buffer.from(a.reset.tokenHash);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const pw = await hashPassword(password);
  const sessionVersion = (a.sessionVersion ?? 0) + 1;
  await affiliates().updateOne({ _id: id }, { $set: { password: { ...pw, setAt: new Date() }, sessionVersion }, $unset: { reset: "" } });
  return { ...a, password: { ...pw, setAt: new Date() }, sessionVersion, reset: undefined };
}

/** Sign-in with email and password (approved or suspended affiliates). */
export async function verifyAffiliateLogin(email: string, password: string): Promise<Affiliate | null> {
  await ensureIndexes();
  const a = await affiliates().findOne({ email: normalizeEmail(email) });
  if (!a?.password || (a.status !== "approved" && a.status !== "suspended")) {
    // Same work either way, so the response time tells nothing.
    await hashPassword(password);
    return null;
  }
  return (await checkPassword(password, a.password)) ? a : null;
}

// ---------------------------------------------------------------- Referrals and commissions

/**
 * Links a new account to the affiliate whose link or code brought it. Never
 * changes an existing link, never links someone to themselves or someone who
 * already paid for Premium.
 */
export async function attachReferral(userId: string, code: string, opts: { late?: boolean; email?: string } = {}): Promise<"ok" | "invalid" | "already" | "self" | "too_late"> {
  const a = await affiliateByCode(code);
  if (!a) return "invalid";
  if (a._id === userId || (opts.email && normalizeEmail(opts.email) === a.email)) return "self";
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

/** Refund: the commission is dropped if it was not requested or paid out yet. */
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

// ---------------------------------------------------------------- Payment details

export interface PayoutProfileInput {
  kind: "individual" | "business";
  legalName: string;
  address: { line1: string; line2?: string; postalCode: string; city: string; country: string };
  siret?: string;
  vat?: VatRegime;
  vatNumber?: string;
  acceptMandate?: boolean;
  holder: string;
  /** Empty: keep the IBAN already saved */
  iban?: string;
}

export type PayoutProfileError = "iban" | "siret" | "vat_number" | "mandate" | "missing";

/** Saves how the affiliate is paid; the IBAN is encrypted and only shown masked afterwards. */
export async function savePayoutProfile(id: string, input: PayoutProfileInput): Promise<{ ok: true } | { ok: false; error: PayoutProfileError }> {
  const a = await affiliates().findOne({ _id: id });
  if (!a) return { ok: false, error: "missing" };
  const iban = input.iban ? cleanIban(input.iban) : "";
  if (iban && !isValidIban(iban)) return { ok: false, error: "iban" };
  if (!iban && !a.payout) return { ok: false, error: "iban" };
  const business = input.kind === "business";
  const siret = business ? (input.siret ?? "").replace(/\s/g, "") : undefined;
  // Outside France a business has no SIRET: a VAT number does instead.
  if (business && input.address.country === "FR" && !/^\d{14}$/.test(siret ?? "")) return { ok: false, error: "siret" };
  const vat = business ? (input.vat ?? "franchise") : undefined;
  const vatNumber = business ? input.vatNumber?.replace(/\s/g, "").toUpperCase() || undefined : undefined;
  if (business && (vat === "fr_vat" || vat === "eu_reverse" || input.address.country !== "FR") && !/^[A-Z]{2}[A-Z0-9]{2,13}$/.test(vatNumber ?? "")) return { ok: false, error: "vat_number" };
  if (business && !input.acceptMandate && !a.payout?.mandateAt) return { ok: false, error: "mandate" };
  const payout: PayoutProfile = {
    kind: input.kind,
    legalName: input.legalName.trim(),
    address: { ...input.address, line2: input.address.line2?.trim() || undefined },
    ...(business ? { siret: siret || undefined, vat, vatNumber, mandateAt: a.payout?.mandateAt ?? new Date() } : {}),
    holder: input.holder.trim(),
    iban: iban ? seal(iban) : a.payout!.iban,
    ibanMasked: iban ? maskIban(iban) : a.payout!.ibanMasked,
    updatedAt: new Date(),
  };
  await affiliates().updateOne({ _id: id }, { $set: { payout } });
  return { ok: true };
}

/** The full IBAN, for the admin making the transfer. */
export const revealIban = (sealed: Sealed) => unseal<string>(sealed);

// ---------------------------------------------------------------- Payouts

async function nextNumber(kind: Payout["kind"], year: number): Promise<string> {
  const prefix = kind === "invoice" ? "AF" : "RC";
  const res = await counters().findOneAndUpdate({ _id: `${prefix}-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return `${prefix}-${year}-${String(res?.seq ?? 1).padStart(4, "0")}`;
}

export type PayoutRequestError = "profile" | "minimum" | "suspended" | "missing";

/**
 * The affiliate asks for the available commissions of one currency. They are
 * reserved for this payout at once, so a double click can't pay them twice.
 */
export async function requestPayout(id: string, currency = "EUR", now = new Date()): Promise<{ ok: true; payout: Payout } | { ok: false; error: PayoutRequestError }> {
  const a = await affiliates().findOne({ _id: id });
  if (!a) return { ok: false, error: "missing" };
  if (!a.payout) return { ok: false, error: "profile" };
  const payoutId = randomBytes(12).toString("hex");
  await commissions().updateMany({ affiliateId: id, currency, status: "pending", availableAt: { $lte: now } }, { $set: { status: "requested", payoutId } });
  const list = (await commissions().find({ payoutId }).toArray()).sort((x, y) => +x.at - +y.at);
  const amount = round(list.reduce((s, c) => s + c.amount, 0));
  if (amount < PAYOUT_MIN) {
    await commissions().updateMany({ payoutId }, { $set: { status: "pending" }, $unset: { payoutId: "" } });
    return { ok: false, error: "minimum" };
  }
  const payee: Payout["payee"] = { ...a.payout };
  delete (payee as Partial<PayoutProfile>).updatedAt;
  const kind: Payout["kind"] = payee.kind === "business" ? "invoice" : "statement";
  const vat = kind === "invoice" && payee.vat === "fr_vat" ? round(amount * FR_VAT_RATE) : 0;
  const payout: Payout = {
    _id: payoutId,
    number: await nextNumber(kind, now.getFullYear()),
    kind,
    affiliateId: id,
    currency,
    amount,
    vat,
    total: round(amount + vat),
    commissionIds: list.map((c) => c._id),
    lines: list.map((c) => ({ at: c.at, source: c.source, net: c.net, amount: c.amount })),
    period: { from: list[0]!.at, to: list[list.length - 1]!.at },
    payee,
    status: "requested",
    requestedAt: now,
  };
  await payouts().insertOne(payout);
  return { ok: true, payout };
}

/** After the bank transfer. */
export async function markPayoutPaid(payoutId: string, now = new Date()): Promise<Payout | null> {
  const p = await payouts().findOne({ _id: payoutId, status: "requested" });
  if (!p) return null;
  await payouts().updateOne({ _id: payoutId }, { $set: { status: "paid", paidAt: now } });
  await commissions().updateMany({ payoutId }, { $set: { status: "paid", paidAt: now } });
  return { ...p, status: "paid", paidAt: now };
}

/** A request the admin won't pay (wrong details…): the commissions become available again. */
export async function cancelPayout(payoutId: string): Promise<boolean> {
  const res = await payouts().updateOne({ _id: payoutId, status: "requested" }, { $set: { status: "cancelled" } });
  if (!res.modifiedCount) return false;
  await commissions().updateMany({ payoutId, status: "requested" }, { $set: { status: "pending" }, $unset: { payoutId: "" } });
  return true;
}

export async function getPayout(payoutId: string): Promise<Payout | null> {
  return payouts().findOne({ _id: payoutId });
}

export async function listPayouts(filter: { affiliateId?: string; status?: Payout["status"] } = {}): Promise<Payout[]> {
  await ensureIndexes();
  return payouts()
    .find(Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== undefined)))
    .toArray()
    .then((l) => l.sort((x, y) => +y.requestedAt - +x.requestedAt));
}

/** Paid to each affiliate per calendar year (above 1 200 € a year, Sorloo declares it: DAS2). */
export function paidByYear(list: Payout[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of list) {
    if (p.status !== "paid" || !p.paidAt) continue;
    const key = `${p.affiliateId}:${p.paidAt.getFullYear()}`;
    out[key] = round((out[key] ?? 0) + p.total);
  }
  return out;
}

// ---------------------------------------------------------------- Stats

export interface Totals {
  currency: string;
  /** Waiting for the refund period */
  pending: number;
  /** Can be asked for */
  available: number;
  /** Asked for, transfer not made yet */
  requested: number;
  paid: number;
}

function totalsOf(list: Commission[], now: number): Totals[] {
  const by = new Map<string, Totals>();
  for (const c of list) {
    if (c.status === "cancelled") continue;
    const t = by.get(c.currency) ?? { currency: c.currency, pending: 0, available: 0, requested: 0, paid: 0 };
    if (c.status === "paid") t.paid += c.amount;
    else if (c.status === "requested") t.requested += c.amount;
    else if (c.availableAt.getTime() <= now) t.available += c.amount;
    else t.pending += c.amount;
    by.set(c.currency, t);
  }
  return [...by.values()].map((t) => ({ ...t, pending: round(t.pending), available: round(t.available), requested: round(t.requested), paid: round(t.paid) }));
}

export type CommissionView = "pending" | "available" | "requested" | "paid" | "cancelled";

export interface AffiliateStats {
  clicks: number;
  signups: number;
  customers: number;
  totals: Totals[];
  recent: { at: Date; source: CommissionSource; amount: number; currency: string; status: CommissionView }[];
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

/** Account deletion of a Sorloo user: an application made with that account goes; commissions stay for the accounts. */
export async function deleteAffiliateData(userId: string): Promise<void> {
  await affiliates().deleteOne({ _id: userId, payout: { $exists: false } });
  await commissions().updateMany({ customerId: userId }, { $set: { customerId: "deleted" } });
}
