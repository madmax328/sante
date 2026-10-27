import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAffiliate, type Affiliate } from "./affiliates";
import { db, ensureIndexes } from "./db";
import { env } from "./env";

/**
 * Affiliates sign in to their own space, separate from Sorloo accounts: a
 * signed cookie (30 days) that names the affiliate and the version of their
 * password, so changing the password signs out every other session.
 */
export const AFFILIATE_COOKIE = "sorloo_affiliate";
const TTL_MS = 30 * 86400_000;
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;

const secret = () => {
  if (!env.authSecret && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is required");
  return `${env.authSecret ?? "weeko-dev-secret"}:affiliate`;
};
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");
const same = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

/** The signed-in affiliate, if the cookie is valid and still matches their password. */
export async function currentAffiliate(): Promise<Affiliate | null> {
  const raw = (await cookies()).get(AFFILIATE_COOKIE)?.value;
  const [id, exp, version, sig] = raw?.split(".") ?? [];
  if (!id || !exp || !version || !sig || Number(exp) < Date.now()) return null;
  if (!same(sig, sign(`${id}.${exp}.${version}`))) return null;
  const a = await getAffiliate(id);
  if (!a?.password || String(a.sessionVersion ?? 0) !== version) return null;
  if (a.status !== "approved" && a.status !== "suspended") return null;
  return a;
}

export async function openAffiliateSession(a: Affiliate): Promise<void> {
  const exp = Date.now() + TTL_MS;
  const value = `${a._id}.${exp}.${a.sessionVersion ?? 0}`;
  (await cookies()).set(AFFILIATE_COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function closeAffiliateSession(): Promise<void> {
  (await cookies()).delete(AFFILIATE_COOKIE);
}

const attempts = () => db.collection<{ key: string; at: Date }>("affiliate_attempts");

/** Sign-in and reset requests: 8 per 15 minutes per address and per IP. */
export async function tooManyAttempts(kind: string, email: string, ip: string): Promise<boolean> {
  await ensureIndexes();
  const keys = [`${kind}:email:${email.trim().toLowerCase()}`, `${kind}:ip:${ip}`].map((k) => createHash("sha256").update(k).digest("hex"));
  const since = new Date(Date.now() - WINDOW_MS);
  for (const key of keys) if ((await attempts().countDocuments({ key, at: { $gt: since } })) >= MAX_ATTEMPTS) return true;
  await attempts().insertMany(keys.map((key) => ({ key, at: new Date() })));
  return false;
}

/** Address of the affiliate space in the affiliate's language. */
export const affiliateSiteBase = (locale: string | undefined) => `${env.appUrl.replace(/\/$/, "")}${!locale || locale === "fr" ? "" : `/${locale}`}`;

/** The link to choose a password (after approval) or reset it. */
export function passwordLink(a: Pick<Affiliate, "_id" | "locale">, token: string): string {
  return `${affiliateSiteBase(a.locale)}/affiliates/password?id=${encodeURIComponent(a._id)}&token=${encodeURIComponent(token)}`;
}
