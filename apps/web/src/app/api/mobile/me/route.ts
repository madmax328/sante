import { aiMessagesLeft } from "@/lib/ai-quota";
import { auth } from "@/lib/auth";
import { features } from "@/lib/env";
import { mobileRoute } from "@/lib/mobile";
import { hasStorePremium, isPremium } from "@/lib/premium";
import { localeOf } from "@/lib/locale";
import { ensureProfile, getHealth, updateProfile } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Who is signed in, and what the app should show (onboarding, Premium…). */
export const GET = mobileRoute(async (req, userId) => {
  const session = await auth.api.getSession({ headers: req.headers });
  const locale = localeOf(req);
  const profile = await ensureProfile(userId, locale);
  // The app follows the phone's language: remember it (emails, reminders).
  if (profile.locale !== locale) await updateProfile(userId, { locale });
  const health = profile.onboarded ? await getHealth(userId) : null;
  const sub = profile.subscription;
  return {
    user: { id: userId, name: session?.user.name ?? "", email: session?.user.email ?? "", emailVerified: !!session?.user.emailVerified || !features.email() },
    onboarded: profile.onboarded && !!health,
    premium: isPremium(profile),
    subscription: sub?.status
      ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd ?? null, cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd }
      : null,
    // Premium bought in the app: managed in the App Store / Google Play settings.
    store: hasStorePremium(profile) && profile.store
      ? { source: profile.store.source, expiresAt: profile.store.expiresAt, willRenew: profile.store.willRenew, billingIssue: profile.store.billingIssue }
      : null,
    numbersHidden: !!health?.numbersHidden,
    sportEnabled: profile.sport.enabled,
    budget: profile.budget,
    prefs: profile.prefs,
    ai: features.ai() ? { left: aiMessagesLeft(profile) } : null,
    devices: { appleHealth: profile.devices?.apple_health?.lastSync ?? null, healthConnect: profile.devices?.health_connect?.lastSync ?? null },
  };
});
