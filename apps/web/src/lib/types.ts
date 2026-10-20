import type { Locale, Market } from "@weeko/engine";
import type {
  ActivityLevel,
  Allergen,
  FoodPreferences,
  Goal,
  Limitation,
  MealType,
  MedicalFlag,
  PregnancyStatus,
  Sex,
  SportEquipment,
  SportLevel,
  WeekPlan,
  WorkoutWeek,
} from "@weeko/engine";

/** Person data considered health data (RGPD art. 9): stored encrypted. */
export interface MemberHealth {
  id: string;
  name: string;
  self: boolean;
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  weeklyChangeKg?: number;
  targetWeightKg?: number;
  pregnancy?: PregnancyStatus;
  medical?: MedicalFlag[];
  allergies: Allergen[];
  eats: Record<MealType, boolean>;
}

export interface HealthData {
  members: MemberHealth[];
  /** Hide calories and weight in the interface */
  numbersHidden?: boolean;
}

export interface SportSettings {
  enabled: boolean;
  level: SportLevel;
  availableDays: number[];
  minutesPerSession: number;
  equipment: SportEquipment[];
  limitations: Limitation[];
  startedAt: string;
}

export interface Subscription {
  customerId?: string;
  subscriptionId?: string;
  status?: string;
  priceId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  /** A card is saved on the subscription; a trial without one never counts as Premium */
  hasPaymentMethod?: boolean;
}

/** Premium bought in the app (App Store, Google Play), as RevenueCat reports it. */
export interface StoreSubscription {
  /** "app_store", "play_store", or "promotional" (granted from the RevenueCat dashboard) */
  source: string;
  productId: string;
  /** End of the paid period (grace period included); null = never expires */
  expiresAt: Date | null;
  willRenew: boolean;
  billingIssue: boolean;
  sandbox: boolean;
  updatedAt: Date;
}

export type HealthSource = "apple_health" | "health_connect";

export interface Profile {
  _id: string;
  locale: Locale;
  /** Country of the shops: prices and currency */
  market: Market;
  timeZone: string;
  onboarded: boolean;
  prefs: FoodPreferences;
  budget: { enabled: boolean; weekly: number };
  /** Countries chosen for the last week created (empty or absent = every cuisine) */
  cuisines?: string[];
  sport: SportSettings;
  consents: {
    terms?: { at: Date; version: string };
    health?: { at: Date; version: string };
    marketing?: boolean;
  };
  subscription?: Subscription;
  /** Premium bought in the iOS / Android app */
  store?: StoreSubscription | null;
  usage?: { weekStart: string; replacements: number; aiMessages: number };
  /** AI coach messages used in the current calendar month ("2026-10") */
  aiUsage?: { month: string; count: number };
  /** Health apps the phone app reads from (Apple Santé, Health Connect) */
  devices?: Partial<Record<HealthSource, { lastSync: Date }>>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredPlan {
  _id?: unknown;
  userId: string;
  weekStart: string;
  plan: WeekPlan;
  /** Shopping list items ticked */
  checked: string[];
  /** Meals marked as eaten, "day:meal" */
  eaten: string[];
  shoppedAt?: Date;
  actualSpent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogEntry {
  id: string;
  meal: MealType;
  kind: "planned" | "recipe" | "ingredient" | "custom" | "barcode";
  refId?: string;
  /** Planned meals: the recipe, to show its name in the person's language */
  recipeId?: string;
  name: string;
  /** grams for ingredients/barcode, servings for recipes */
  amount: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  at: Date;
}

export interface FoodLog {
  userId: string;
  date: string;
  entries: LogEntry[];
  waterMl: number;
}

export interface StoredWorkoutWeek {
  userId: string;
  weekStart: string;
  week: WorkoutWeek;
  done: number[];
  steps?: Record<string, number>;
}

export interface Measurement {
  date: string;
  kg?: number;
  waistCm?: number;
}

export const CONSENT_VERSION = "2026-10";
