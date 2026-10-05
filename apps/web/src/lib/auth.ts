import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { db, mongo } from "./db";
import { sendEmail } from "./email";
import { env, features } from "./env";

/**
 * Addresses allowed to sign in. Better Auth rejects requests from any other
 * origin ("Invalid origin"), e.g. www.getweeko.com when the site URL is
 * getweeko.com, or the *.vercel.app address of the deployment.
 */
function trustedOrigins(): string[] {
  const origins = new Set<string>();
  const add = (url: string | undefined) => {
    if (!url) return;
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      origins.add(u.origin);
      const host = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
      if (!u.hostname.endsWith(".vercel.app") && u.hostname !== "localhost") origins.add(`${u.protocol}//${host}`);
    } catch {
      // ignore malformed values
    }
  };
  add(env.appUrl);
  add(process.env.BETTER_AUTH_URL);
  add(process.env.VERCEL_URL);
  add(process.env.VERCEL_BRANCH_URL);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  return [...origins];
}

/** An email provider problem must never block sign-up or sign-in. */
async function sendSafely(to: string, subject: string, html: string): Promise<void> {
  try {
    await sendEmail(to, subject, html);
  } catch (e) {
    console.error("[email] failed", subject, e);
  }
}

export const auth = betterAuth({
  appName: "Weeko",
  baseURL: env.appUrl,
  trustedOrigins: trustedOrigins(),
  secret: env.authSecret,
  database: mongodbAdapter(db, { client: mongo }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendSafely(
        user.email,
        "Réinitialiser ton mot de passe Weeko",
        `<p>Bonjour,</p><p>Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :</p><p><a href="${url}">${url}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
      );
    },
  },
  emailVerification: {
    sendOnSignUp: features.email(),
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendSafely(
        user.email,
        "Confirmez votre adresse e-mail",
        `<p>Bienvenue sur Weeko !</p><p>Confirmez votre adresse en ouvrant ce lien :</p><p><a href="${url}">${url}</a></p>`,
      );
    },
  },
  socialProviders: features.google()
    ? { google: { clientId: env.googleClientId!, clientSecret: env.googleClientSecret! } }
    : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
  advanced: { useSecureCookies: env.appUrl.startsWith("https://") },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
