import { dislikeOptions } from "@/lib/dislikes";
import { contextFor, mobileRoute } from "@/lib/mobile";
import { can } from "@/lib/premium";

export const dynamic = "force-dynamic";

/** Everything the "Mes préférences" screens edit, with the choices for disliked foods. */
export const GET = mobileRoute(async (_req, userId) => {
  const uc = await contextFor(userId);
  const self = uc.self.member;
  const weekly = self.weeklyChangeKg ?? 0;
  const pace =
    self.goal === "lose_weight" ? (Math.abs(weekly) <= self.weightKg * 0.005 ? "gentle" : "moderate") : self.goal === "gain_muscle" ? (weekly <= 0.15 ? "gentle" : "moderate") : "moderate";
  return {
    prefs: uc.profile.prefs,
    dislikeOptions: dislikeOptions("fr"),
    budget: { allowed: can(uc.profile, "budget"), ...uc.profile.budget },
    body: uc.health.numbersHidden
      ? null
      : { weightKg: self.weightKg, heightCm: self.heightCm, goal: self.goal, activity: self.activity, targetWeightKg: self.targetWeightKg ?? null, pace },
  };
});
