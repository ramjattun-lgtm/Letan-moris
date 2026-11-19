import type { HourlyPoint, MarineHour, Maybe } from "../types";
import { hourOf } from "@/lib/time";
import { compass } from "../weather-codes";

// Beach forecast: an hourly "beach score" (0–10) from rain, wind relative to the beach, sky,
// warmth and open-sea waves. WEATHER SUITABILITY ONLY — never a swimming-safety assessment.

/** Direction each beach faces (towards the sea), degrees. Approximate, from the coastline. */
export const BEACH_FACING: Record<string, number> = {
  "grand-baie": 330,
  pereybere: 315,
  "trou-aux-biches": 290,
  "mont-choisy": 285,
  "flic-en-flac": 270,
  tamarin: 270,
  "le-morne": 240,
  "blue-bay": 135,
  "belle-mare": 90,
  "pointe-coton": 90,
  "trou-dargent": 110,
  mourouk: 180,
  graviers: 140,
};

export type WindSide = "onshore" | "offshore" | "cross-shore";

const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** Wind "from" direction vs the way the beach faces. Onshore = blowing from the sea onto the beach. */
export function windSide(windFromDeg: Maybe<number>, facing: number): WindSide | null {
  if (windFromDeg === null) return null;
  const d = angleDiff(windFromDeg, facing);
  if (d <= 60) return "onshore";
  if (d >= 120) return "offshore";
  return "cross-shore";
}

export interface BeachHour {
  time: string;
  score: number | null; // 0–10
  temp: Maybe<number>;
  feelsLike: Maybe<number>;
  rainProb: Maybe<number>;
  rainMm: Maybe<number>;
  wind: Maybe<number>;
  windDir: string;
  side: WindSide | null;
  gust: Maybe<number>;
  uv: Maybe<number>;
  cloud: Maybe<number>;
  weatherCode: Maybe<number>;
  waveHeight: Maybe<number>;
  wavePeriod: Maybe<number>;
}

export function scoreHour(h: HourlyPoint, facing: number, wave: MarineHour | undefined): number | null {
  if (h.rainProbability === null || h.windSpeed === null || h.temperature === null) return null;
  let s = 10;
  s -= h.rainProbability * 0.05; // 60% → −3
  if ((h.precipitation ?? 0) >= 0.5) s -= 2;
  const side = windSide(h.windDirection, facing);
  if (h.windSpeed >= 35) s -= 3;
  else if (h.windSpeed >= 25) s -= side === "onshore" ? 2 : 1;
  else if (h.windSpeed >= 18 && side === "onshore") s -= 0.5;
  if ((h.windGusts ?? 0) >= 45) s -= 1.5;
  if ((h.cloudCover ?? 0) >= 85) s -= 1.5;
  else if ((h.cloudCover ?? 0) >= 60) s -= 0.5;
  const feels = h.feelsLike ?? h.temperature;
  if (feels < 23) s -= 1.5;
  else if (feels < 25) s -= 0.5;
  if (feels > 35) s -= 1;
  if (wave?.waveHeight !== null && wave?.waveHeight !== undefined && wave.waveHeight >= 2.5) s -= 1;
  return Math.max(0, Math.min(10, Math.round(s * 10) / 10));
}

export function beachHours(hourly: HourlyPoint[], marine: MarineHour[], facing: number, date: string, from = 6, to = 19): BeachHour[] {
  const byTime = new Map(marine.map((m) => [m.time, m]));
  return hourly
    .filter((h) => h.time.startsWith(date) && hourOf(h.time) >= from && hourOf(h.time) < to)
    .map((h) => {
      const w = byTime.get(h.time);
      return {
        time: h.time,
        score: scoreHour(h, facing, w),
        temp: h.temperature,
        feelsLike: h.feelsLike,
        rainProb: h.rainProbability,
        rainMm: h.precipitation,
        wind: h.windSpeed,
        windDir: compass(h.windDirection),
        side: windSide(h.windDirection, facing),
        gust: h.windGusts,
        uv: h.uvIndex,
        cloud: h.cloudCover,
        weatherCode: h.weatherCode,
        waveHeight: w?.waveHeight ?? null,
        wavePeriod: w?.wavePeriod ?? null,
      };
    });
}

