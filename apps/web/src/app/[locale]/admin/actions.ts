"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminSignIn, adminSignOut, isAdmin } from "@/lib/admin-auth";
import { deleteUsers } from "@/lib/admin-users";
import { getTranslations } from "next-intl/server";
import { affiliateSiteBase, passwordLink } from "@/lib/affiliate-auth";
import { cancelPayout, getAffiliate, issuePasswordToken, markPayoutPaid, reviewAffiliate, type Affiliate } from "@/lib/affiliates";
import { sendEmail } from "@/lib/email";

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

async function mailAffiliate(a: Affiliate, subjectKey: string, paragraphs: string[], button?: { href: string; labelKey: string }): Promise<void> {
  const t = await getTranslations({ locale: a.locale ?? "fr", namespace: "affiliate" });
  const html =
    `<p>${escape(t("emailHello", { name: a.name }))}</p>` +
    paragraphs.map((p) => `<p>${escape(p)}</p>`).join("") +
    (button ? `<p><a href="${button.href}">${escape(t(button.labelKey))}</a></p>` : "");
  await sendEmail(a.email, t(subjectKey), html).catch((e) => console.error("Affiliate email failed", e));
}

/** Approves (random code, link to choose the password), refuses or suspends; the applicant is told by email. */
export async function reviewAffiliateAction(id: string, decision: "approve" | "reject" | "suspend"): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) redirect("/admin/login");
  if (typeof id !== "string" || !["approve", "reject", "suspend"].includes(decision)) return { ok: false, error: "invalid" };
  const res = await reviewAffiliate(id, decision);
  if (!res.ok || !res.affiliate) return { ok: false, error: "Affilié introuvable." };
  const a = res.affiliate;
  const t = await getTranslations({ locale: a.locale ?? "fr", namespace: "affiliate" });
  if (decision === "approve") {
    if (res.passwordToken) await mailAffiliate(a, "emailApprovedSubject", [t("emailApproved", { code: a.code ?? "" })], { href: passwordLink(a, res.passwordToken), labelKey: "emailChoosePassword" });
    else await mailAffiliate(a, "emailApprovedSubject", [t("emailApprovedAgain", { code: a.code ?? "" })], { href: `${affiliateSiteBase(a.locale)}/affiliates/login`, labelKey: "emailDashboard" });
  }
  if (decision === "reject") await mailAffiliate(a, "emailRejectedSubject", [t("emailRejected")], { href: `${affiliateSiteBase(a.locale)}/affiliates`, labelKey: "emailApplyAgain" });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** A new link to choose the password (lost email, or affiliates approved before passwords existed). */
export async function sendPasswordLinkAction(id: string): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) redirect("/admin/login");
  const a = typeof id === "string" ? await getAffiliate(id) : null;
  if (!a || (a.status !== "approved" && a.status !== "suspended")) return { ok: false };
  const token = await issuePasswordToken(a._id);
  const t = await getTranslations({ locale: a.locale ?? "fr", namespace: "affiliate" });
  await mailAffiliate(a, "emailPasswordSubject", [t("emailPassword")], { href: passwordLink(a, token), labelKey: "emailChoosePassword" });
  return { ok: true };
}

/** After the bank transfer: the payout and its commissions are paid; the affiliate is told. */
export async function markPayoutPaidAction(payoutId: string): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) redirect("/admin/login");
  const p = typeof payoutId === "string" ? await markPayoutPaid(payoutId) : null;
  if (!p) return { ok: false };
  const a = await getAffiliate(p.affiliateId);
  if (a) {
    const t = await getTranslations({ locale: a.locale ?? "fr", namespace: "affiliate" });
    const amount = new Intl.NumberFormat(a.locale ?? "fr", { style: "currency", currency: p.currency }).format(p.total);
    await mailAffiliate(a, "emailPaidSubject", [t("emailPaid", { amount })], { href: `${affiliateSiteBase(a.locale)}/affiliates/dashboard`, labelKey: "emailDashboard" });
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** A request that won't be paid as is: its commissions become available again. */
export async function cancelPayoutAction(payoutId: string): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) redirect("/admin/login");
  const ok = typeof payoutId === "string" && (await cancelPayout(payoutId));
  revalidatePath("/admin", "layout");
  return { ok };
}
