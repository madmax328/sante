import {
  isHealthDataAvailable,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "./api";

/**
 * Apple Santé (HealthKit): daily steps, weigh-ins and workouts are read on the
 * phone and sent to Sorloo. Nothing is written to Apple Santé. Android
 * (Health Connect) will come with the Android app.
 */

const ENABLED_KEY = "sorloo.appleHealth";
const STEPS = "HKQuantityTypeIdentifierStepCount";
const WEIGHT = "HKQuantityTypeIdentifierBodyMass";

export interface SyncResult {
  steps: number;
  weights: number;
  sessions: number;
}

export function healthAvailable(): boolean {
  if (Platform.OS !== "ios") return false;
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function healthEnabled(): Promise<boolean> {
  if (!healthAvailable()) return false;
  return (await SecureStore.getItemAsync(ENABLED_KEY).catch(() => null)) === "1";
}

/** "YYYY-MM-DD" in the phone's time zone. */
function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/** Asks iOS for read access (the system sheet), then imports right away. */
export async function connectAppleHealth(): Promise<SyncResult | null> {
  if (!healthAvailable()) return null;
  await requestAuthorization({ toRead: [STEPS, WEIGHT, WorkoutTypeIdentifier] });
  await SecureStore.setItemAsync(ENABLED_KEY, "1");
  return syncAppleHealth();
}

export async function disconnectAppleHealth(): Promise<void> {
  await SecureStore.deleteItemAsync(ENABLED_KEY).catch(() => undefined);
}

let running: Promise<SyncResult | null> | null = null;

/** Imports the last 7 days of steps and workouts and 30 days of weigh-ins. */
export function syncAppleHealth(): Promise<SyncResult | null> {
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync(): Promise<SyncResult | null> {
  if (!(await healthEnabled())) return null;

  const steps: { date: string; steps: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const startDate = startOfDay(i);
    const endDate = i === 0 ? new Date() : startOfDay(i - 1);
    const stats = await queryStatisticsForQuantity(STEPS, ["cumulativeSum"], { filter: { date: { startDate, endDate } }, unit: "count" }).catch(() => null);
    const total = Math.round(stats?.sumQuantity?.quantity ?? 0);
    if (total > 0) steps.push({ date: localDay(startDate), steps: total });
  }

  // Newest first: the first weigh-in seen for a day is the latest of that day.
  const samples = await queryQuantitySamples(WEIGHT, { limit: 60, ascending: false, unit: "kg", filter: { date: { startDate: startOfDay(30) } } }).catch(() => []);
  const weights = new Map<string, number>();
  for (const s of samples) {
    const day = localDay(new Date(s.startDate));
    if (!weights.has(day)) weights.set(day, s.quantity);
  }

  const sessions = await queryWorkoutSamples({ limit: 60, ascending: false, filter: { date: { startDate: startOfDay(6) } } }).catch(() => []);
  const minutes = new Map<string, number>();
  for (const w of sessions) {
    const day = localDay(new Date(w.startDate));
    minutes.set(day, (minutes.get(day) ?? 0) + (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 60000);
  }

  const res = await api.action<{ ok: boolean } & Partial<SyncResult>>("importHealth", {
    source: "apple_health",
    steps,
    weights: [...weights].map(([date, kg]) => ({ date, kg })),
    workouts: [...minutes].map(([date, m]) => ({ date, minutes: Math.round(m) })),
  });
  if (!res?.ok) return null;
  return { steps: res.steps ?? 0, weights: res.weights ?? 0, sessions: res.sessions ?? 0 };
}
