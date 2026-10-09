import { z } from "zod";
import * as app from "@/app/[locale]/app/actions";
import * as account from "@/app/[locale]/app/account/actions";
import * as coach from "@/app/[locale]/app/coach/actions";
import * as journal from "@/app/[locale]/app/journal/actions";
import * as pantry from "@/app/[locale]/app/pantry/actions";
import * as progress from "@/app/[locale]/app/progress/actions";
import * as sport from "@/app/[locale]/app/sport/actions";
import * as welcome from "@/app/[locale]/app/welcome/actions";
import { auth } from "@/lib/auth";
import { MobileError, mobileRoute } from "@/lib/mobile";
import { deleteAllData } from "@/lib/repo";
import { cancelSubscriptionNow } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (input: any, req: Request, userId: string) => Promise<unknown>;

/**
 * The same actions as the website (each one checks the session and
 * validates its input). Payments are not available here: subscriptions are
 * taken on the website only.
 */
const ACTIONS: Record<string, Handler> = {
  generateWeek: (i) => app.generateWeekAction(i),
  replaceMeal: (i) => app.replaceMealAction(i),
  planActions: (i) => app.planActionAction(i),
  alternatives: (i) => app.getAlternativesAction(i),
  toggleEaten: (i) => app.toggleEatenAction(i),
  toggleChecked: (i) => app.toggleCheckedAction(i),
  markShopped: (i) => app.markShoppedAction(i),
  addWater: (i) => app.addWaterAction(i),
  setBudget: (i) => app.setBudgetAction(i),
  rateRecipe: (i) => app.rateRecipeAction(i),

  interpret: (i) => coach.interpretAction(i),
  coachHistory: () => coach.getCoachHistory(),
  coachSend: (i) => coach.sendCoachMessage(i),
  coachClear: () => coach.clearCoachHistory(),

  searchFoods: (i) => journal.searchFoodsAction(String(i?.query ?? "")),
  addFood: (i) => journal.addFoodAction(i),
  removeFood: (i) => journal.removeFoodAction(i),
  lookupBarcode: (i) => journal.lookupBarcodeAction(String(i?.code ?? "")),

  setPantryItem: (i) => pantry.setPantryItemAction(i),
  addMeasurement: (i) => progress.addMeasurementAction(i),
  deleteMeasurement: (i) => progress.deleteMeasurementAction(String(i?.date ?? "")),
  toggleWorkout: (i) => sport.toggleWorkoutAction(i),
  setSteps: (i) => sport.setStepsAction(i),
  saveSportSettings: (i) => sport.saveSportSettingsAction(i),
  importHealth: (i) => sport.importHealthAction(i),

  saveFoodPrefs: (i) => account.saveFoodPrefsAction(i),
  saveBody: (i) => account.saveBodyAction(i),
  saveMember: (i) => account.saveMemberAction(i),
  removeMember: (i) => account.removeMemberAction(String(i?.id ?? "")),
  setCancel: (i) => account.setCancelAction(!!i?.cancel),
  withdrawHealthConsent: () => account.withdrawHealthConsentAction(),

  completeOnboarding: (i) => welcome.completeOnboarding(i),
  previewTargets: (i) => welcome.previewTargets(i),

  // Store rules: an account created in the app must be deletable in the app.
  deleteAccount: async (i, req, userId) => {
    if (!["SUPPRIMER", "DELETE"].includes(String(i?.confirm ?? "").trim().toUpperCase())) return { ok: false };
    await cancelSubscriptionNow(userId);
    await auth.api.signOut({ headers: req.headers }).catch(() => undefined);
    await deleteAllData(userId);
    return { ok: true };
  },
};

const body = z.object({ name: z.string().max(40), input: z.unknown().optional() });

export const POST = mobileRoute(async (req, userId) => {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new MobileError("invalid");
  const handler = ACTIONS[parsed.data.name];
  if (!handler) throw new MobileError("unknown_action", 404);
  return { result: (await handler(parsed.data.input, req, userId)) ?? null };
});
