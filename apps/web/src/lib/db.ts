import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

declare global {
  var __weekoMongo: MongoClient | undefined;
}

/**
 * One client per server instance (reused across hot reloads and invocations).
 * The client connects lazily on the first operation.
 */
export const mongo: MongoClient =
  globalThis.__weekoMongo ??
  new MongoClient(env.mongoUri ?? "mongodb://127.0.0.1:27017", {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    appName: "weeko-web",
  });
globalThis.__weekoMongo = mongo;

export const db: Db = mongo.db(env.mongoDb);

let indexesReady: Promise<void> | undefined;

/** Creates indexes once per instance. */
export function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    await Promise.all([
      db.collection("plans").createIndex({ userId: 1, weekStart: -1 }, { unique: true }),
      db.collection("food_logs").createIndex({ userId: 1, date: -1 }, { unique: true }),
      db.collection("measurements").createIndex({ userId: 1, date: -1 }, { unique: true }),
      db.collection("workouts").createIndex({ userId: 1, weekStart: -1 }, { unique: true }),
      db.collection("recipe_events").createIndex({ userId: 1, at: -1 }),
      db.collection("coach_messages").createIndex({ userId: 1, at: -1 }),
      db.collection("recipe_photos").createIndex({ recipeId: 1 }, { unique: true }),
      db.collection("profiles").createIndex({ "subscription.customerId": 1 }, { sparse: true }),
      // Anti-spam counters for the contact form, deleted automatically after a day.
      db.collection("contact_attempts").createIndex({ at: 1 }, { expireAfterSeconds: 86400 }),
    ]);
  })().catch((e) => {
    indexesReady = undefined;
    throw e;
  });
  return indexesReady;
}
