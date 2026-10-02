import type { Goal, Localized } from "./types";
import { createRng } from "./random";

export type SportEquipment = "none" | "mat" | "dumbbells" | "band" | "kettlebell" | "pullup_bar" | "bike" | "pool";
export type SportLevel = "beginner" | "intermediate" | "advanced";
export type ExerciseKind = "strength" | "cardio" | "mobility";
export type MuscleGroup = "legs" | "glutes" | "chest" | "back" | "shoulders" | "arms" | "core" | "full";
export type Limitation = "knees" | "back" | "shoulders" | "wrists";

export interface Exercise {
  id: string;
  name: Localized;
  kind: ExerciseKind;
  muscles: MuscleGroup[];
  equipment: SportEquipment[];
  level: 1 | 2 | 3;
  /** Count repetitions or hold for seconds */
  unit: "reps" | "seconds";
  /** Metabolic equivalent, used for energy estimates */
  met: number;
  lowImpact: boolean;
  /** Joints the exercise stresses (skipped when the user reports pain there) */
  stresses: Limitation[];
  steps: Localized[];
  tips: Localized[];
  /** Easier version proposed when the exercise is too hard */
  easier?: string;
}

export interface SportProfile {
  level: SportLevel;
  goal: Goal;
  /** 0 = Monday … 6 = Sunday */
  availableDays: number[];
  minutesPerSession: number;
  equipment: SportEquipment[];
  limitations: Limitation[];
  weightKg: number;
  /** Week number since the program started, for progression */
  week: number;
}

export interface WorkoutBlock {
  exerciseId: string;
  sets: number;
  /** reps or seconds depending on the exercise */
  amount: number;
  restSec: number;
}

export type SessionType = "rest" | "walk" | "strength" | "cardio" | "mobility";

export interface WorkoutSession {
  day: number;
  type: SessionType;
  title: Localized;
  minutes: number;
  warmup: WorkoutBlock[];
  blocks: WorkoutBlock[];
  /** Repeat the circuit this many rounds */
  rounds: number;
  kcal: number;
}

export interface WorkoutWeek {
  week: number;
  sessions: WorkoutSession[];
  stepsGoal: number;
}

const SESSIONS_BY_LEVEL: Record<SportLevel, [min: number, max: number]> = {
  beginner: [2, 4],
  intermediate: [3, 5],
  advanced: [4, 6],
};

function usable(e: Exercise, p: SportProfile): boolean {
  if (!e.equipment.every((eq) => eq === "none" || eq === "mat" || p.equipment.includes(eq))) return false;
  if (e.stresses.some((s) => p.limitations.includes(s))) return false;
  const maxLevel = p.level === "beginner" ? 1 : p.level === "intermediate" ? 2 : 3;
  return e.level <= maxLevel;
}

/** kcal ≈ MET × kg × hours */
export function sessionKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round((met * weightKg * minutes) / 60);
}

function title(fr: string, en: string): Localized {
  return { fr, en };
}

/**
 * Builds the week's training plan: which days, which sessions, and the
 * exercises with sets, repetitions and rest. Deterministic for a given week.
 */
export function generateWorkoutWeek(p: SportProfile, library: Exercise[]): WorkoutWeek {
  const rng = createRng(p.week * 7919 + p.availableDays.length * 31 + p.minutesPerSession);
  const days = [...new Set(p.availableDays)].filter((d) => d >= 0 && d <= 6).sort();
  const [, max] = SESSIONS_BY_LEVEL[p.level];
  const count = Math.min(max, days.length);

  // Spread sessions over available days, avoiding back-to-back strength days.
  const chosen = spread(days, count);
  const strengthShare = p.goal === "gain_muscle" ? 0.75 : p.goal === "lose_weight" ? 0.5 : 0.5;
  const nStrength = Math.max(chosen.length > 0 ? 1 : 0, Math.round(chosen.length * strengthShare));

  const types: SessionType[] = [];
  for (let i = 0; i < chosen.length; i++) {
    // Alternate: strength first, then cardio / walk.
    const strengthLeft = nStrength - types.filter((t) => t === "strength").length;
    const slotsLeft = chosen.length - i;
    if (strengthLeft >= slotsLeft || (strengthLeft > 0 && (i % 2 === 0 || types[i - 1] !== "strength"))) types.push("strength");
    else types.push(p.level === "beginner" && i % 2 === 1 ? "walk" : "cardio");
  }
  if (chosen.length >= 4) types[types.length - 1] = "mobility";

  const sessions: WorkoutSession[] = [];
  let strengthIndex = 0;
  for (let day = 0; day < 7; day++) {
    const idx = chosen.indexOf(day);
    if (idx < 0) {
      sessions.push({ day, type: "rest", title: title("Repos", "Rest"), minutes: 0, warmup: [], blocks: [], rounds: 0, kcal: 0 });
      continue;
    }
    const type = types[idx]!;
    if (type === "strength") sessions.push(strengthSession(p, library, day, strengthIndex++, rng));
    else if (type === "cardio") sessions.push(cardioSession(p, library, day, rng));
    else if (type === "walk") sessions.push(walkSession(p, day));
    else sessions.push(mobilitySession(p, library, day));
  }
  const stepsBase = p.level === "beginner" ? 6000 : p.level === "intermediate" ? 8000 : 10000;
  return { week: p.week, sessions, stepsGoal: Math.min(12000, stepsBase + Math.min(4, p.week - 1) * 500) };
}

function spread(days: number[], count: number): number[] {
  if (count >= days.length) return days;
  const out: number[] = [];
  const step = days.length / count;
  for (let i = 0; i < count; i++) out.push(days[Math.floor(i * step)]!);
  return out;
}

