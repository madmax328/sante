"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminSignIn, adminSignOut, isAdmin } from "@/lib/admin-auth";
import { deleteUsers } from "@/lib/admin-users";
import { getTranslations } from "next-intl/server";
import { markPaid, reviewAffiliate } from "@/lib/affiliates";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { isLocale } from "@/lib/locale";
import { getProfile } from "@/lib/repo";

const MESSAGES = {
  invalid: "E-mail ou mot de passe incorrect.",
  rate: "Trop d'essais. Réessaie dans 15 minutes.",
  unconfigured: "L'accès administrateur n'est pas configuré : ajoute ADMIN_EMAIL et ADMIN_PASSWORD sur Vercel, puis redéploie.",
} as const;

export async function adminLoginAction(_prev: string | undefined, form: FormData): Promise<string | undefined> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "unknown";
  const res = await adminSignIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""), ip);
  if (res !== "ok") return MESSAGES[res];
  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  await adminSignOut();
  redirect("/admin/login");
}


/** Deletes the selected accounts (never subscribers). */
export async function deleteUsersAction(ids: string[]): Promise<{ deleted: number; skipped: number }> {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) return { deleted: 0, skipped: 0 };
  const result = await deleteUsers(ids);
  revalidatePath("/admin", "layout");
  return result;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Approves, refuses or suspends an affiliate; the applicant is told by email in their language. */
export async function reviewAffiliateAction(id: string, decision: "approve" | "reject" | "suspend", code?: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) redirect("/admin/login");
  if (typeof id !== "string" || !["approve", "reject", "suspend"].includes(decision)) return { ok: false, error: "invalid" };
  const res = await reviewAffiliate(id, decision, code);
  if (!res.ok || !res.affiliate) return { ok: false, error: res.error === "taken" ? "Ce code est déjà pris." : "Affilié introuvable." };
  const a = res.affiliate;
  if (decision !== "suspend") {
    const profile = await getProfile(id);
    const locale = profile && isLocale(profile.locale) ? profile.locale : "fr";
    const t = await getTranslations({ locale, namespace: "affiliate" });
    const base = `${env.appUrl}${locale === "fr" ? "" : `/${locale}`}`;
    const dashboard = `${base}/app/affiliate`;
    const html =
      `<p>${escape(t("emailHello", { name: a.name }))}</p>` +
      (decision === "approve"
        ? `<p>${escape(t("emailApproved", { code: a.code ?? "" }))}</p><p><a href="${env.appUrl}/r/${a.code}">${env.appUrl}/r/${a.code}</a></p><p><a href="${dashboard}">${escape(t("emailDashboard"))}</a></p>`
        : `<p>${escape(t("emailRejected"))}</p><p><a href="${dashboard}">${escape(t("emailDashboard"))}</a></p>`);
    await sendEmail(a.email, decision === "approve" ? t("emailApprovedSubject") : t("emailRejectedSubject"), html).catch((e) => console.error("Affiliate email failed", e));
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** After the bank transfer: the affiliate's available commissions are marked paid. */
export async function markAffiliatePaidAction(id: string): Promise<{ ok: boolean; count: number }> {
  if (!(await isAdmin())) redirect("/admin/login");
  if (typeof id !== "string") return { ok: false, count: 0 };
  const count = await markPaid(id);
  revalidatePath("/admin", "layout");
  return { ok: true, count };
}
