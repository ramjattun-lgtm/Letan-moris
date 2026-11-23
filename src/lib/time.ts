import { currentLang } from "./i18n";
// Mauritius time helpers. Mauritius and Rodrigues use UTC+4 all year (no daylight saving).
// Forecast times are kept as local strings "YYYY-MM-DDTHH:mm" so the device's own
// time zone can never shift what is displayed.

export const MU_TZ = "Indian/Mauritius";
export const MU_OFFSET_HOURS = 4;

const pad = (n: number) => String(n).padStart(2, "0");

/** Current Mauritius local time as "YYYY-MM-DDTHH:mm". */
export function nowMU(now: Date = new Date()): string {
  const t = new Date(now.getTime() + MU_OFFSET_HOURS * 3600_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

/** Today's date in Mauritius, "YYYY-MM-DD". */
export function todayMU(now: Date = new Date()): string {
  return nowMU(now).slice(0, 10);
}

/** Add days to a "YYYY-MM-DD" date string. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** "HH:mm" from a local time string. */
export function hhmm(local: string | null | undefined): string {
  if (!local || local.length < 16) return "—";
  return local.slice(11, 16);
}

/** Hour number 0–23 from a local time string. */
export function hourOf(local: string): number {
  return Number(local.slice(11, 13));
}

/** Truncate a local time to the start of its hour: "YYYY-MM-DDTHH:00". */
export function hourStart(local: string): string {
  return `${local.slice(0, 13)}:00`;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// French and Kreol day and month names (the app's language is set on the phone; server output stays English).
const DAYS_L = {
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  mfe: ["Dimans", "Lindi", "Mardi", "Merkredi", "Zedi", "Vandredi", "Samdi"],
};
const MONTHS_L = {
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  mfe: ["Zan", "Fev", "Mar", "Avr", "Me", "Zin", "Zilye", "Out", "Sept", "Okt", "Nov", "Des"],
};
const TODAY_L = { fr: ["Aujourd'hui", "Demain"], mfe: ["Zordi", "Demin"] };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Add hours to a local time string (handles day changes). */
export function addHours(local: string, hours: number): string {
  const [d, t] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const x = new Date(Date.UTC(y, mo - 1, da, h + hours, mi));
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}T${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`;
}

/** Day of week (0=Sunday) for a "YYYY-MM-DD" date. */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "Today", "Tomorrow" or "Saturday 22 Nov". */
export function dayLabel(date: string, now: Date = new Date()): string {
  const today = todayMU(now);
  const l = currentLang();
  if (l !== "en") {
    if (date === today) return TODAY_L[l][0];
    if (date === addDays(today, 1)) return TODAY_L[l][1];
    const [, m, d] = date.split("-").map(Number);
    return `${DAYS_L[l][weekday(date)]} ${d} ${MONTHS_L[l][m - 1]}`;
  }
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  const [, m, d] = date.split("-").map(Number);
  return `${DAYS[weekday(date)]} ${d} ${MONTHS[m - 1]}`;
}

export function shortDay(date: string, now: Date = new Date()): string {
  const today = todayMU(now);
  const l = currentLang();
  if (l !== "en") return date === today ? TODAY_L[l][0] : DAYS_L[l][weekday(date)].slice(0, 3);
  if (date === today) return "Today";
  return DAYS[weekday(date)].slice(0, 3);
}

/** Minutes between two local time strings (b - a). */
export function minutesBetween(a: string, b: string): number {
  const toMs = (s: string) => {
    const [d, t] = s.split("T");
    const [y, mo, da] = d.split("-").map(Number);
    const [h, mi] = t.split(":").map(Number);
    return Date.UTC(y, mo - 1, da, h, mi);
  };
  return Math.round((toMs(b) - toMs(a)) / 60000);
}

/** Human "x min ago" / "x h ago" from an ISO UTC timestamp. */
export function ago(isoUtc: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(isoUtc).getTime()) / 60000));
  const l = currentLang();
  const h = Math.floor(mins / 60);
  if (l === "fr") return mins < 1 ? "à l'instant" : mins < 60 ? `il y a ${mins} min` : h < 48 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} jours`;
  if (l === "mfe") return mins < 1 ? "aster mem" : mins < 60 ? `${mins} min desela` : h < 48 ? `${h} er desela` : `${Math.floor(h / 24)} zour desela`;
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} days ago`;
}

/** Format an ISO UTC timestamp as Mauritius "HH:mm, D Mon". */
export function formatUtcAsMU(isoUtc: string): string {
  const local = nowMU(new Date(isoUtc));
  const [, m, d] = local.slice(0, 10).split("-").map(Number);
  const l = currentLang();
  return `${local.slice(11, 16)}, ${d} ${l === "en" ? MONTHS[m - 1] : MONTHS_L[l][m - 1]}`;
}
