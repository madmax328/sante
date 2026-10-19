import "server-only";
import { isSpamName } from "./auth";
import { db } from "./db";
import { deleteAllData } from "./repo";
import { cancelSubscriptionNow } from "./stripe";
import { hasStorePremium } from "./premium";
import { deleteStoreCustomer } from "./revenuecat";
import type { Profile } from "./types";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  onboarded: boolean;
  plan: "premium" | "trial" | "free";
  suspect: boolean;
}

export type UserFilter = "all" | "unconfirmed" | "suspect" | "premium";
export const PAGE_SIZE = 50;

interface UserDoc {
  _id: unknown;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
}

const users = () => db.collection<UserDoc>("user");
const PAYING = ["active", "trialing", "past_due"];

/** A name that looks typed by a robot: a link, or random letters ("XkQwPzLm"). */
function strangeName(name: string): boolean {
  const n = name.trim();
  if (isSpamName(n)) return true;
  if (!n) return true;
  const word = n.replace(/\s+/g, "");
  const innerCaps = (word.slice(1).match(/[A-Z]/g) ?? []).length;
  return (word.length >= 6 && !/\s/.test(n) && innerCaps >= 3) || /[bcdfghjklmnpqrstvwxz]{5,}/i.test(word);
}

/**
 * Probably a robot: a strange name, or an address never confirmed and the
 * questionnaire never started, more than a day after signing up.
 */
function isSuspect(u: UserDoc, p: Profile | undefined): boolean {
  if (strangeName(u.name)) return true;
  return !u.emailVerified && !p?.onboarded && Date.now() - u.createdAt.getTime() > 86400_000;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listUsers(opts: { q?: string; filter?: UserFilter; page?: number }): Promise<{ users: AdminUser[]; total: number; pages: number }> {
  const q = opts.q?.trim();
  const query: Record<string, unknown> = {};
  if (q) query.$or = [{ email: { $regex: escape(q), $options: "i" } }, { name: { $regex: escape(q), $options: "i" } }];
  if (opts.filter === "unconfirmed") query.emailVerified = { $ne: true };

  // Suspect and premium depend on the profiles: computed over every match, then paged.
  const all = await users().find(query, { sort: { createdAt: -1 } }).toArray();
  const profiles = await db
    .collection<Profile>("profiles")
    .find({ _id: { $in: all.map((u) => String(u._id)) } }, { projection: { onboarded: 1, subscription: 1 } })
    .toArray();
  const byId = new Map(profiles.map((p) => [p._id, p]));
  let rows: AdminUser[] = all.map((u) => {
    const p = byId.get(String(u._id));
    const status = p?.subscription?.status;
    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      emailVerified: !!u.emailVerified,
      createdAt: u.createdAt,
      onboarded: !!p?.onboarded,
      plan: status === "trialing" ? "trial" : status && PAYING.includes(status) ? "premium" : "free",
      suspect: isSuspect(u, p),
    };
  });
  if (opts.filter === "suspect") rows = rows.filter((u) => u.suspect && u.plan === "free");
  if (opts.filter === "premium") rows = rows.filter((u) => u.plan !== "free");
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page ?? 1), pages);
  return { users: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: rows.length, pages };
}

/** Deletes accounts and all their data. Subscribers are never deleted here. */
export async function deleteUsers(ids: string[]): Promise<{ deleted: number; skipped: number }> {
  let deleted = 0;
  let skipped = 0;
  for (const id of [...new Set(ids)].slice(0, 500)) {
    const p = await db.collection<Profile>("profiles").findOne({ _id: id }, { projection: { subscription: 1, store: 1 } });
    if ((p?.subscription?.status && PAYING.includes(p.subscription.status)) || hasStorePremium(p)) {
      skipped++;
      continue;
    }
    await cancelSubscriptionNow(id);
    await deleteStoreCustomer(id);
    await deleteAllData(id);
    deleted++;
  }
  return { deleted, skipped };
}
