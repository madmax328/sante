/** Server-side configuration. Optional services degrade gracefully when not configured. */
export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI,
  mongoDb: process.env.MONGODB_DB ?? "weeko",
  authSecret: process.env.BETTER_AUTH_SECRET,
  healthKey: process.env.HEALTH_DATA_KEY,
  stripeSecret: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePriceMonthly: process.env.STRIPE_PRICE_MONTHLY,
  stripePriceYearly: process.env.STRIPE_PRICE_YEARLY,
  stripeTrialDays: Number(process.env.STRIPE_TRIAL_DAYS ?? 0),
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
  pexelsKey: process.env.PEXELS_API_KEY,
  cronSecret: process.env.CRON_SECRET,
  resendKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "Weeko <bonjour@weeko.app>",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

export const features = {
  stripe: () => !!env.stripeSecret && !!env.stripePriceMonthly && !!env.stripePublishableKey && stripeModesMatch(),
  ai: () => !!env.anthropicKey,
  photos: () => !!env.pexelsKey,
  email: () => !!env.resendKey,
  google: () => !!env.googleClientId && !!env.googleClientSecret,
};

/** Secret and publishable keys must both be test keys or both live keys. */
function stripeModesMatch(): boolean {
  const live = (k: string | undefined) => !!k && /^(sk|rk|pk)_live_/.test(k);
  const ok = live(env.stripeSecret) === live(env.stripePublishableKey);
  if (!ok) console.error("Stripe keys mismatch: STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY must both be test or both be live keys");
  return ok;
}
