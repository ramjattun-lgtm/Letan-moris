import type { HourlyPoint } from "../types";
import { hhmm, hourStart, nowMU } from "@/lib/time";
import { translate, type Key } from "@/lib/i18n";

type T = (key: Key, vars?: Record<string, string | number>) => string;
const EN: T = (k, v) => translate("en", k, v);

// Rain in the next 6 hours, from the hourly model forecast. Forecast guidance — not radar.
export const NEXT_HOURS = 6;
// Calibrated against the accuracy check (Nov 2026): the models often forecast light rain that
// does not come (many false alarms at Plaisance airport), so "likely" needs a solid signal.
export const RAIN_LIKELY_PCT = 60; // and at least 0.5 mm in the hour
export const LIKELY_MM = 0.5;
export const RAIN_POSSIBLE_PCT = 30;
export const WET_MM = 0.2;

export type HourRain = "likely" | "possible" | "dry" | "unknown";

export interface NextHour {
  time: string;
  label: string; // "Now" or "14:00"
  pct: number | null;
  mm: number | null;
  rain: HourRain;
}

export function classifyHour(h: Pick<HourlyPoint, "rainProbability" | "precipitation">): HourRain {
  const p = h.rainProbability;
  const mm = h.precipitation;
  if (p === null && mm === null) return "unknown";
  if ((p ?? 0) >= RAIN_LIKELY_PCT && (mm ?? 0) >= LIKELY_MM) return "likely";
  if ((p ?? 0) >= RAIN_POSSIBLE_PCT || (mm ?? 0) >= WET_MM) return "possible";
  return "dry";
}

export function nextHours(hourly: HourlyPoint[], now: string = nowMU(), n = NEXT_HOURS): NextHour[] {
  const start = hourStart(now);
  return hourly
    .filter((h) => h.time >= start)
    .slice(0, n)
    .map((h, i) => ({ time: h.time, label: i === 0 ? "Now" : hhmm(h.time), pct: h.rainProbability, mm: h.precipitation, rain: classifyHour(h) }));
}

/** One plain sentence for the strip. */
export function nextHoursHeadline(hours: NextHour[], t: T = EN): string {
  if (!hours.length || hours.every((h) => h.rain === "unknown")) return t("next6.na");
  const total = hours.reduce((s, h) => s + (h.mm ?? 0), 0);
  const first = hours.findIndex((h) => h.rain === "likely");
  const maybe = hours.findIndex((h) => h.rain === "possible");
  const when = (i: number) => (i === 0 ? t("next6.whenNow") : t("next6.whenFrom", { time: hours[i].label }));
  if (first >= 0) return t("next6.likely", { when: when(first), pct: hours[first].pct ?? "—", mm: round1(total) });
  if (maybe >= 0) return t("next6.possible", { when: when(maybe), pct: hours[maybe].pct ?? "—" });
  return t("next6.dry");
}

const round1 = (x: number) => (x < 1 ? "<1" : String(Math.round(x * 10) / 10));
