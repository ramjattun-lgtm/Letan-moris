import type { HourlyPoint } from "../types";
import { hourOf } from "@/lib/time";

// Laundry drying-time estimate. A simple, transparent model:
// each hour adds "drying progress" from sunshine, wind and warmth, reduced by humidity;
// rain stops drying. Clothes are "dry" when progress reaches 1. It is a guide for a
// typical cotton load on a line outdoors — thick items take longer.

export function dryingRate(h: HourlyPoint): number | null {
  if (h.humidity === null || h.temperature === null) return null;
  if ((h.precipitation ?? 0) >= 0.2 || (h.rainProbability ?? 0) >= 60) return 0;
  const sun = Math.min(1, Math.max(0, (h.solarRadiation ?? 0) / 800));
  const wind = Math.min(1, Math.max(0, (h.windSpeed ?? 0) / 30));
  const warm = Math.min(1, Math.max(0, (h.temperature - 18) / 14));
  const humid = Math.min(1, Math.max(0.15, 1 - (h.humidity - 45) / 60));
  return (0.08 + 0.2 * sun + 0.09 * wind + 0.05 * warm) * humid;
}

export interface DryingEstimate {
  hangAt: string; // local time
  dryBy: string | null; // local time, or null if not dry before the end
  hours: number | null;
  interruptedByRain: boolean;
}

/** Estimate when a load hung at `startHour` on `date` will be dry (looks until 18:00). */
export function dryingTime(hourly: HourlyPoint[], date: string, startHour: number, endHour = 18): DryingEstimate | null {
  const hs = hourly.filter((h) => h.time.startsWith(date) && hourOf(h.time) >= startHour && hourOf(h.time) < endHour);
  if (!hs.length) return null;
  let progress = 0;
  let rain = false;
  for (const h of hs) {
    const r = dryingRate(h);
    if (r === null) return null;
    if (r === 0) rain = true;
    if (progress + r >= 1) {
      const frac = (1 - progress) / r; // fraction of this hour
      const mins = Math.round(frac * 60);
      const hh = hourOf(h.time);
      const total = hh - startHour + frac;
      return {
        hangAt: hs[0].time,
        dryBy: `${date}T${String(hh + Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`,
        hours: Math.round(total * 2) / 2,
        interruptedByRain: rain,
      };
    }
    progress += r;
  }
  return { hangAt: hs[0].time, dryBy: null, hours: null, interruptedByRain: rain };
}
