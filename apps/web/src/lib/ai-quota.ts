import "server-only";
import { todayIn } from "./dates";
import { db } from "./db";
import { features } from "./env";
import { AI_MONTHLY_LIMIT } from "./premium";
import type { Profile } from "./types";

const profiles = () => db.collection<Profile>("profiles");
const monthOf = (timeZone?: string) => todayIn(timeZone).slice(0, 7);

/** AI messages left this month for this profile. */
export function aiMessagesLeft(profile: Pick<Profile, "aiUsage" | "timeZone">): number {
  const used = profile.aiUsage?.month === monthOf(profile.timeZone) ? profile.aiUsage.count : 0;
  return Math.max(0, AI_MONTHLY_LIMIT - used);
}

/**
 * Takes one AI message from the monthly allowance, atomically (two tabs
 * cannot both get the last one). Returns false when the month is used up:
 * the coach then answers with the simplified rules, at no cost.
 */
export async function takeAiMessage(profile: Pick<Profile, "_id" | "timeZone">): Promise<boolean> {
  if (!features.ai()) return false;
  const month = monthOf(profile.timeZone);
  const res = await profiles().updateOne(
    { _id: profile._id, $or: [{ "aiUsage.month": { $ne: month } }, { "aiUsage.count": { $lt: AI_MONTHLY_LIMIT } }] },
    [
      {
        $set: {
          aiUsage: {
            month,
            count: { $cond: [{ $eq: ["$aiUsage.month", month] }, { $add: ["$aiUsage.count", 1] }, 1] },
          },
        },
      },
    ],
  );
  return res.modifiedCount === 1;
}
