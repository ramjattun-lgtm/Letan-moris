// Rain over the reservoir catchments: recent totals and outlooks compared with past years.
// Pure functions — no network. The API route supplies the data.
// This is about RAIN, not reservoir levels: levels also depend on abstraction, leaks and feeder canals.
import { addDays } from "@/lib/time";

/** Daily rain history: rain[id][year] = tenths of mm per day (index 0 = 1 January). */
export interface RainHistory {
  builtAt: string | null;
  start: number;
  end: number | null;
  rain: Record<string, Record<string, (number | null)[]>>;
}

export type Trend = "much-drier" | "drier" | "normal" | "wetter" | "much-wetter";

export interface Comparison {
  mm: number | null; // null = not enough data
  normalMm: number | null; // median of the same window in past years
  pctNormal: number | null;
  years: number; // how many past years compared
  fromYear: number | null;
  drierYears: number | null; // past years that were drier
  rank: string | null; // e.g. "Driest since 1999"
  trend: Trend | null;
}

const dayOfYear = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(y, 0, 1)) / 86_400_000);
};
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Same calendar date in another year (29 Feb → 28 Feb in non-leap years). */
export function shiftYear(date: string, years: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const ny = y + years;
  const dd = m === 2 && d === 29 && !isLeap(ny) ? 28 : d;
  return `${ny}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Sum of rain (mm) from start to end inclusive for one catchment, or null if any day is missing. */
export function historySum(h: RainHistory, id: string, start: string, end: string): number | null {
  const years = h.rain[id];
  if (!years) return null;
  let total = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const v = years[d.slice(0, 4)]?.[dayOfYear(d)];
    if (v === null || v === undefined) return null;
    total += v;
  }
  return total / 10;
}

/** The same window in each past year from `fromYear`, keyed by the year the window ends in. */
export function pastWindows(h: RainHistory, id: string, start: string, end: string, fromYear: number): { year: number; mm: number }[] {
  const endYear = Number(end.slice(0, 4));
  const out: { year: number; mm: number }[] = [];
  for (let back = 1; endYear - back >= fromYear; back++) {
    const s = shiftYear(start, -back);
    if (Number(s.slice(0, 4)) < fromYear) break; // window must lie fully after the reservoir existed
    const mm = historySum(h, id, s, shiftYear(end, -back));
    if (mm !== null) out.push({ year: endYear - back, mm });
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const r1 = (x: number) => Math.round(x * 10) / 10;

export function trendOf(pct: number | null): Trend | null {
  if (pct === null) return null;
  if (pct < 60) return "much-drier";
  if (pct < 85) return "drier";
  if (pct <= 115) return "normal";
  if (pct <= 150) return "wetter";
  return "much-wetter";
}

export const TREND_TEXT: Record<Trend, string> = {
  "much-drier": "Well below normal rain level",
  drier: "Below normal rain level",
  normal: "Near normal rain level",
  wetter: "Above normal rain level",
  "much-wetter": "Well above normal rain level",
};

/** Compare a total with the same window in past years. Needs at least 5 past years. */
export function compare(mm: number, past: { year: number; mm: number }[]): Comparison {
  const base: Comparison = { mm: r1(mm), normalMm: null, pctNormal: null, years: past.length, fromYear: null, drierYears: null, rank: null, trend: null };
  if (past.length < 5) return base;
  const normal = median(past.map((p) => p.mm));
  const pct = normal > 0.5 ? Math.round((mm / normal) * 100) : null;
  const fromYear = Math.min(...past.map((p) => p.year));
  const drier = past.filter((p) => p.mm < mm).length;
  // "Driest since YEAR": the most recent past year that was as dry or drier.
  let rank: string | null = null;
  const sorted = [...past].sort((a, b) => b.year - a.year);
  if (drier === 0) rank = `Driest since records began here (${fromYear})`;
  else if (drier === past.length) rank = `Wettest since records began here (${fromYear})`;
  else if (pct !== null && pct < 85) {
    const y = sorted.find((p) => p.mm <= mm)?.year;
    if (y !== undefined && sorted[0].year - y >= 4) rank = `Driest since ${y}`;
  } else if (pct !== null && pct > 115) {
    const y = sorted.find((p) => p.mm >= mm)?.year;
    if (y !== undefined && sorted[0].year - y >= 4) rank = `Wettest since ${y}`;
  }
  return { ...base, normalMm: r1(normal), pctNormal: pct, fromYear, drierYears: drier, rank, trend: trendOf(pct) };
}

export const WINDOWS = [
  { key: "d7", label: "7 days", days: 7 },
  { key: "m1", label: "1 month", days: 30 },
  { key: "m6", label: "6 months", days: 182 },
] as const;

/** Past window ending yesterday (today is not complete). */
export const pastRange = (today: string, days: number) => ({ start: addDays(today, -days), end: addDays(today, -1) });
/** Future window starting today. */
export const nextRange = (today: string, days: number) => ({ start: today, end: addDays(today, days - 1) });

/** Merge reanalysis (preferred) with forecast-model values for recent days the reanalysis has not reached yet. */
export function mergeDaily(primary: Record<string, number | null>, fallback: Record<string, number | null>, start: string, end: string) {
  let mm = 0;
  let filled = 0;
  let missing = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const a = primary[d];
    const b = fallback[d];
    if (a !== null && a !== undefined) mm += a;
    else if (b !== null && b !== undefined) {
      mm += b;
      filled++;
    } else missing++;
  }
  return { mm: r1(mm), filled, missing };
}

// ---- Long-range outlook (ECMWF EC46 weekly, SEAS5 monthly via Open-Meteo Seasonal API) ----
// Both give the ensemble-mean rain and its anomaly against the MODEL's own climate. We use
// mean / (mean − anomaly) = % of the model's normal, which cancels the model's own bias and units.

export interface OutlookPeriod {
  label: string;
  pctNormal: number | null;
  wetterChance: number | null; // % of ensemble members wetter than normal (weekly only)
  trend: Trend | null;
}

const pctOf = (mean: number, anomaly: number) => {
  const normal = mean - anomaly;
  return normal > 0.05 ? Math.round((mean / normal) * 100) : null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Next ~4 weeks from the weekly outlook. */
export function weeklyOutlook(raw: unknown, today: string): OutlookPeriod | null {
  const w = (raw as { weekly?: Record<string, (number | null)[] | string[]> })?.weekly;
  if (!w) return null;
  const time = (w.time ?? []) as string[];
  const mean = (w.precipitation_mean ?? []) as (number | null)[];
  const anom = (w.precipitation_anomaly ?? []) as (number | null)[];
  const gt0 = (w.precipitation_anomaly_gt0 ?? []) as (number | null)[];
  let sm = 0;
  let sn = 0;
  const probs: number[] = [];
  let n = 0;
  for (let i = 0; i < time.length && n < 4; i++) {
    if (addDays(time[i].slice(0, 10), 6) < today) continue; // week already over
    const m = mean[i];
    const a = anom[i];
    if (m === null || a === null || m === undefined || a === undefined) continue;
    sm += m;
    sn += m - a;
    const p = gt0[i];
    if (p !== null && p !== undefined) probs.push(p <= 1 ? p * 100 : p);
    n++;
  }
  if (n < 3) return null;
  const pct = sn > 0.05 ? Math.round((sm / sn) * 100) : null;
  const wetterChance = probs.length ? Math.round(probs.reduce((x, y) => x + y, 0) / probs.length) : null;
  return { label: "Next 4 weeks", pctNormal: pct, wetterChance, trend: trendOf(pct) };
}

/** Next 6 calendar months (after the current one) from the monthly outlook, plus their total. */
export function monthlyOutlook(raw: unknown, today: string): { months: OutlookPeriod[]; total: OutlookPeriod } | null {
  const mo = (raw as { monthly?: Record<string, (number | null)[] | string[]> })?.monthly;
  if (!mo) return null;
  const time = (mo.time ?? []) as string[];
  const mean = (mo.precipitation_mean ?? []) as (number | null)[];
  const anom = (mo.precipitation_anomaly ?? []) as (number | null)[];
  const thisMonth = today.slice(0, 7);
  const months: OutlookPeriod[] = [];
  let sm = 0;
  let sn = 0;
  for (let i = 0; i < time.length && months.length < 6; i++) {
    if (time[i].slice(0, 7) <= thisMonth) continue;
    const m = mean[i];
    const a = anom[i];
    if (m === null || a === null || m === undefined || a === undefined) continue;
    const pct = pctOf(m, a);
    months.push({ label: MONTHS[Number(time[i].slice(5, 7)) - 1], pctNormal: pct, wetterChance: null, trend: trendOf(pct) });
    sm += m;
    sn += m - a;
  }
  if (months.length < 3) return null;
  const pct = sn > 0.05 ? Math.round((sm / sn) * 100) : null;
  return { months, total: { label: `${months[0].label}–${months[months.length - 1].label}`, pctNormal: pct, wetterChance: null, trend: trendOf(pct) } };
}

// ---- Full report ----

export interface CatchmentReport {
  id: string;
  compareFrom: number;
  past: Record<(typeof WINDOWS)[number]["key"], Comparison>;
  next7: Comparison | null;
}

type Daily = Record<string, number | null>;

/** Average of several catchments' history, as a pseudo-catchment "all". */
export function averagedHistory(h: RainHistory, ids: string[]): RainHistory {
  const all: Record<string, (number | null)[]> = {};
  const years = new Set(ids.flatMap((id) => Object.keys(h.rain[id] ?? {})));
  for (const y of years) {
    const arrs = ids.map((id) => h.rain[id]?.[y]).filter((a): a is (number | null)[] => !!a);
    if (arrs.length !== ids.length) continue;
    const len = Math.min(...arrs.map((a) => a.length));
    all[y] = Array.from({ length: len }, (_, i) => {
      const vs = arrs.map((a) => a[i]);
      return vs.some((v) => v === null || v === undefined) ? null : (vs as number[]).reduce((a, b) => a + b, 0) / vs.length;
    });
  }
  return { ...h, rain: { ...h.rain, all } };
}

export function catchmentReport(
  h: RainHistory,
  id: string,
  fromYear: number,
  reanalysis: Daily,
  model: Daily,
  today: string,
): CatchmentReport & { filledDays: number } {
  let filledDays = 0;
  const past = {} as CatchmentReport["past"];
  for (const w of WINDOWS) {
    const { start, end } = pastRange(today, w.days);
    const m = mergeDaily(reanalysis, model, start, end);
    filledDays = Math.max(filledDays, m.filled);
    past[w.key] = m.missing > Math.max(1, w.days * 0.05) ? { ...compare(0, []), mm: null } : compare(m.mm, pastWindows(h, id, start, end, fromYear));
  }
  const n = nextRange(today, 7);
  const nx = mergeDaily({}, model, n.start, n.end);
  const next7 = nx.missing > 1 ? null : compare(nx.mm, pastWindows(h, id, n.start, n.end, fromYear));
  return { id, compareFrom: fromYear, past, next7, filledDays };
}

// ---- Where did the rain fall? Share of Mauritius's rain that fell on the reservoir catchments ----

/** Land area of the island of Mauritius, km². */
export const MAURITIUS_AREA_KM2 = 1865;

export interface RainShare {
  catchmentMm3: number; // million m³ of rain on the 7 catchments
  islandMm3: number; // million m³ of rain on the whole island
  pct: number; // share that fell on the catchments
  areaPct: number; // share of the island's land the catchments cover
}

/** 1 mm of rain over 1 km² = 1,000 m³. Volumes in million m³. */
export function rainShare(catchments: { mm: number; km2: number }[], islandMm: number): RainShare | null {
  const onCatch = catchments.reduce((a, c) => a + (c.mm * c.km2) / 1000, 0);
  const island = (islandMm * MAURITIUS_AREA_KM2) / 1000;
  if (island <= 0.01) return null;
  const area = catchments.reduce((a, c) => a + c.km2, 0);
  return {
    catchmentMm3: Math.round(onCatch * 10) / 10,
    islandMm3: Math.round(island * 10) / 10,
    pct: Math.round(Math.min(100, (onCatch / island) * 100) * 10) / 10,
    areaPct: Math.round((area / MAURITIUS_AREA_KM2) * 1000) / 10,
  };
}
