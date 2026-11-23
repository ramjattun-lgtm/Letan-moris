import type { Forecast, HourlyPoint } from "../types";
import { assessDay, type ActivityId, type Assessment, type Verdict } from "./decision-engine.service";
import { addDays, hhmm, todayMU } from "@/lib/time";

// "Perfect Day" finder: rank the next 7 days for one activity, using the same written rules
// as "Today, for you" (decision engine) plus a photography check at sunrise and sunset.

export type PlanActivity = Extract<ActivityId, "outdoor" | "beach" | "hiking" | "boating" | "kitesurf" | "laundry" | "gardening"> | "photo";

export const PLAN_ACTIVITIES: { id: PlanActivity; label: string; icon: string }[] = [
  { id: "outdoor", label: "Family outing / picnic", icon: "🧺" },
  { id: "beach", label: "Beach day", icon: "🏖️" },
  { id: "hiking", label: "Hike", icon: "🥾" },
  { id: "boating", label: "Boating & fishing", icon: "🎣" },
  { id: "kitesurf", label: "Kitesurf & windsurf", icon: "🪁" },
  { id: "photo", label: "Sunrise / sunset photos", icon: "📷" },
  { id: "laundry", label: "Laundry & drying", icon: "👕" },
  { id: "gardening", label: "Gardening", icon: "🌱" },
];

const RANK: Record<Verdict, number> = { good: 3, fair: 2, poor: 1, unknown: 0 };

export interface PlanDay {
  date: string;
  daysAhead: number;
  a: Assessment;
}

/** Photography: low cloud and little rain at the sunrise and sunset hours. */
export function photoAssessment(f: Forecast, date: string): Assessment {
  const d = f.daily.find((x) => x.date === date);
  const at = (t: string | null) => (t ? f.hourly.find((h) => h.time === `${t.slice(0, 13)}:00`) : undefined);
  const judge = (h: HourlyPoint | undefined): Verdict => {
    if (!h || h.cloudCover === null || h.rainProbability === null) return "unknown";
    if (h.rainProbability >= 50 || h.cloudCover >= 85) return "poor";
    if (h.rainProbability < 25 && h.cloudCover >= 10 && h.cloudCover <= 60) return "good"; // some cloud makes colourful skies
    return "fair";
  };
  const rise = at(d?.sunrise ?? null);
  const set = at(d?.sunset ?? null);
  const vr = judge(rise);
  const vs = judge(set);
  const best = RANK[vr] >= RANK[vs] ? { v: vr, name: "sunrise", t: d?.sunrise ?? null, h: rise } : { v: vs, name: "sunset", t: d?.sunset ?? null, h: set };
  const word = (v: Verdict) => (v === "good" ? "good" : v === "fair" ? "fair" : v === "poor" ? "poor" : "unknown");
  return {
    id: "general",
    title: "Sunrise / sunset photos",
    verdict: best.v,
    summary: best.v === "unknown" ? "Not enough forecast data." : `Best at ${best.name} (${hhmm(best.t)}): ${word(best.v)} light.`,
    period: [d?.sunrise && `sunrise ${hhmm(d.sunrise)}`, d?.sunset && `sunset ${hhmm(d.sunset)}`].filter(Boolean).join(" · "),
    reasons: [rise ? `Sunrise: ${rise.cloudCover}% cloud, ${rise.rainProbability}% chance of rain (${word(vr)}).` : "", set ? `Sunset: ${set.cloudCover}% cloud, ${set.rainProbability}% chance of rain (${word(vs)}).` : "", "Some cloud (10–60%) usually gives the best colours."].filter(Boolean),
    confidence: "medium",
  };
}

export function planDays(f: Forecast, activity: PlanActivity, today = todayMU()): PlanDay[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i))
    .filter((date) => f.daily.some((d) => d.date === date))
    .map((date, i) => {
      const a = activity === "photo" ? photoAssessment(f, date) : assessDay(f.hourly, f.daily, date, i).find((x) => x.id === activity);
      return a ? { date, daysAhead: i, a } : null;
    })
    .filter((x): x is PlanDay => x !== null);
}

/** Best day: highest verdict, the sooner the better (forecasts get less reliable further ahead). */
export function bestDay(days: PlanDay[]): PlanDay | null {
  const ok = days.filter((d) => d.a.verdict === "good" || d.a.verdict === "fair");
  if (!ok.length) return null;
  return [...ok].sort((x, y) => RANK[y.a.verdict] - RANK[x.a.verdict] || x.daysAhead - y.daysAhead)[0];
}
