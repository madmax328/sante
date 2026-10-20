import { intlLocale, t } from "./i18n";

export const MEAL_LABEL: Record<string, string> = {
  breakfast: t("Petit-déjeuner", "Breakfast"),
  lunch: t("Déjeuner", "Lunch"),
  snack: t("Collation", "Snack"),
  dinner: t("Dîner", "Dinner"),
};

export const DAY_LABEL = t("Lundi Mardi Mercredi Jeudi Vendredi Samedi Dimanche", "Monday Tuesday Wednesday Thursday Friday Saturday Sunday").split(" ");

const nf = (d = 0) => new Intl.NumberFormat(intlLocale, { maximumFractionDigits: d });
export const num = (n: number, d = 0) => nf(d).format(n);
/** Currency of the shops' country (set from the account once loaded). */
let currency = "EUR";
export function setCurrency(code: string | undefined): void {
  currency = code || "EUR";
}
export const euro = (n: number) => new Intl.NumberFormat(intlLocale, { style: "currency", currency }).format(n);
/** The currency sign alone ("€", "CHF", "£"). */
export const currencySign = () => new Intl.NumberFormat(intlLocale, { style: "currency", currency, maximumFractionDigits: 0 }).format(0).replace(/[\d\s\u00a0\u202f.,]/g, "");

export function longDate(iso: string): string {
  const s = new Intl.DateTimeFormat(intlLocale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00`));
}

/** "250 g", "1,5 l", "2 œufs": quantities for one person and n servings. */
export function quantity(qty: number, unit: "g" | "ml" | "pc", name: string, plural: string | null, servings: number): string {
  const q = qty * servings;
  if (unit === "pc") {
    const n = Math.round(q * 4) / 4;
    return `${num(n, 2)} ${n > 1 && plural ? plural.toLowerCase() : name.toLowerCase()}`;
  }
  if (unit === "ml") return q >= 1000 ? `${num(q / 1000, 2)} l · ${name.toLowerCase()}` : `${num(Math.round(q))} ml · ${name.toLowerCase()}`;
  return q >= 1000 ? `${num(q / 1000, 2)} kg · ${name.toLowerCase()}` : `${num(Math.round(q))} g · ${name.toLowerCase()}`;
}

/** ISO date n days later (or earlier). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner"] as const;
export type Meal = (typeof MEAL_ORDER)[number];
