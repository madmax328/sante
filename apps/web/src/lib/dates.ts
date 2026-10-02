/** Calendar helpers working on plain YYYY-MM-DD strings in the user's time zone. */

export function todayIn(timeZone = "Europe/Paris", now = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function weekStartOf(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(date, -dow);
}

/** 0 = Monday … 6 = Sunday */
export function dayIndex(date: string): number {
  const d = new Date(date + "T12:00:00Z");
  return (d.getUTCDay() + 6) % 7;
}

export function ageFrom(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T12:00:00Z").getTime());
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / 86400000);
}
