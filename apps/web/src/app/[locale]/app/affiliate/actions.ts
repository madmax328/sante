"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { applyAffiliate, attachReferral, getAffiliate, PLATFORMS } from "@/lib/affiliates";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { getSession, requireUserId } from "@/lib/session";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const applySchema = z.object({
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
});

/** Application to the affiliate programme (or an update while it is examined). */
export async function applyAffiliateAction(input: z.input<typeof applySchema>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { socials, message } = parsed.data;
  const before = await getAffiliate(session.user.id);
  const a = await applyAffiliate({ id: session.user.id, name: session.user.name, email: session.user.email }, { socials, message: message || undefined });
  // Tell the admin about each new application (not about edits).
  if (a.status === "pending" && before?.status !== "pending" && env.adminEmail) {
    const list = socials.map((s) => `<li>${escape(s.platform)} : ${escape(s.url)}${s.followers !== undefined ? ` (${s.followers} abonnés)` : ""}</li>`).join("");
    await sendEmail(
      env.adminEmail,
      `Nouvelle candidature affilié : ${session.user.name}`,
      `<p>${escape(session.user.name)} (${escape(session.user.email)}) veut devenir affilié.</p><ul>${list}</ul>${message ? `<p>${escape(message)}</p>` : ""}<p><a href="${env.appUrl}/admin/affiliates">Voir les candidatures</a></p>`,
    ).catch((e) => console.error("Affiliate application email failed", e));
  }
  revalidatePath("/app/affiliate", "page");
  return { ok: true };
}

/** "A creator told me about Sorloo": the code typed after sign-up. */
export async function referralCodeAction(input: { code: string }): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  const res = await attachReferral(userId, String(input?.code ?? ""), { late: true });
  if (res !== "ok") return { ok: false, error: res };
  revalidatePath("/app/account", "page");
  return { ok: true };
}
