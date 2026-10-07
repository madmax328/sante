"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { CONTACT } from "@/lib/contact";
import { db, ensureIndexes } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getSession } from "@/lib/session";

export type ContactTopic = "question" | "subscription" | "technical" | "privacy" | "idea";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(160),
  topic: z.enum(["question", "subscription", "technical", "privacy", "idea"]),
  message: z.string().trim().min(10).max(4000),
  /** Hidden field: humans leave it empty, spam bots fill it */
  website: z.string().max(0).optional(),
});

const TO: Record<ContactTopic, string> = {
  question: CONTACT.general,
  subscription: CONTACT.support,
  technical: CONTACT.support,
  privacy: CONTACT.privacy,
  idea: CONTACT.general,
};
const LABEL: Record<ContactTopic, string> = {
  question: "Question",
  subscription: "Abonnement / paiement",
  technical: "Problème technique",
  privacy: "Données personnelles (RGPD)",
  idea: "Suggestion",
};

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendContactAction(input: z.input<typeof schema>): Promise<{ ok: boolean; error?: "invalid" | "rate" | "server" }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const session = await getSession();
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "unknown";
  // Only a hash of the address is kept, for one day, to limit abuse.
  const key = createHash("sha256").update(`contact:${ip}`).digest("hex");

  try {
    await ensureIndexes();
    const attempts = db.collection<{ key: string; at: Date }>("contact_attempts");
    const recent = await attempts.countDocuments({ key, at: { $gt: new Date(Date.now() - 3600_000) } });
    if (recent >= 5) return { ok: false, error: "rate" };
    await attempts.insertOne({ key, at: new Date() });

    const account = session ? `Compte Sorloo : ${escape(session.user.email)} (id ${escape(session.user.id)})` : "Pas connecté";
    await sendEmail(
      TO[data.topic],
      `[Contact Sorloo] ${LABEL[data.topic]} — ${data.name}`,
      `<p><strong>De :</strong> ${escape(data.name)} &lt;${escape(data.email)}&gt;<br/><strong>Sujet :</strong> ${LABEL[data.topic]}<br/>${account}</p>` +
        `<p style="white-space:pre-wrap">${escape(data.message)}</p>` +
        `<p style="color:#5c6b64">Réponds directement à cet e-mail pour répondre à ${escape(data.name)}.</p>`,
      data.email,
    );
    return { ok: true };
  } catch (e) {
    console.error("[contact] failed", e);
    return { ok: false, error: "server" };
  }
}
