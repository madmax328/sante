import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "./api";
import { addDays } from "./format";
import { t } from "./i18n";

/**
 * Reminders are local notifications, scheduled on the phone for the next
 * 7 days from what Sorloo knows (planned workouts, what is already logged).
 * They are rescheduled each time the app opens or goes to the background,
 * so a reminder for something already done is dropped.
 */

export interface ReminderSettings {
  workout: boolean;
  /** "HH:MM" */
  workoutTime: string;
  meals: boolean;
  water: boolean;
  weekly: boolean;
}

export const WORKOUT_TIMES = ["07:30", "12:00", "18:00", "20:00"] as const;

const KEY = "sorloo.reminders";
const CHANNEL = "reminders";
export const DEFAULT_REMINDERS: ReminderSettings = { workout: true, workoutTime: "18:00", meals: true, water: true, weekly: true };

interface ReminderData {
  today: string;
  name: string;
  loggedToday: string[];
  water: { ml: number; target: number };
  workouts: { date: string; title: string; minutes: number; done: boolean }[];
  nextWeekReady: boolean;
}

/** null = reminders not set up (or turned off). */
export async function getReminderSettings(): Promise<ReminderSettings | null> {
  const raw = await SecureStore.getItemAsync(KEY).catch(() => null);
  if (!raw) return null;
  try {
    return { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    return null;
  }
}

async function permitted(ask: boolean): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  if (!ask || !current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Turns reminders on (asks for the permission). False when the person refused it. */
export async function enableReminders(settings: ReminderSettings = DEFAULT_REMINDERS): Promise<boolean> {
  if (!(await permitted(true))) return false;
  await SecureStore.setItemAsync(KEY, JSON.stringify(settings));
  await scheduleReminders();
  return true;
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(settings));
  await scheduleReminders();
}

export async function disableReminders(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
  if (Platform.OS !== "web") await Notifications.cancelAllScheduledNotificationsAsync();
}

/** "allowed" | "denied" (turned off in the iPhone settings) | "unknown" (never asked). */
export async function permissionState(): Promise<"allowed" | "denied" | "unknown"> {
  if (Platform.OS === "web") return "denied";
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "allowed";
  return p.canAskAgain ? "unknown" : "denied";
}

function at(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

interface Planned {
  date: Date;
  title: string;
  body: string;
  url: string;
}

/** The reminders of the next 7 days (pure: easy to check). */
export function plan(s: ReminderSettings, d: ReminderData, now = new Date()): Planned[] {
  const out: Planned[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(d.today, i);
    const today = i === 0;
    if (s.workout) {
      const w = d.workouts.find((x) => x.date === date);
      if (w && !w.done) out.push({ date: at(date, s.workoutTime), title: t("Ta séance du jour", "Today's workout"), body: t("{0} · {1} min. On s'y met ?", "{0} · {1} min. Ready?", [w.title, w.minutes]), url: "/sport" });
    }
    if (s.meals) {
      if (!(today && d.loggedToday.includes("lunch"))) out.push({ date: at(date, "13:45"), title: t("Ton déjeuner", "Your lunch"), body: t("Note-le en quelques secondes dans ton journal.", "Log it in a few seconds in your journal."), url: "/journal" });
      if (!(today && d.loggedToday.includes("dinner"))) out.push({ date: at(date, "20:45"), title: t("Ton dîner", "Your dinner"), body: t("Un petit mot dans ton journal avant la soirée ?", "A quick note in your journal before the evening?"), url: "/journal" });
    }
    if (s.water && !(today && d.water.ml >= d.water.target)) {
      out.push({ date: at(date, "11:00"), title: t("Un verre d'eau ?", "A glass of water?"), body: t("Petit rappel pour ton objectif d'eau du jour.", "A small reminder for today's water goal."), url: "/" });
      out.push({ date: at(date, "16:00"), title: t("Un verre d'eau ?", "A glass of water?"), body: t("Tu es où de ton objectif d'eau ? Note tes verres dans l'app.", "How's your water goal going? Log your glasses in the app."), url: "/" });
    }
    if (s.weekly && new Date(`${date}T12:00:00`).getDay() === 0) {
      out.push(
        d.nextWeekReady
          ? { date: at(date, "18:30"), title: t("Ton bilan de la semaine", "Your weekly review"), body: t("Ta semaine en un coup d'œil : repas, séances, poids et budget.", "Your week at a glance: meals, workouts, weight and budget."), url: "/progress" }
          : { date: at(date, "18:30"), title: t("Ta nouvelle semaine t'attend", "Your new week is waiting"), body: t("Ton bilan est prêt. Crée ta semaine suivante en un geste : menus, courses et sport.", "Your review is ready. Create next week in one tap: meals, groceries and workouts."), url: "/week" },
      );
    }
  }
  // iOS keeps at most 64 pending notifications per app.
  return out.filter((x) => x.date > now).sort((a, b) => +a.date - +b.date).slice(0, 60);
}

let running: Promise<void> | null = null;

/** Replaces the pending reminders with fresh ones. Silent when off or offline. */
export function scheduleReminders(): Promise<void> {
  running ??= (async () => {
    try {
      const s = await getReminderSettings();
      if (!s || !(await permitted(false))) {
        if (Platform.OS !== "web") await Notifications.cancelAllScheduledNotificationsAsync();
        return;
      }
      const data = await api.get<ReminderData>("/reminders");
      if (Platform.OS === "android") await Notifications.setNotificationChannelAsync(CHANNEL, { name: t("Rappels", "Reminders"), importance: Notifications.AndroidImportance.DEFAULT });
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const r of plan(s, data)) {
        await Notifications.scheduleNotificationAsync({
          content: { title: r.title, body: r.body, data: { url: r.url } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL },
        });
      }
    } catch {
      // Offline or not allowed: the reminders scheduled last time stay.
    } finally {
      running = null;
    }
  })();
  return running;
}
