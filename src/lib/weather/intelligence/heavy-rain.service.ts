import type { Maybe } from "../types";
import { addHours, hhmm, hourStart, nowMU } from "@/lib/time";

// Independent HEAVY-RAIN RISK — not an MMS warning.
// Combines (1) how intense the forecast rain is in any hour, (2) how much falls over 3 h and 24 h,
// and (3) how wet the ground already is from the last 48 h. Thresholds are documented here and
// deliberately cautious; global models often UNDER-estimate short tropical downpours, so "Low"
// never means "no flooding".

export type RainRisk = "low" | "moderate" | "high";

export const HEAVY_RAIN_RULES = {
  high: { max1h: 20, max3h: 40, next24: 75, wetGround: 50, next24OnWet: 40 },
  moderate: { max1h: 8, max3h: 20, next24: 35, wetGround: 30, next24OnWet: 20 },
};

export interface RainHour {
  time: string; // Mauritius local "YYYY-MM-DDTHH:mm"
  mm: Maybe<number>;
}

export interface HeavyRainAssessment {
  level: RainRisk | null; // null = not enough data
  max1h: Maybe<{ mm: number; time: string }>;
  max3h: Maybe<{ mm: number; from: string }>;
  next24: Maybe<number>;
  past48: Maybe<number>;
  summary: string;
  reasons: string[];
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function assessHeavyRain(hours: RainHour[], now: string = nowMU()): HeavyRainAssessment {
  const start = hourStart(now);
  const end = addHours(start, 24);
  const past = hours.filter((h) => h.time < start && h.time >= addHours(start, -48));
  const next = hours.filter((h) => h.time >= start && h.time < end);
  const knownNext = next.filter((h) => h.mm !== null) as { time: string; mm: number }[];
  if (knownNext.length < 12) {
    return { level: null, max1h: null, max3h: null, next24: null, past48: null, summary: "Heavy-rain risk not available.", reasons: [] };
  }
  const next24 = round1(knownNext.reduce((a, h) => a + h.mm, 0));
  const pastKnown = past.filter((h) => h.mm !== null) as { time: string; mm: number }[];
  const past48 = pastKnown.length >= 24 ? round1(pastKnown.reduce((a, h) => a + h.mm, 0)) : null;
  let max1h: HeavyRainAssessment["max1h"] = null;
  for (const h of knownNext) if (!max1h || h.mm > max1h.mm) max1h = { mm: round1(h.mm), time: h.time };
  let max3h: HeavyRainAssessment["max3h"] = null;
  for (let i = 0; i + 2 < knownNext.length; i++) {
    const s = round1(knownNext[i].mm + knownNext[i + 1].mm + knownNext[i + 2].mm);
    if (!max3h || s > max3h.mm) max3h = { mm: s, from: knownNext[i].time };
  }
  const R = HEAVY_RAIN_RULES;
  const wet = (lvl: typeof R.high) => past48 !== null && past48 >= lvl.wetGround && next24 >= lvl.next24OnWet;
  const hits = (lvl: typeof R.high) => (max1h?.mm ?? 0) >= lvl.max1h || (max3h?.mm ?? 0) >= lvl.max3h || next24 >= lvl.next24 || wet(lvl);
  const level: RainRisk = hits(R.high) ? "high" : hits(R.moderate) ? "moderate" : "low";

  const reasons: string[] = [];
  if (max1h && max1h.mm >= 1) reasons.push(`Up to ${max1h.mm} mm in one hour around ${hhmm(max1h.time)}.`);
  if (max3h && max3h.mm >= 2) reasons.push(`Up to ${max3h.mm} mm in 3 hours from about ${hhmm(max3h.from)}.`);
  reasons.push(`About ${next24} mm expected in the next 24 hours.`);
  if (past48 !== null) reasons.push(past48 >= R.moderate.wetGround ? `Ground already wet: about ${past48} mm in the last 2 days.` : `About ${past48} mm fell in the last 2 days (model estimate).`);

  const when = max1h && max1h.mm >= 1 ? `, heaviest around ${hhmm(max1h.time)}` : "";
  const summary =
    level === "high"
      ? `High heavy-rain risk${when}. Water accumulation and flash flooding are possible in low-lying and flood-prone areas.`
      : level === "moderate"
        ? `Moderate heavy-rain risk${when}. Some water accumulation is possible in usual trouble spots.`
        : "Low heavy-rain risk from the forecast. Sudden local downpours can still happen.";
  return { level, max1h, max3h, next24, past48, summary, reasons };
}

export const RISK_LABEL: Record<RainRisk, string> = { low: "Low", moderate: "Moderate", high: "High" };
export const RISK_COLOR: Record<RainRisk, string> = { low: "#8FD3C4", moderate: "#F2A541", high: "#D9480F" };

export const HEAVY_RAIN_DISCLAIMER =
  "Independent forecast, not an MMS warning. Heavy rain watch, heavy rain and torrential rain warnings come only from MMS — always follow them.";
