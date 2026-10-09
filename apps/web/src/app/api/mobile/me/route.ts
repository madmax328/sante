import { aiMessagesLeft } from "@/lib/ai-quota";
import { auth } from "@/lib/auth";
import { features } from "@/lib/env";
import { mobileRoute } from "@/lib/mobile";
import { isPremium } from "@/lib/premium";
import { ensureProfile, getHealth } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Who is signed in, and what the app should show (onboarding, Premium…). */
export const GET = mobileRoute(async (req, userId) => {
  const session = await auth.api.getSession({ headers: req.headers });
  const profile = await ensureProfile(userId);
  const health = profile.onboarded ? await getHealth(userId) : null;
  const sub = profile.subscription;
  return {
    user: { id: userId, name: session?.user.name ?? "", email: session?.user.email ?? "", emailVerified: !!session?.user.emailVerified || !features.email() },
    onboarded: profile.onboarded && !!health,
    premium: isPremium(profile),
    subscription: sub?.status
      ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd ?? null, cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd }
      : null,
    numbersHidden: !!health?.numbersHidden,
    sportEnabled: profile.sport.enabled,
    budget: profile.budget,
    prefs: profile.prefs,
    ai: features.ai() ? { left: aiMessagesLeft(profile) } : null,
    devices: { appleHealth: profile.devices?.apple_health?.lastSync ?? null, healthConnect: profile.devices?.health_connect?.lastSync ?? null },
  };
});
