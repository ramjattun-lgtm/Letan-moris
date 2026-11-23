import type { HourlyPoint, LocalTime, Maybe } from "../types";
import { addHours, hhmm, hourStart, nowMU } from "@/lib/time";
import { confidenceForDry, confidenceForRain, type Confidence } from "./confidence.service";

// Rainfall intelligence built ONLY from the hourly data the provider supplies.
// No minute-by-minute precision is invented: times are given to the hour and say "about".

export type Intensity = "none" | "light" | "moderate" | "heavy";

/** Standard rainfall-rate classes (mm per hour). */
export function intensityOf(mmPerHour: Maybe<number>): Maybe<Intensity> {
  if (mmPerHour === null) return null;
  if (mmPerHour < 0.1) return "none";
  if (mmPerHour < 2.5) return "light";
  if (mmPerHour < 7.6) return "moderate";
  return "heavy";
}

export const RAIN_PROB_THRESHOLD = 50; // %
export const RAIN_MM_THRESHOLD = 0.5; // mm in the hour

/** true = rain likely, false = rain unlikely, null = data missing. */
export function isWetHour(h: HourlyPoint): Maybe<boolean> {
  if (h.rainProbability === null && h.precipitation === null) return null;
  return (h.rainProbability ?? 0) >= RAIN_PROB_THRESHOLD || (h.precipitation ?? 0) >= RAIN_MM_THRESHOLD;
}

export interface RainPeriod {
  start: LocalTime; // start of first wet hour
  end: LocalTime; // end of last wet hour (start of the next hour)
  hours: number;
  totalMm: number;
  maxProbability: Maybe<number>;
  peakIntensity: Intensity;
  confidence: Confidence;
}

const nextHour = (t: LocalTime) => addHours(hourStart(t), 1);

const RANK: Intensity[] = ["none", "light", "moderate", "heavy"];

/** "Likely" needs a solid signal: at least 60% chance and 1 mm in the period. */
export const LIKELY_PROB = 60;
export const LIKELY_MM = 1;
export const solidRain = (p: Pick<RainPeriod, "maxProbability" | "totalMm">) => (p.maxProbability ?? 0) >= LIKELY_PROB && p.totalMm >= LIKELY_MM;

/** Group consecutive wet hours into rain periods. */
export function findRainPeriods(hourly: HourlyPoint[]): RainPeriod[] {
  const out: RainPeriod[] = [];
  let cur: RainPeriod | null = null;
  hourly.forEach((h) => {
    const wet = isWetHour(h);
    if (wet) {
      const inten = intensityOf(h.precipitation) ?? "none";
      if (!cur) {
        cur = { start: h.time, end: nextHour(h.time), hours: 0, totalMm: 0, maxProbability: null, peakIntensity: "none", confidence: "low" };
        out.push(cur);
      }
      cur.end = nextHour(h.time);
      cur.hours += 1;
      cur.totalMm = Math.round((cur.totalMm + (h.precipitation ?? 0)) * 10) / 10;
      if (h.rainProbability !== null) cur.maxProbability = Math.max(cur.maxProbability ?? 0, h.rainProbability);
      if (RANK.indexOf(inten) > RANK.indexOf(cur.peakIntensity)) cur.peakIntensity = inten;
      cur.confidence = confidenceForRain(cur.maxProbability);
    } else {
      cur = null;
    }
  });
  return out;
}

export interface WindowSummary {
  label: string;
  hours: number;
  maxProbability: Maybe<number>;
  totalMm: Maybe<number>;
  dataComplete: boolean;
}

/** Hours from the current hour onwards. */
export function upcoming(hourly: HourlyPoint[], now: LocalTime = nowMU()): HourlyPoint[] {
  const h0 = hourStart(now);
  return hourly.filter((h) => h.time >= h0);
}

export function summariseWindow(hours: HourlyPoint[], label: string): WindowSummary {
  const probs = hours.map((h) => h.rainProbability).filter((x): x is number => x !== null);
  const mm = hours.map((h) => h.precipitation).filter((x): x is number => x !== null);
  return {
    label,
    hours: hours.length,
    maxProbability: probs.length ? Math.max(...probs) : null,
    totalMm: mm.length ? Math.round(mm.reduce((a, b) => a + b, 0) * 10) / 10 : null,
    dataComplete: probs.length === hours.length && mm.length === hours.length,
  };
}

export interface RainOutlook {
  headline: string;
  detail: string;
  confidence: Confidence;
  next3h: WindowSummary;
  next6h: WindowSummary;
  next24h: WindowSummary;
  periods: RainPeriod[];
  resolutionNote: string;
}

/** Plain-English rain outlook for the next 24 hours. */
export function rainOutlook(hourly: HourlyPoint[], now: LocalTime = nowMU()): RainOutlook {
  const up = upcoming(hourly, now);
  const next24 = up.slice(0, 24);
  const periods = findRainPeriods(next24);
  const next3h = summariseWindow(up.slice(0, 3), "Next 3 hours");
  const next6h = summariseWindow(up.slice(0, 6), "Next 6 hours");
  const next24h = summariseWindow(next24, "Next 24 hours");
  const resolutionNote = "Based on hourly forecast data, so times are approximate to the hour.";

  if (next24.length === 0) {
    return { headline: "Rain forecast not available", detail: "The forecast data is missing for the coming hours.", confidence: "low", next3h, next6h, next24h, periods, resolutionNote };
  }

  const first = periods[0];
  if (!first) {
    const conf = confidenceForDry(next24h.maxProbability);
    return {
      headline: "No significant rain expected in the next 24 hours",
      detail: `Highest chance of rain in any hour: ${next24h.maxProbability ?? "—"}%.`,
      confidence: conf,
      next3h,
      next6h,
      next24h,
      periods,
      resolutionNote,
    };
  }

  const startsNow = first.start <= hourStart(now);
  const amount = first.totalMm >= 0.1 ? `, about ${first.totalMm} mm in total` : "";
  const intensity = first.peakIntensity === "none" ? "" : ` (${first.peakIntensity})`;
  // Calibrated wording: forecasts here over-call light rain (see the accuracy check), so short or
  // light rain periods are "possible", and only solid ones are "likely".
  const word = solidRain(first) ? "Rain likely" : "Showers possible";
  const headline = startsNow
    ? `${word} now, easing around ${hhmm(first.end)}`
    : `${word} from about ${hhmm(first.start)} until about ${hhmm(first.end)}`;
  return {
    headline,
    detail: `Up to ${first.maxProbability ?? "—"}% chance${intensity}${amount}.${periods.length > 1 ? ` ${periods.length - 1} more rain period${periods.length > 2 ? "s" : ""} later in the next 24 hours.` : ""}`,
    confidence: first.confidence,
    next3h,
    next6h,
    next24h,
    periods,
    resolutionNote,
  };
}
