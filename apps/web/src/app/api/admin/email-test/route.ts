import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { env, features } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Email diagnostics: /api/admin/email-test?key=CRON_SECRET&to=you@example.com
 * Sends a test message and returns the exact error if it fails.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!env.cronSecret || url.searchParams.get("key") !== env.cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const to = url.searchParams.get("to") ?? "";
  const config = {
    provider: features.smtp() ? "smtp" : env.resendKey ? "resend" : "none (emails are only logged)",
    smtpHost: env.smtpHost ?? null,
    smtpPort: env.smtpPort,
    smtpUser: env.smtpUser ?? null,
    smtpPasswordSet: !!env.smtpPassword,
    from: env.emailFrom,
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ config, error: "add &to=your@email" });
  try {
    await sendEmail(to, "Test Sorloo", "<p>Si tu lis ce message, l'envoi d'e-mails de Sorloo fonctionne.</p>");
    return NextResponse.json({ config, result: "sent" });
  } catch (e) {
    return NextResponse.json({ config, result: "failed", error: e instanceof Error ? e.message : String(e) });
  }
}
