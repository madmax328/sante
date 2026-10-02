import "server-only";
import { Resend } from "resend";
import { env, features } from "./env";

/** Sends a transactional email, or logs it when no provider is configured. */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!features.email()) {
    console.info(`[email] ${to} — ${subject}\n${html.replace(/<[^>]+>/g, " ")}`);
    return;
  }
  const resend = new Resend(env.resendKey);
  const { error } = await resend.emails.send({ from: env.emailFrom, to, subject, html });
  if (error) throw new Error(`Email not sent: ${error.message}`);
}
