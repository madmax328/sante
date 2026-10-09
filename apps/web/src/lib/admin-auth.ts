import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, ensureIndexes } from "./db";
import { env } from "./env";

/**
 * Administration sign-in, separate from Sorloo accounts: ADMIN_EMAIL and
 * ADMIN_PASSWORD (Vercel variables). The session is a signed cookie valid 12 hours.
 */

export const ADMIN_COOKIE = "sorloo_admin";
const TTL_MS = 12 * 3600_000;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;

export const adminConfigured = () => !!env.adminEmail && !!env.adminPassword && !!env.authSecret;

const sign = (value: string) => createHmac("sha256", `${env.authSecret}:admin`).update(value).digest("base64url");
const digest = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  const [exp, sig] = raw?.split(".") ?? [];
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  // The email is part of the signature: changing ADMIN_EMAIL signs everyone out.
  return same(sig, sign(`${exp}:${env.adminEmail}`));
}

const attempts = () => db.collection<{ key: string; at: Date }>("admin_attempts");

/** Checks the credentials (5 tries per 15 minutes and per address) and opens the session. */
export async function adminSignIn(email: string, password: string, ip: string): Promise<"ok" | "invalid" | "rate" | "unconfigured"> {
  if (!adminConfigured()) return "unconfigured";
  await ensureIndexes();
  const key = createHash("sha256").update(`admin:${ip}`).digest("hex");
  if ((await attempts().countDocuments({ key, at: { $gt: new Date(Date.now() - WINDOW_MS) } })) >= MAX_ATTEMPTS) return "rate";
  const ok = same(email.trim().toLowerCase(), env.adminEmail!) && same(password, env.adminPassword!);
  if (!ok) {
    await attempts().insertOne({ key, at: new Date() });
    return "invalid";
  }
  const exp = String(Date.now() + TTL_MS);
  (await cookies()).set(ADMIN_COOKIE, `${exp}.${sign(`${exp}:${env.adminEmail}`)}`, {
    httpOnly: true,
    secure: env.appUrl.startsWith("https://"),
    sameSite: "strict",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  return "ok";
}

export async function adminSignOut(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
