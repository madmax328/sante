"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { PlanAction } from "@weeko/engine";
import { askCoach } from "@/lib/ai";
import { db } from "@/lib/db";
import { loadUserContext, type UserContext } from "@/lib/planning";
import { FREE_LIMITS, can } from "@/lib/premium";
import { aiMessagesLeft, takeAiMessage } from "@/lib/ai-quota";
import { features } from "@/lib/env";
import { getPlan, getProfile } from "@/lib/repo";
import { requireUserId } from "@/lib/session";

export interface CoachProposal {
  reply: string;
  actions: PlanAction[];
  labels: string[];
  /** AI messages left this month (shown when it gets low) */
  aiLeft?: number;
  /** The monthly allowance is used up: answered with the simplified coach */
  aiExhausted?: boolean;
}

const coach = () =>
  db.collection<{ userId: string; role: "user" | "assistant"; content: string; actions?: PlanAction[]; at: Date }>("coach_messages");

async function describe(uc: UserContext, actions: PlanAction[]): Promise<string[]> {
  const t = await getTranslations("coach.actions");
  const e = await getTranslations("enums");
  return actions.map((a) => {
    switch (a.type) {
      case "eat_out":
        return t("eat_out", { day: e(`day.${a.day}`), meal: e(`meal.${a.meal}`).toLowerCase(), label: a.label });
      case "guests":
        return t("guests", { day: e(`day.${a.day}`), meal: e(`meal.${a.meal}`).toLowerCase(), total: a.total });
      case "time_limit":
        return t("time_limit", { day: e(`day.${a.day}`), meal: e(`meal.${a.meal}`).toLowerCase(), minutes: a.minutes });
      case "missing_ingredient":
        return t("missing_ingredient", { ingredient: uc.ctx.catalog.ingredient(a.ingredientId).name.fr.toLowerCase(), day: e(`day.${a.fromDay}`) });
      case "replace_meal":
        return t("replace_meal", { day: e(`day.${a.day}`), meal: e(`meal.${a.meal}`).toLowerCase() });
      case "skip_meal":
        return t("skip_meal", { day: e(`day.${a.day}`), meal: e(`meal.${a.meal}`).toLowerCase() });
      case "regenerate":
        return t("regenerate", { day: e(`day.${a.fromDay}`) });
    }
  });
}

export type InterpretResult = { ok: true; proposal: CoachProposal } | { ok: false; error: "premium" | "invalid" | "profile" };

/** Quick adjustment from the dashboard: "ce soir je mange au restaurant". */
export async function interpretAction(input: { text: string }): Promise<InterpretResult> {
  const userId = await requireUserId();
  const parsed = z.object({ text: z.string().trim().min(2).max(400) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const uc = await loadUserContext(userId);
  if (!uc) return { ok: false, error: "profile" };
  if (!can(uc.profile, "ai_adjust")) return { ok: false, error: "premium" };
  const stored = await getPlan(userId, uc.weekStart);
  const allowAi = await takeAiMessage(uc.profile);
  const answer = await askCoach(uc, stored, [], parsed.data.text, "adjust", allowAi);
  return { ok: true, proposal: { reply: answer.reply, actions: answer.actions, labels: await describe(uc, answer.actions), ...(await quotaInfo(userId, allowAi)) } };
}

export async function getCoachHistory(): Promise<{ role: "user" | "assistant"; content: string; labels?: string[]; actions?: PlanAction[] }[]> {
  const userId = await requireUserId();
  const docs = await coach().find({ userId }).sort({ at: -1 }).limit(30).toArray();
  return docs.reverse().map((d) => ({ role: d.role, content: d.content, actions: d.actions }));
}

export type CoachResult = { ok: true; proposal: CoachProposal } | { ok: false; error: "premium" | "invalid" | "profile" | "quota" };

export async function sendCoachMessage(input: { text: string }): Promise<CoachResult> {
  const userId = await requireUserId();
  const parsed = z.object({ text: z.string().trim().min(1).max(1000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const uc = await loadUserContext(userId);
  if (!uc) return { ok: false, error: "profile" };
  if (!can(uc.profile, "coach") && FREE_LIMITS.aiMessagesPerWeek === 0) return { ok: false, error: "premium" };
  // Simple abuse guard: 60 messages per day.
  const since = new Date(Date.now() - 86400000);
  if ((await coach().countDocuments({ userId, role: "user", at: { $gte: since } })) >= 60) return { ok: false, error: "quota" };

  const history = (await coach().find({ userId }).sort({ at: -1 }).limit(10).toArray()).reverse().map((d) => ({ role: d.role, content: d.content }));
  const stored = await getPlan(userId, uc.weekStart);
  const allowAi = await takeAiMessage(uc.profile);
  const answer = await askCoach(uc, stored, history, parsed.data.text, "chat", allowAi);
  const now = Date.now();
  await coach().insertMany([
    { userId, role: "user", content: parsed.data.text, at: new Date(now) },
    { userId, role: "assistant", content: answer.reply, actions: answer.actions, at: new Date(now + 1) },
  ]);
  return { ok: true, proposal: { reply: answer.reply, actions: answer.actions, labels: await describe(uc, answer.actions), ...(await quotaInfo(userId, allowAi)) } };
}

async function quotaInfo(userId: string, usedAi: boolean): Promise<Pick<CoachProposal, "aiLeft" | "aiExhausted">> {
  if (!features.ai()) return {};
  const profile = await getProfile(userId);
  return { aiLeft: profile ? aiMessagesLeft(profile) : 0, aiExhausted: !usedAi };
}

export async function clearCoachHistory(): Promise<void> {
  const userId = await requireUserId();
  await coach().deleteMany({ userId });
}
