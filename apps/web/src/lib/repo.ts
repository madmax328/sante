import "server-only";
import type { PantryItem, WeekPlan, WorkoutWeek } from "@weeko/engine";
import { seal, unseal, type Sealed } from "./crypto";
import { db, ensureIndexes } from "./db";
import type { FoodLog, HealthData, LogEntry, Measurement, Profile, StoredPlan, StoredWorkoutWeek } from "./types";

const profiles = () => db.collection<Profile>("profiles");
const health = () => db.collection<{ _id: string; sealed: Sealed; updatedAt: Date }>("health_profiles");
const plans = () => db.collection<StoredPlan>("plans");
const pantries = () => db.collection<{ _id: string; items: PantryItem[]; updatedAt: Date }>("pantries");
const logs = () => db.collection<FoodLog>("food_logs");
const measurements = () => db.collection<{ userId: string; date: string; sealed: Sealed }>("measurements");
const workouts = () => db.collection<StoredWorkoutWeek>("workouts");
const events = () =>
  db.collection<{ userId: string; recipeId: string; type: "liked" | "disliked" | "replaced" | "eaten" | "skipped"; at: Date }>(
    "recipe_events",
  );

export const DEFAULT_PREFS: Profile["prefs"] = {
  diet: "omnivore",
  avoid: [],
  dislikedIngredients: [],
  likedRecipes: [],
  dislikedRecipes: [],
  maxMinutesWeekday: 30,
  maxMinutesWeekend: 60,
  equipment: ["oven", "microwave"],
  leftovers: true,
  snacks: true,
};

// ---------------------------------------------------------------- Profile

export async function getProfile(userId: string): Promise<Profile | null> {
  await ensureIndexes();
  return profiles().findOne({ _id: userId });
}

export async function ensureProfile(userId: string, locale: "fr" | "en" = "fr"): Promise<Profile> {
  const now = new Date();
  const existing = await getProfile(userId);
  if (existing) return existing;
  const profile: Profile = {
    _id: userId,
    locale,
    market: "FR",
    timeZone: "Europe/Paris",
    onboarded: false,
    prefs: DEFAULT_PREFS,
    budget: { enabled: false, weekly: 70 },
    sport: {
      enabled: true,
      level: "beginner",
      availableDays: [0, 2, 4],
      minutesPerSession: 30,
      equipment: [],
      limitations: [],
      startedAt: now.toISOString().slice(0, 10),
    },
    consents: {},
    createdAt: now,
    updatedAt: now,
  };
  await profiles().updateOne({ _id: userId }, { $setOnInsert: profile }, { upsert: true });
  return (await getProfile(userId))!;
}

export async function updateProfile(userId: string, patch: Partial<Omit<Profile, "_id" | "createdAt">>): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) set[k] = v;
  await profiles().updateOne({ _id: userId }, { $set: set });
}

export async function findProfileByCustomer(customerId: string): Promise<Profile | null> {
  return profiles().findOne({ "subscription.customerId": customerId });
}

// ---------------------------------------------------------------- Health (encrypted)

export async function getHealth(userId: string): Promise<HealthData | null> {
  const doc = await health().findOne({ _id: userId });
  return doc ? unseal<HealthData>(doc.sealed) : null;
}

export async function saveHealth(userId: string, data: HealthData): Promise<void> {
  await health().updateOne({ _id: userId }, { $set: { sealed: seal(data), updatedAt: new Date() } }, { upsert: true });
}

// ---------------------------------------------------------------- Plans

export async function getPlan(userId: string, weekStart: string): Promise<StoredPlan | null> {
  await ensureIndexes();
  return plans().findOne({ userId, weekStart });
}

export async function recentPlans(userId: string, limit = 3): Promise<StoredPlan[]> {
  return plans().find({ userId }).sort({ weekStart: -1 }).limit(limit).toArray();
}

export async function savePlan(userId: string, weekStart: string, plan: WeekPlan, reset = false): Promise<void> {
  const now = new Date();
  await plans().updateOne(
    { userId, weekStart },
    {
      $set: { plan, updatedAt: now, ...(reset ? { checked: [], eaten: [] } : {}) },
      $setOnInsert: { userId, weekStart, createdAt: now, ...(reset ? {} : { checked: [], eaten: [] }) },
    },
    { upsert: true },
  );
}

export async function setPlanFields(
  userId: string,
  weekStart: string,
  fields: Partial<Pick<StoredPlan, "checked" | "eaten" | "shoppedAt" | "actualSpent">>,
): Promise<void> {
  await plans().updateOne({ userId, weekStart }, { $set: { ...fields, updatedAt: new Date() } });
}

// ---------------------------------------------------------------- Pantry

export async function getPantry(userId: string): Promise<PantryItem[]> {
  return (await pantries().findOne({ _id: userId }))?.items ?? [];
}

export async function savePantry(userId: string, items: PantryItem[]): Promise<void> {
  const clean = items.filter((i) => i.qty > 0);
  await pantries().updateOne({ _id: userId }, { $set: { items: clean, updatedAt: new Date() } }, { upsert: true });
}

// ---------------------------------------------------------------- Food logs

export async function getLog(userId: string, date: string): Promise<FoodLog> {
  await ensureIndexes();
  return (await logs().findOne({ userId, date }, { projection: { _id: 0 } })) ?? { userId, date, entries: [], waterMl: 0 };
}

export async function getLogs(userId: string, from: string, to: string): Promise<FoodLog[]> {
  return logs()
    .find({ userId, date: { $gte: from, $lte: to } }, { projection: { _id: 0 } })
    .sort({ date: 1 })
    .toArray();
}

