import { ageFrom } from "@/lib/dates";
import { contextFor, mobileRoute } from "@/lib/mobile";
import { can } from "@/lib/premium";

export const dynamic = "force-dynamic";

/** The people of the household (the planning uses them all with Premium). */
export const GET = mobileRoute(async (_req, userId) => {
  const uc = await contextFor(userId);
  return {
    premium: can(uc.profile, "family"),
    members: uc.health.members.map((m) => ({
      id: m.id,
      name: m.name,
      self: m.self,
      sex: m.sex,
      birthDate: m.birthDate,
      heightCm: m.heightCm,
      weightKg: m.weightKg,
      activity: m.activity,
      allergies: m.allergies,
      eats: m.eats,
      age: ageFrom(m.birthDate, uc.today),
    })),
  };
});
