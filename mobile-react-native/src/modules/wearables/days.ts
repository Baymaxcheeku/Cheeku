/** Local calendar days. Health data belongs to the day the person lived, not to UTC. */

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function endOfDay(day: string): Date {
  const s = startOfDay(day);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1, 0, 0, 0, 0);
}

export function addDays(day: string, n: number): string {
  const s = startOfDay(day);
  return dayKey(new Date(s.getFullYear(), s.getMonth(), s.getDate() + n));
}

/** The last `n` days ending today, oldest first. */
export function lastDays(n: number, today: string = dayKey(new Date())): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function weekdayLetter(day: string): string {
  return (WEEKDAYS[startOfDay(day).getDay()] ?? "").slice(0, 1);
}

export function shortDate(day: string): string {
  const d = startOfDay(day);
  return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] ?? ""}`;
}