export async function addLogEntry(userId: string, date: string, entry: LogEntry): Promise<void> {
  await logs().updateOne(
    { userId, date },
    { $push: { entries: entry }, $setOnInsert: { userId, date, waterMl: 0 } },
    { upsert: true },
  );
}

export async function removeLogEntry(userId: string, date: string, entryId: string): Promise<void> {
  await logs().updateOne({ userId, date }, { $pull: { entries: { id: entryId } } });
}

export async function removePlannedEntry(userId: string, date: string, refId: string): Promise<void> {
  await logs().updateOne({ userId, date }, { $pull: { entries: { kind: "planned", refId } } });
}

export async function addWater(userId: string, date: string, ml: number): Promise<number> {
  const res = await logs().findOneAndUpdate(
    { userId, date },
    { $inc: { waterMl: ml }, $setOnInsert: { userId, date, entries: [] } },
    { upsert: true, returnDocument: "after" },
  );
  const value = res?.waterMl ?? 0;
  if (value < 0) {
    await logs().updateOne({ userId, date }, { $set: { waterMl: 0 } });
    return 0;
  }
  return value;
}

// ---------------------------------------------------------------- Measurements (encrypted)

export async function getMeasurements(userId: string, limit = 365): Promise<Measurement[]> {
  const docs = await measurements().find({ userId }).sort({ date: -1 }).limit(limit).toArray();
  return docs.map((d) => ({ date: d.date, ...unseal<Omit<Measurement, "date">>(d.sealed) })).reverse();
}

export async function saveMeasurement(userId: string, m: Measurement): Promise<void> {
  const { date, ...values } = m;
  await measurements().updateOne({ userId, date }, { $set: { sealed: seal(values) } }, { upsert: true });
}

export async function deleteMeasurement(userId: string, date: string): Promise<void> {
  await measurements().deleteOne({ userId, date });
}

// ---------------------------------------------------------------- Workouts

export async function getWorkoutWeek(userId: string, weekStart: string): Promise<StoredWorkoutWeek | null> {
  return workouts().findOne({ userId, weekStart }, { projection: { _id: 0 } });
}

export async function saveWorkoutWeek(userId: string, weekStart: string, week: WorkoutWeek): Promise<void> {
  await workouts().updateOne(
    { userId, weekStart },
    { $set: { week }, $setOnInsert: { userId, weekStart, done: [] } },
    { upsert: true },
  );
}

export async function setWorkoutDone(userId: string, weekStart: string, day: number, done: boolean): Promise<void> {
  await workouts().updateOne({ userId, weekStart }, done ? { $addToSet: { done: day } } : { $pull: { done: day } });
}

export async function setSteps(userId: string, weekStart: string, date: string, steps: number): Promise<void> {
  await workouts().updateOne({ userId, weekStart }, { $set: { [`steps.${date}`]: steps } });
}

// ---------------------------------------------------------------- Recipe events (preference learning)

export async function addRecipeEvent(
  userId: string,
  recipeId: string,
  type: "liked" | "disliked" | "replaced" | "eaten" | "skipped",
): Promise<void> {
  await events().insertOne({ userId, recipeId, type, at: new Date() });
}

export async function getRecipeEvents(userId: string, sinceDays = 120) {
  const since = new Date(Date.now() - sinceDays * 86400000);
  return events().find({ userId, at: { $gte: since } }, { projection: { _id: 0, recipeId: 1, type: 1 } }).toArray();
}

// ---------------------------------------------------------------- RGPD

/** Every piece of data stored about a user, decrypted, for the export. */
export async function exportAllData(userId: string) {
  const [profile, healthData, allPlans, pantry, allLogs, allMeasurements, allWorkouts, allEvents, coach] = await Promise.all([
    getProfile(userId),
    getHealth(userId),
    plans().find({ userId }, { projection: { _id: 0 } }).toArray(),
    getPantry(userId),
    logs().find({ userId }, { projection: { _id: 0 } }).toArray(),
    getMeasurements(userId, 100000),
    workouts().find({ userId }, { projection: { _id: 0 } }).toArray(),
    events().find({ userId }, { projection: { _id: 0 } }).toArray(),
    db.collection("coach_messages").find({ userId }, { projection: { _id: 0 } }).toArray(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    health: healthData,
    plans: allPlans,
    pantry,
    foodLogs: allLogs,
    measurements: allMeasurements,
    workouts: allWorkouts,
    recipeEvents: allEvents,
    coachMessages: coach,
  };
}

/** Deletes every record of the user, including the account itself. */
export async function deleteAllData(userId: string): Promise<void> {
  await Promise.all([
    profiles().deleteOne({ _id: userId }),
    health().deleteOne({ _id: userId }),
    plans().deleteMany({ userId }),
    pantries().deleteOne({ _id: userId }),
    logs().deleteMany({ userId }),
    measurements().deleteMany({ userId }),
    workouts().deleteMany({ userId }),
    events().deleteMany({ userId }),
    db.collection("coach_messages").deleteMany({ userId }),
  ]);
  // Better Auth collections store ids as ObjectId.
  const { ObjectId } = await import("mongodb");
  const ids: (string | InstanceType<typeof ObjectId>)[] = [userId];
  if (ObjectId.isValid(userId)) ids.push(new ObjectId(userId));
  await Promise.all([
    db.collection("session").deleteMany({ userId: { $in: ids } }),
    db.collection("account").deleteMany({ userId: { $in: ids } }),
    db.collection("user").deleteMany({ _id: { $in: ids as never[] } }),
  ]);
}
