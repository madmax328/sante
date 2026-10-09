import { dislikeOptions } from "@/lib/dislikes";
import { contextFor, mobileRoute } from "@/lib/mobile";
import { paceOf } from "@/lib/planning";
import { can } from "@/lib/premium";

export const dynamic = "force-dynamic";

/** Everything the "Mes préférences" screens edit, with the choices for disliked foods. */
export const GET = mobileRoute(async (_req, userId) => {
  const uc = await contextFor(userId);
  const self = uc.self.member;
  return {
    prefs: uc.profile.prefs,
    dislikeOptions: dislikeOptions("fr"),
    budget: { allowed: can(uc.profile, "budget"), ...uc.profile.budget },
    body: uc.health.numbersHidden
      ? null
      : { weightKg: self.weightKg, heightCm: self.heightCm, goal: self.goal, activity: self.activity, targetWeightKg: self.targetWeightKg ?? null, pace: paceOf(self) },
  };
});
