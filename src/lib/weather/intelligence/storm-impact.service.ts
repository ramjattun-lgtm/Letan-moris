import type { HourlyPoint, Maybe } from "../types";
import { addHours, hourStart, nowMU } from "@/lib/time";

// "What it means for my place": turns the model forecast for one locality into a storm summary.
// Uses only the locality's own hourly forecast. Global models can underestimate cyclone winds,
// so the page always says so and points to MMS.

export const STRONG_GUST_KMH = 60;
export const NEAR_KM = 1500;

export interface StormImpact {
  peakGust: Maybe<{ kmh: number; time: string }>;
  totalRainMm: Maybe<number>;
  windowLabel: string;
  firstStrongGust: Maybe<string>; // local time
  prepareBy: Maybe<string>; // local time, 12 h before first strong gusts
}

/** `untilLocal` = end of the storm window (e.g. 24 h after closest approach). */
export function stormImpact(hourly: HourlyPoint[], untilLocal?: string, now: string = nowMU()): StormImpact {
  const start = hourStart(now);
  const end = untilLocal ?? addHours(start, 120);
  const hs = hourly.filter((h) => h.time >= start && h.time <= end);
  let peak: StormImpact["peakGust"] = null;
  let first: string | null = null;
  let rain = 0;
  let rainKnown = false;
  for (const h of hs) {
    if (h.windGusts !== null && (!peak || h.windGusts > peak.kmh)) peak = { kmh: Math.round(h.windGusts), time: h.time };
    if (!first && h.windGusts !== null && h.windGusts >= STRONG_GUST_KMH) first = h.time;
    if (h.precipitation !== null) {
      rain += h.precipitation;
      rainKnown = true;
    }
  }
  const prepareBy = first ? addHours(first, -12) : null;
  return {
    peakGust: peak,
    totalRainMm: rainKnown ? Math.round(rain) : null,
    windowLabel: untilLocal ? "until about 24 hours after closest approach" : "over the next 5 days",
    firstStrongGust: first,
    prepareBy: prepareBy && prepareBy > start ? prepareBy : first ? start : null,
  };
}

/** Convert an ISO UTC time to Mauritius local "YYYY-MM-DDTHH:mm". */
export function utcToMU(iso: string): string {
  return nowMU(new Date(iso));
}
