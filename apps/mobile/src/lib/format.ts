export const MEAL_LABEL: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  snack: "Collation",
  dinner: "Dîner",
};

export const DAY_LABEL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const nf = (d = 0) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d });
export const num = (n: number, d = 0) => nf(d).format(n);
export const euro = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

export function longDate(iso: string): string {
  const s = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00`));
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
