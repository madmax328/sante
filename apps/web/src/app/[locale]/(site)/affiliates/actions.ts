"use server";

import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { closeAffiliateSession, currentAffiliate, openAffiliateSession, passwordLink, tooManyAttempts } from "@/lib/affiliate-auth";
import {
  applyAffiliate,
  passwordResetFor,
  PASSWORD_MIN,
  PLATFORMS,
  requestPayout,
  savePayoutProfile,
  setPasswordWithToken,
  verifyAffiliateLogin,
  type PayoutProfileError,
  type PayoutRequestError,
} from "@/lib/affiliates";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { isLocale } from "@/lib/locale";
import { revalidatePath } from "next/cache";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ipOf = async () => ((await headers()).get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "unknown";

const applySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  socials: z
    .array(
      z.object({
        platform: z.enum(PLATFORMS),
        url: z.string().trim().min(2).max(300),
        followers: z.number().int().min(0).max(1_000_000_000).optional(),
      }),
    )
    .min(1)
    .max(8),
  message: z.string().trim().max(1000).optional(),
  accept: z.literal(true),
  /** Hidden field: filled in only by bots */
  website: z.string().max(0).optional(),
});

/** Application from the public page, without a Sorloo account. */
export async function applyAction(input: z.input<typeof applySchema>): Promise<{ ok: boolean; error?: "invalid" | "already" | "rate" }> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { name, email, socials, message } = parsed.data;
  if (await tooManyAttempts("apply", email, await ipOf())) return { ok: false, error: "rate" };
  const locale = await getLocale();
  const res = await applyAffiliate({ name, email, locale: isLocale(locale) ? locale : "fr" }, { socials, message: message || undefined });
  if (!res.ok) return { ok: false, error: res.error };
  // The admin hears about each new application (not about edits of a pending one).
  if (res.created && env.adminEmail) {
    const list = socials.map((s) => `<li>${escape(s.platform)} : ${escape(s.url)}${s.followers !== undefined ? ` (${s.followers} abonnés)` : ""}</li>`).join("");
    await sendEmail(
      env.adminEmail,
      `Nouvelle candidature affilié : ${name}`,
      `<p>${escape(name)} (${escape(email)}) veut devenir affilié.</p><ul>${list}</ul>${message ? `<p>${escape(message)}</p>` : ""}<p><a href="${env.appUrl}/admin/affiliates">Voir les candidatures</a></p>`,
    ).catch((e) => console.error("Affiliate application email failed", e));
  }
  return { ok: true };
}

export async function loginAction(input: { email: string; password: string }): Promise<{ ok: boolean; error?: "invalid" | "rate" }> {
  const email = String(input?.email ?? "");
  const password = String(input?.password ?? "");
  if (!email || !password) return { ok: false, error: "invalid" };
  if (await tooManyAttempts("login", email, await ipOf())) return { ok: false, error: "rate" };
  const a = await verifyAffiliateLogin(email, password);
  if (!a) return { ok: false, error: "invalid" };
  await openAffiliateSession(a);
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await closeAffiliateSession();
}

/** Forgotten password: the same answer whether the address is known or not. */
export async function forgotAction(input: { email: string }): Promise<{ ok: boolean; error?: "rate" }> {
  const email = String(input?.email ?? "").trim();
  if (!email) return { ok: true };
  if (await tooManyAttempts("reset", email, await ipOf())) return { ok: false, error: "rate" };
  const found = await passwordResetFor(email);
  if (found) {
    const locale = found.affiliate.locale ?? "fr";
    const t = await getTranslations({ locale, namespace: "affiliate" });
    const link = passwordLink(found.affiliate, found.token);
    await sendEmail(
      found.affiliate.email,
      t("emailResetSubject"),
      `<p>${escape(t("emailHello", { name: found.affiliate.name }))}</p><p>${escape(t("emailReset"))}</p><p><a href="${link}">${escape(t("emailChoosePassword"))}</a></p>`,
    ).catch((e) => console.error("Affiliate reset email failed", e));
  }
  return { ok: true };
}

export async function setPasswordAction(input: { id: string; token: string; password: string }): Promise<{ ok: boolean; error?: "short" | "expired" }> {
  const password = String(input?.password ?? "");
  if (password.length < PASSWORD_MIN) return { ok: false, error: "short" };
  const a = await setPasswordWithToken(String(input?.id ?? ""), String(input?.token ?? ""), password);
  if (!a) return { ok: false, error: "expired" };
  if (a.status === "approved" || a.status === "suspended") await openAffiliateSession(a);
  return { ok: true };
}

const payoutSchema = z.object({
  kind: z.enum(["individual", "business"]),
  legalName: z.string().trim().min(2).max(120),
  address: z.object({
    line1: z.string().trim().min(3).max(150),
    line2: z.string().trim().max(150).optional(),
    postalCode: z.string().trim().min(2).max(12),
    city: z.string().trim().min(1).max(80),
    country: z.string().trim().length(2).toUpperCase(),
  }),
  siret: z.string().trim().max(20).optional(),
  vat: z.enum(["franchise", "fr_vat", "eu_reverse"]).optional(),
  vatNumber: z.string().trim().max(20).optional(),
  acceptMandate: z.boolean().optional(),
  holder: z.string().trim().min(2).max(120),
  iban: z.string().trim().max(50).optional(),
});

export async function savePayoutAction(input: z.input<typeof payoutSchema>): Promise<{ ok: boolean; error?: PayoutProfileError | "invalid" | "auth" }> {
  const a = await currentAffiliate();
  if (!a) return { ok: false, error: "auth" };
  const parsed = payoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const res = await savePayoutProfile(a._id, parsed.data);
  if (!res.ok) return res;
  revalidatePath("/affiliates/dashboard", "page");
  return { ok: true };
}

/** "Ask for my payout": from 50 € available; the admin gets the request and its document. */
export async function requestPayoutAction(input: { currency?: string } = {}): Promise<{ ok: boolean; error?: PayoutRequestError | "auth" }> {
  const a = await currentAffiliate();
  if (!a) return { ok: false, error: "auth" };
  const res = await requestPayout(a._id, typeof input?.currency === "string" ? input.currency.toUpperCase() : "EUR");
  if (!res.ok) return res;
  if (env.adminEmail) {
    const p = res.payout;
    const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: p.currency }).format(p.total);
    await sendEmail(
      env.adminEmail,
      `Demande de versement affilié : ${a.name} (${amount})`,
      `<p>${escape(a.name)} (${escape(a.email)}) demande le versement de ${amount} (${p.kind === "invoice" ? "facture" : "relevé"} ${p.number}).</p><p><a href="${env.appUrl}/admin/affiliates">Voir la demande et le document</a></p>`,
    ).catch((e) => console.error("Payout request email failed", e));
  }
  revalidatePath("/affiliates/dashboard", "page");
  return { ok: true };
}
