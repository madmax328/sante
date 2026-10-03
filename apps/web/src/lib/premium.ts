import type { Profile } from "./types";

/** What the free plan includes. Everything else needs Premium. */
export const FREE_LIMITS = {
  replacementsPerWeek: 3,
  aiMessagesPerWeek: 0,
};

export type Feature =
  | "budget"
  | "pantry"
  | "unlimited_replacements"
  | "ai_adjust"
  | "coach"
  | "sport"
  | "family"
  | "weekly_review"
  | "leftovers_optimisation";

export function isPremium(profile: Pick<Profile, "subscription"> | null | undefined): boolean {
  const s = profile?.subscription;
  if (!s?.status) return false;
  if (!["active", "trialing", "past_due"].includes(s.status)) return false;
  // A trial only counts once a card has been saved: no card, no Premium.
  if (s.status === "trialing" && !s.hasPaymentMethod) return false;
  return !s.currentPeriodEnd || new Date(s.currentPeriodEnd).getTime() > Date.now() - 3 * 86400000;
}

/** Features open to everyone (none of the gated ones for now). */
const FREE_FEATURES: Feature[] = [];

export function can(profile: Pick<Profile, "subscription"> | null | undefined, feature: Feature): boolean {
  return FREE_FEATURES.includes(feature) || isPremium(profile);
}
