// River watch: is heavy rain falling (or about to fall) UPSTREAM? Short, steep Mauritian rivers can rise
// within an hour of heavy rain in the hills — even when it is dry in the towns below.
// These are cautious, documented starting thresholds, not hydrological measurements.
import { addHours, hhmm, hourStart, nowMU } from "@/lib/time";

export type RiverLevel = "low" | "moderate" | "high";

export const RIVER_RULES = {
  high: { past3h: 30, next3h: 30, max1h: 20, combined: 45 },
  moderate: { past3h: 12, next3h: 15, max1h: 8, combined: 20 },
};

export interface RiverAssessment {
  level: RiverLevel | null;
  past3h: number | null;
  next3h: number | null;
  next6h: number | null;
  max1h: { mm: number; time: string } | null;
  message: string;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** hours: upstream-average hourly rain (mm), Mauritius local "YYYY-MM-DDTHH:mm". */
export function assessRiver(hours: { time: string; mm: number | null }[], upstreamText: string, downstreamText: string, now: string = nowMU()): RiverAssessment {
  const start = hourStart(now);
  const sum = (from: string, to: string) => {
    const xs = hours.filter((h) => h.time >= from && h.time < to);
    if (!xs.length || xs.some((h) => h.mm === null)) return null;
    return r1(xs.reduce((a, h) => a + (h.mm as number), 0));
  };
  const past3h = sum(addHours(start, -3), start);
  const next3h = sum(start, addHours(start, 3));
  const next6h = sum(start, addHours(start, 6));
  let max1h: RiverAssessment["max1h"] = null;
  for (const h of hours) if (h.mm !== null && h.time >= addHours(start, -3) && h.time < addHours(start, 6) && (!max1h || h.mm > max1h.mm)) max1h = { mm: r1(h.mm), time: h.time };
  if (past3h === null || next3h === null) return { level: null, past3h, next3h, next6h, max1h, message: "River watch not available right now." };
  const hit = (r: typeof RIVER_RULES.high) => past3h >= r.past3h || next3h >= r.next3h || (max1h?.mm ?? 0) >= r.max1h || past3h + next3h >= r.combined;
  const level: RiverLevel = hit(RIVER_RULES.high) ? "high" : hit(RIVER_RULES.moderate) ? "moderate" : "low";
  const when = past3h >= next3h ? `about ${past3h} mm in the last 3 hours` : `about ${next3h} mm expected in the next 3 hours${max1h && max1h.time >= start ? `, heaviest around ${hhmm(max1h.time)}` : ""}`;
  const message =
    level === "high"
      ? `Heavy rain over ${upstreamText}: ${when}. The river can rise quickly and suddenly in ${downstreamText} — even if it is dry there. Keep away from the river, bridges, fords and canals.`
      : level === "moderate"
        ? `Rain over ${upstreamText}: ${when}. Water may rise in ${downstreamText}. Avoid riverbeds and river crossings.`
        : `No heavy rain upstream in the last 3 hours or expected in the next 3.`;
  return { level, past3h, next3h, next6h, max1h, message };
}

export const RIVER_SAFETY = [
  "Never cross a flooded bridge, ford or road: about 30 cm of fast water can sweep a car away.",
  "Keep away from riverbanks, canals and drains during heavy rain — and keep children away too.",
  "At a waterfall or in a river, leave at once if the water turns brown, rises or you hear a roar upstream.",
  "Move cars away from low ground near rivers and canals when heavy rain is expected.",
];

export const RIVER_DISCLAIMER =
  "Independent estimate from forecast rain over each river's upper catchment (approximate areas) — not a river-level measurement and not an MMS warning. Always follow MMS heavy rain and torrential rain warnings and the NDRRMC.";