function progression(p: SportProfile) {
  // +1 rep per week up to +4, then the circuit gets an extra round.
  const w = Math.max(1, p.week);
  return { extraReps: Math.min(4, w - 1), extraSec: Math.min(20, (w - 1) * 5) };
}

function warmup(library: Exercise[], p: SportProfile): WorkoutBlock[] {
  const ids = ["marche-sur-place", "rotations-bras", "jumping-jacks"];
  return ids
    .map((id) => library.find((e) => e.id === id))
    .filter((e): e is Exercise => !!e && usable(e, p))
    .slice(0, 2)
    .map((e) => ({ exerciseId: e.id, sets: 1, amount: 45, restSec: 0 }));
}

function strengthSession(p: SportProfile, library: Exercise[], day: number, n: number, rng: ReturnType<typeof createRng>): WorkoutSession {
  const pool = library.filter((e) => e.kind === "strength" && usable(e, p));
  // Full body: legs, push, pull, core (+ glutes); upper/lower split for advanced users.
  const focus: MuscleGroup[][] =
    p.level === "advanced"
      ? n % 2 === 0
        ? [["legs"], ["glutes"], ["legs", "glutes"], ["core"]]
        : [["chest"], ["back"], ["shoulders"], ["arms"], ["core"]]
      : [["legs"], ["chest", "shoulders"], ["back"], ["glutes"], ["core"]];
  const picked: Exercise[] = [];
  for (const group of focus) {
    const options = pool.filter((e) => e.muscles.some((m) => group.includes(m)) && !picked.includes(e));
    if (options.length === 0) continue;
    picked.push(options[Math.floor(rng.next() * options.length)]!);
  }
  const { extraReps, extraSec } = progression(p);
  const baseReps = p.level === "beginner" ? 10 : p.level === "intermediate" ? 12 : 12;
  const rest = p.goal === "gain_muscle" ? 75 : 45;
  const blocks = picked.map((e) => ({
    exerciseId: e.id,
    sets: 1,
    amount: e.unit === "reps" ? baseReps + extraReps : 30 + extraSec,
    restSec: rest,
  }));
  // Fit rounds in the available time (≈ 50 s per exercise + rest, plus warm-up).
  const perRound = blocks.reduce((s, b) => s + 50 + b.restSec, 0) / 60;
  const rounds = Math.max(1, Math.min(p.level === "beginner" ? 3 : 4, Math.floor((p.minutesPerSession - 5) / Math.max(1, perRound))));
  const minutes = Math.min(p.minutesPerSession, Math.round(5 + rounds * perRound));
  return {
    day,
    type: "strength",
    title: p.level === "advanced" ? (n % 2 === 0 ? title("Renforcement bas du corps", "Lower body strength") : title("Renforcement haut du corps", "Upper body strength")) : title("Renforcement complet", "Full body strength"),
    minutes,
    warmup: warmup(library, p),
    blocks,
    rounds,
    kcal: sessionKcal(4.5, p.weightKg, minutes),
  };
}

function cardioSession(p: SportProfile, library: Exercise[], day: number, rng: ReturnType<typeof createRng>): WorkoutSession {
  const lowImpact = p.limitations.includes("knees") || p.level === "beginner";
  const pool = library.filter((e) => e.kind === "cardio" && usable(e, p) && (!lowImpact || e.lowImpact));
  const picked: Exercise[] = [];
  while (picked.length < Math.min(5, pool.length)) {
    const e = pool[Math.floor(rng.next() * pool.length)]!;
    if (!picked.includes(e)) picked.push(e);
  }
  const { extraSec } = progression(p);
  const work = (p.level === "advanced" ? 40 : p.level === "intermediate" ? 30 : 25) + Math.min(10, extraSec);
  const rest = p.level === "advanced" ? 20 : 30;
  const perRound = (picked.length * (work + rest)) / 60;
  const rounds = Math.max(2, Math.floor((p.minutesPerSession - 5) / Math.max(1, perRound)));
  const minutes = Math.min(p.minutesPerSession, Math.round(5 + rounds * perRound));
  return {
    day,
    type: "cardio",
    title: title("Cardio en intervalles", "Interval cardio"),
    minutes,
    warmup: warmup(library, p),
    blocks: picked.map((e) => ({ exerciseId: e.id, sets: 1, amount: work, restSec: rest })),
    rounds,
    kcal: sessionKcal(lowImpact ? 5 : 7, p.weightKg, minutes),
  };
}

function walkSession(p: SportProfile, day: number): WorkoutSession {
  const minutes = Math.min(p.minutesPerSession, 20 + Math.min(4, p.week - 1) * 5);
  return {
    day,
    type: "walk",
    title: title(`Marche active ${minutes} min`, `Brisk walk ${minutes} min`),
    minutes,
    warmup: [],
    blocks: [],
    rounds: 1,
    kcal: sessionKcal(3.8, p.weightKg, minutes),
  };
}

function mobilitySession(p: SportProfile, library: Exercise[], day: number): WorkoutSession {
  const pool = library.filter((e) => e.kind === "mobility" && usable(e, p)).slice(0, 6);
  const minutes = Math.min(p.minutesPerSession, 20);
  return {
    day,
    type: "mobility",
    title: title("Mobilité et étirements", "Mobility and stretching"),
    minutes,
    warmup: [],
    blocks: pool.map((e) => ({ exerciseId: e.id, sets: 1, amount: 40, restSec: 10 })),
    rounds: 2,
    kcal: sessionKcal(2.5, p.weightKg, minutes),
  };
}
