import { localeFromHeader, type Locale } from "./locale";
import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { expo } from "@better-auth/expo";
import { db, mongo } from "./db";
import { sendEmail } from "./email";
import { env, features } from "./env";

/**
 * Addresses allowed to sign in. Better Auth rejects requests from any other
 * origin ("Invalid origin"), e.g. www.sorloo.com when the site URL is
 * sorloo.com, or the *.vercel.app address of the deployment.
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
  // Former domain, still served while the redirect is in place.
  add("https://getweeko.com");
  // iOS / Android app (deep-link scheme; "weeko" for builds made before the rename),
  // and the Expo dev client while developing.
  origins.add("sorloo://");
  origins.add("weeko://");
  if (process.env.NODE_ENV !== "production") origins.add("exp://");
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
  appName: "Sorloo",
  baseURL: env.appUrl,
  trustedOrigins: trustedOrigins(),
  secret: env.authSecret,
  database: mongodbAdapter(db, { client: mongo }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }, request) => {
      const m = EMAILS[localeFromHeader(request?.headers.get("accept-language"))].reset;
      await sendSafely(user.email, m.subject, `<p>${m.hello}</p><p>${m.text}</p><p><a href="${url}">${url}</a></p><p>${m.ignore}</p>`);
    },
  },
  emailVerification: {
    sendOnSignUp: features.email(),
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      const m = EMAILS[localeFromHeader(request?.headers.get("accept-language"))].verify;
      await sendSafely(user.email, m.subject, `<p>${m.hello}</p><p>${m.text}</p><p><a href="${url}">${url}</a></p>`);
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
  // Sign-ups: at most 5 an hour from the same address (bots).
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60, customRules: { "/sign-up/email": { window: 3600, max: 5 } } },
  databaseHooks: {
    user: {
      create: {
        // Spam bots put links or long texts in the name, so that our confirmation email carries them.
        before: async (user) => (isSpamName(user.name) ? false : { data: user }),
      },
    },
  },
  advanced: { useSecureCookies: env.appUrl.startsWith("https://") },
  plugins: [expo(), nextCookies()],
});

/** A name no person would type: a link, an address, or a long text. */
export function isSpamName(name: string | undefined): boolean {
  const n = (name ?? "").trim();
  return n.length > 60 || /https?:|www\.|\.(com|ru|cn|xyz|top|info|net|org|io|link|click|site|online)\b|@|<|>|\$|₿|€\s*\d|\d{5,}|telegram|t\.me|whatsapp|bitcoin|crypto|casino|loan/i.test(n);
}

/** Account emails, in the language of the browser or phone that asked for them. */
const EMAILS: Record<Locale, { reset: { subject: string; hello: string; text: string; ignore: string }; verify: { subject: string; hello: string; text: string } }> = {
  fr: {
    reset: { subject: "Réinitialiser ton mot de passe Sorloo", hello: "Bonjour,", text: "Pour choisir un nouveau mot de passe, ouvre ce lien (valable 1 heure) :", ignore: "Si tu n'es pas à l'origine de cette demande, ignore cet e-mail." },
    verify: { subject: "Confirme ton adresse e-mail", hello: "Bienvenue sur Sorloo !", text: "Confirme ton adresse en ouvrant ce lien :" },
  },
  en: {
    reset: { subject: "Reset your Sorloo password", hello: "Hello,", text: "To choose a new password, open this link (valid for 1 hour):", ignore: "If you didn't ask for this, you can ignore this email." },
    verify: { subject: "Confirm your email address", hello: "Welcome to Sorloo!", text: "Confirm your address by opening this link:" },
  },
  de: {
    reset: { subject: "Dein Sorloo-Passwort zurücksetzen", hello: "Hallo,", text: "Um ein neues Passwort zu wählen, öffne diesen Link (1 Stunde gültig):", ignore: "Wenn du das nicht angefordert hast, ignoriere diese E-Mail einfach." },
    verify: { subject: "Bestätige deine E-Mail-Adresse", hello: "Willkommen bei Sorloo!", text: "Bestätige deine Adresse, indem du diesen Link öffnest:" },
  },
  es: {
    reset: { subject: "Restablece tu contraseña de Sorloo", hello: "Hola:", text: "Para elegir una nueva contraseña, abre este enlace (válido durante 1 hora):", ignore: "Si no has pedido esto, ignora este correo." },
    verify: { subject: "Confirma tu correo electrónico", hello: "¡Te damos la bienvenida a Sorloo!", text: "Confirma tu dirección abriendo este enlace:" },
  },
  it: {
    reset: { subject: "Reimposta la password di Sorloo", hello: "Ciao,", text: "Per scegliere una nuova password, apri questo link (valido 1 ora):", ignore: "Se non hai fatto tu questa richiesta, ignora questa e-mail." },
    verify: { subject: "Conferma il tuo indirizzo e-mail", hello: "Benvenuto su Sorloo!", text: "Conferma il tuo indirizzo aprendo questo link:" },
  },
  pt: {
    reset: { subject: "Redefinir sua senha do Sorloo", hello: "Olá,", text: "Para escolher uma nova senha, abra este link (válido por 1 hora):", ignore: "Se você não fez este pedido, ignore este e-mail." },
    verify: { subject: "Confirme seu e-mail", hello: "Boas-vindas ao Sorloo!", text: "Confirme seu endereço abrindo este link:" },
  },
};

export type Session = typeof auth.$Infer.Session;
