import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { db, mongo } from "./db";
import { sendEmail } from "./email";
import { env, features } from "./env";

export const auth = betterAuth({
  appName: "Weeko",
  baseURL: env.appUrl,
  secret: env.authSecret,
  database: mongodbAdapter(db, { client: mongo }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Réinitialiser votre mot de passe Weeko",
        `<p>Bonjour,</p><p>Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :</p><p><a href="${url}">${url}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
      );
    },
  },
  emailVerification: {
    sendOnSignUp: features.email(),
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(
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
