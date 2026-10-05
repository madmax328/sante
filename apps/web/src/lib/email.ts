import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { env, features } from "./env";

let smtp: Transporter | undefined;

/**
 * Sends a transactional email through the mailbox's SMTP server (e.g.
 * Hostinger) or Resend, whichever is configured; logs it when neither is.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (features.smtp()) {
    smtp ??= nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPassword },
    });
    await smtp.sendMail({ from: env.emailFrom, to, subject, html, text });
    return;
  }
  if (env.resendKey) {
    const resend = new Resend(env.resendKey);
    const { error } = await resend.emails.send({ from: env.emailFrom, to, subject, html, text });
    if (error) throw new Error(`Email not sent: ${error.message}`);
    return;
  }
  console.info(`[email] ${to} — ${subject}\n${text}`);
}