export type BeachRating = "excellent" | "good" | "fair" | "poor";
export function rating(score: number | null): BeachRating | null {
  if (score === null) return null;
  if (score >= 8) return "excellent";
  if (score >= 6) return "good";
  if (score >= 4) return "fair";
  return "poor";
}
export const RATING_LABEL: Record<BeachRating, string> = { excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor" };

export const BLOCKS = [
  { key: "morning", label: "Morning", from: 7, to: 11 },
  { key: "midday", label: "Midday", from: 11, to: 14 },
  { key: "afternoon", label: "Afternoon", from: 14, to: 18 },
] as const;

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
};
const max = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.max(...v) : null;
};

export function blockSummary(hours: BeachHour[]) {
  return BLOCKS.map((b) => {
    const hs = hours.filter((h) => hourOf(h.time) >= b.from && hourOf(h.time) < b.to);
    return {
      ...b,
      score: avg(hs.map((h) => h.score)),
      temp: max(hs.map((h) => h.temp)),
      rainProb: max(hs.map((h) => h.rainProb)),
      wind: avg(hs.map((h) => h.wind)),
      uv: max(hs.map((h) => h.uv)),
      side: hs[Math.floor(hs.length / 2)]?.side ?? null,
      windDir: hs[Math.floor(hs.length / 2)]?.windDir ?? "—",
    };
  });
}

/** Best run of 2+ consecutive hours with score ≥ 6. */
export function bestWindow(hours: BeachHour[]): { from: number; to: number; score: number } | null {
  let best: { from: number; to: number; score: number } | null = null;
  let i = 0;
  while (i < hours.length) {
    if ((hours[i].score ?? 0) >= 6) {
      let j = i;
      while (j + 1 < hours.length && (hours[j + 1].score ?? 0) >= 6) j++;
      const run = hours.slice(i, j + 1);
      const sc = avg(run.map((h) => h.score)) ?? 0;
      if (run.length >= 2 && (!best || run.length * sc > (best.to - best.from) * best.score)) best = { from: hourOf(run[0].time), to: hourOf(run[run.length - 1].time) + 1, score: sc };
      i = j + 1;
    } else i++;
  }
  return best;
}

/** One-line explanation of the day at a beach. */
export function beachReason(hours: BeachHour[]): string {
  const mid = hours.filter((h) => hourOf(h.time) >= 10 && hourOf(h.time) < 16);
  const sides = mid.map((h) => h.side);
  const onshore = sides.filter((s) => s === "onshore").length;
  const offshore = sides.filter((s) => s === "offshore").length;
  const w = avg(mid.map((h) => h.wind));
  const r = max(mid.map((h) => h.rainProb));
  const parts: string[] = [];
  if (w !== null) {
    if (offshore > mid.length / 2) parts.push(`sheltered from the wind (blowing off the land, about ${Math.round(w)} km/h)`);
    else if (onshore > mid.length / 2) parts.push(w >= 20 ? `onshore wind about ${Math.round(w)} km/h — choppier water, cooler breeze` : `light onshore breeze (about ${Math.round(w)} km/h)`);
    else parts.push(`cross-shore wind about ${Math.round(w)} km/h`);
  }
  if (r !== null) parts.push(r >= 50 ? `showers likely (up to ${r}%)` : r >= 25 ? `a passing shower possible (${r}%)` : "mostly dry");
  const uv = max(mid.map((h) => h.uv));
  if (uv !== null && uv >= 8) parts.push(`very high UV (${Math.round(uv)})`);
  return parts.join(" · ");
}
