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

export type HealthSource = "apple_health" | "health_connect";

export interface Profile {
  _id: string;
  locale: "fr" | "en";
  market: "FR";
  timeZone: string;
  onboarded: boolean;
  prefs: FoodPreferences;
  budget: { enabled: boolean; weekly: number };
  sport: SportSettings;
  consents: {
    terms?: { at: Date; version: string };
    health?: { at: Date; version: string };
    marketing?: boolean;
  };
  subscription?: Subscription;
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
