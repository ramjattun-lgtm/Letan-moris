// Extra insights for the Reservoirs page, all derived from RAIN over the catchments (never reservoir levels).
// Pure functions. `series` = daily rain (mm) by date: history + recent days merged by the caller.
import { addDays } from "@/lib/time";
import { shiftYear } from "./reservoir.service";

export type Daily = Record<string, number | null>;
export interface DayRain {
  (date: string): number | null;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const r0 = (x: number) => Math.round(x);
const sum = (get: DayRain, start: string, end: string): number | null => {
  let t = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const v = get(d);
    if (v === null) return null;
    t += v;
  }
  return t;
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const seasonLabel = (startYear: number) => `${startYear}–${String((startYear + 1) % 100).padStart(2, "0")}`;

/** Past years whose window [start..end] shifted back lies fully from `fromYear` and has data. */
function pastYears(get: DayRain, start: string, end: string, fromYear: number) {
  const out: { back: number; year: number; mm: number }[] = [];
  for (let back = 1; back < 200; back++) {
    const s = shiftYear(start, -back);
    if (Number(s.slice(0, 4)) < fromYear) break;
    const mm = sum(get, s, shiftYear(end, -back));
    if (mm !== null) out.push({ back, year: Number(end.slice(0, 4)) - back, mm });
  }
  return out;
}

// 1 ── How much rain is still needed to catch up --------------------------------------------
export function catchUp(get: DayRain, today: string, fromYear: number, m6: { mm: number | null; normalMm: number | null; pctNormal: number | null }) {
  if (m6.mm === null || m6.normalMm === null || m6.pctNormal === null || m6.pctNormal >= 95) return null;
  const shortMm = r0(m6.normalMm - m6.mm);
  const next4w = median(pastYears(get, today, addDays(today, 27), fromYear).map((p) => p.mm));
  if (!next4w || next4w < 1) return { shortMm, weeks: null, month: MONTHS[Number(addDays(today, 14).slice(5, 7)) - 1] };
  return { shortMm, weeks: Math.round((shortMm / (next4w / 4)) * 10) / 10, month: MONTHS[Number(addDays(today, 14).slice(5, 7)) - 1] };
}

// 2 ── Wet-season progress (season = 1 July to 30 June) --------------------------------------
export const seasonStart = (today: string) => {
  const y = Number(today.slice(0, 4));
  return Number(today.slice(5, 7)) >= 7 ? `${y}-07-01` : `${y - 1}-07-01`;
};

export interface SeasonProgress {
  season: string;
  points: { date: string; label: string; now: number | null; normal: number; driest: number; wettest: number }[];
  soFar: number | null;
  normalSoFar: number | null;
  pctSoFar: number | null;
  normalFull: number;
  stillToComePct: number; // share of a normal season's rain that normally falls after today
  driest: { season: string; mm: number };
  wettest: { season: string; mm: number };
  seasons: number;
}

export function seasonProgress(get: DayRain, today: string, fromYear: number, lastYear: number): SeasonProgress | null {
  const start = seasonStart(today);
  const startY = Number(start.slice(0, 4));
  const len = 365;
  const paths: { y: number; cum: number[] }[] = [];
  for (let y = fromYear; y + 1 <= lastYear && y < startY; y++) {
    const s = `${y}-07-01`;
    const cum: number[] = [];
    let t = 0;
    let ok = true;
    for (let i = 0; i < len; i++) {
      const v = get(addDays(s, i));
      if (v === null) {
        ok = false;
        break;
      }
      t += v;
      cum.push(t);
    }
    if (ok) paths.push({ y, cum });
  }
  if (paths.length < 5) return null;
  const totals = paths.map((p) => p.cum[len - 1]);
  const dIdx = totals.indexOf(Math.min(...totals));
  const wIdx = totals.indexOf(Math.max(...totals));
  const normalAt = (i: number) => median(paths.map((p) => p.cum[i]))!;
  // This season so far, up to yesterday.
  const days = Math.min(len, Math.round((Date.parse(today) - Date.parse(start)) / 86_400_000));
  const now: number[] = [];
  let t = 0;
  let complete = true;
  for (let i = 0; i < days; i++) {
    const v = get(addDays(start, i));
    if (v === null) {
      complete = false;
      break;
    }
    t += v;
    now.push(t);
  }
  const points: SeasonProgress["points"] = [];
  for (let i = 6; i < len; i += 7) {
    const date = addDays(start, i);
    points.push({
      date,
      label: `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3)}`,
      now: i < now.length ? r0(now[i]) : null,
      normal: r0(normalAt(i)),
      driest: r0(paths[dIdx].cum[i]),
      wettest: r0(paths[wIdx].cum[i]),
    });
  }
  const normalFull = normalAt(len - 1);
  const soFar = complete && days > 0 ? now[days - 1] : null;
  const normalSoFar = days > 0 ? normalAt(days - 1) : 0;
  return {
    season: seasonLabel(startY),
    points,
    soFar: soFar === null ? null : r0(soFar),
    normalSoFar: r0(normalSoFar),
    pctSoFar: soFar !== null && normalSoFar > 1 ? Math.round((soFar / normalSoFar) * 100) : null,
    normalFull: r0(normalFull),
    stillToComePct: Math.round((1 - normalSoFar / normalFull) * 100),
    driest: { season: seasonLabel(paths[dIdx].y), mm: r0(totals[dIdx]) },
    wettest: { season: seasonLabel(paths[wIdx].y), mm: r0(totals[wIdx]) },
    seasons: paths.length,
  };
}

// 3 ── What happened next in similar years ----------------------------------------------------
export interface Analogues {
  n: number;
  normalOrWetter: number;
  medianNextPct: number | null;
  years: { year: number; pastPct: number; nextPct: number }[];
}

export function analogues(get: DayRain, today: string, fromYear: number, currentPct: number | null, k = 10): Analogues | null {
  if (currentPct === null) return null;
  const pStart = addDays(today, -182);
  const pEnd = addDays(today, -1);
  const nEnd = addDays(today, 89);
  const past = pastYears(get, pStart, pEnd, fromYear);
  const next = new Map(pastYears(get, today, nEnd, fromYear).map((p) => [p.back, p.mm]));
  const pastNormal = median(past.map((p) => p.mm));
  const nextNormal = median([...next.values()]);
  if (!pastNormal || !nextNormal) return null;
  const cands = past
    .filter((p) => next.has(p.back))
    .map((p) => ({ year: Number(pEnd.slice(0, 4)) - p.back, pastPct: Math.round((p.mm / pastNormal) * 100), nextPct: Math.round((next.get(p.back)! / nextNormal) * 100) }));
  if (cands.length < 15) return null;
  const pick = cands.sort((a, b) => Math.abs(a.pastPct - currentPct) - Math.abs(b.pastPct - currentPct)).slice(0, k);
  return {
    n: pick.length,
    normalOrWetter: pick.filter((p) => p.nextPct >= 85).length,
    medianNextPct: median(pick.map((p) => p.nextPct)),
    years: pick.sort((a, b) => b.year - a.year),
  };
}

// 4 ── Soaking-rain days and dry spells -------------------------------------------------------
export const SOAKING_MM = 20;

function spells(get: DayRain, start: string, end: string) {
  let soaking = 0;
  let longestDry = 0;
  let run = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const v = get(d);
    if (v === null) return null;
    if (v >= SOAKING_MM) soaking++;
    if (v < 1) {
      run++;
      longestDry = Math.max(longestDry, run);
    } else run = 0;
  }
  return { soaking, longestDry };
}

export function rainDays(get: DayRain, today: string, fromYear: number) {
  const start = addDays(today, -182);
  const end = addDays(today, -1);
  const now = spells(get, start, end);
  if (!now) return null;
  const past: { soaking: number; longestDry: number }[] = [];
  for (let back = 1; back < 200; back++) {
    const s = shiftYear(start, -back);
    if (Number(s.slice(0, 4)) < fromYear) break;
    const x = spells(get, s, shiftYear(end, -back));
    if (x) past.push(x);
  }
  let since: number | null = null;
  for (let i = 1; i <= 365; i++) {
    const v = get(addDays(today, -i));
    if (v === null) break;
    if (v >= SOAKING_MM) {
      since = i;
      break;
    }
  }
  return {
    soakingDays: now.soaking,
    normalSoakingDays: past.length >= 5 ? median(past.map((p) => p.soaking)) : null,
    daysSinceSoaking: since, // null = none in the data we have (at least `searchedDays`)
    longestDrySpell: now.longestDry,
    normalLongestDrySpell: past.length >= 5 ? median(past.map((p) => p.longestDry)) : null,
  };
}

// 5 ── Rain minus evaporation -----------------------------------------------------------------
export function netWater(rain: DayRain, et0: DayRain, today: string, fromYear: number) {
  const net: DayRain = (d) => {
    const r = rain(d);
    const e = et0(d);
    return r === null || e === null ? null : r - e;
  };
  const one = (days: number) => {
    const s = addDays(today, -days);
    const e = addDays(today, -1);
    const mm = sum(net, s, e);
    const rainMm = sum(rain, s, e);
    const evap = sum(et0, s, e);
    const normal = median(pastYears(net, s, e, fromYear).map((p) => p.mm));
    return mm === null ? null : { net: r0(mm), rain: rainMm === null ? null : r0(rainMm), evaporation: evap === null ? null : r0(evap), normalNet: normal === null ? null : r0(normal) };
  };
  return { m1: one(30), m6: one(182) };
}

// 7 ── Long-term trend of summer rain (November–April) ----------------------------------------
export function summerTrend(get: DayRain, fromYear: number, lastYear: number) {
  const seasons: { y: number; mm: number }[] = [];
  for (let y = fromYear; y + 1 <= lastYear; y++) {
    const mm = sum(get, `${y}-11-01`, `${y + 1}-04-30`);
    if (mm !== null) seasons.push({ y, mm });
  }
  if (seasons.length < 20) return null;
  const mean = seasons.reduce((a, s) => a + s.mm, 0) / seasons.length;
  const mx = seasons.reduce((a, s) => a + s.y, 0) / seasons.length;
  let num = 0;
  let den = 0;
  for (const s of seasons) {
    num += (s.y - mx) * (s.mm - mean);
    den += (s.y - mx) ** 2;
  }
  const slopePctPerDecade = Math.round(((num / den) * 10 * 100) / mean) || 0;
  const decades = new Map<number, number[]>();
  for (const s of seasons) {
    const dec = Math.floor(s.y / 10) * 10;
    decades.set(dec, [...(decades.get(dec) ?? []), s.mm]);
  }
  return {
    from: seasonLabel(seasons[0].y),
    to: seasonLabel(seasons[seasons.length - 1].y),
    meanMm: r0(mean),
    slopePctPerDecade,
    decades: [...decades.entries()]
      .filter(([, v]) => v.length >= 5)
      .map(([dec, v]) => ({ decade: `${dec}s`, pctOfMean: Math.round((v.reduce((a, b) => a + b, 0) / v.length / mean) * 100) })),
  };
}

// 8 ── Share of summer rain that falls while a tropical storm is nearby -----------------------
export interface StormTrack {
  name: string;
  points: [number, number, string, number | null][]; // lat, lon, UTC "YYYY-MM-DDTHH:mm", wind
}

const distKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(t(b.lat - a.lat) / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Mauritius-local dates on which any storm centre was within `km` of the island. */
export function stormDays(storms: StormTrack[], island: { lat: number; lon: number }, km = 500): Set<string> {
  const days = new Set<string>();
  for (const s of storms)
    for (const [lat, lon, t] of s.points) {
      if (distKm(island, { lat, lon }) > km) continue;
      const local = new Date(Date.parse(`${t}:00Z`) + 4 * 3600_000).toISOString().slice(0, 10);
      days.add(local);
    }
  return days;
}

export function stormShare(get: DayRain, days: Set<string>, fromYear: number, lastYear: number, today: string) {
  const per: { y: number; share: number; total: number; stormy: boolean }[] = [];
  for (let y = fromYear; y + 1 <= lastYear; y++) {
    let total = 0;
    let storm = 0;
    let ok = true;
    for (let d = `${y}-11-01`; d <= `${y + 1}-04-30`; d = addDays(d, 1)) {
      const v = get(d);
      if (v === null) {
        ok = false;
        break;
      }
      total += v;
      if (days.has(d)) storm += v;
    }
    if (ok && total > 0) per.push({ y, share: storm / total, total, stormy: storm > 0 });
  }
  if (per.length < 15) return null;
  const normal = median(per.map((p) => p.total))!;
  const calm = per.filter((p) => !p.stormy);
  // This summer so far
  const y0 = Number(today.slice(5, 7)) >= 7 ? Number(today.slice(0, 4)) : Number(today.slice(0, 4)) - 1;
  let tot = 0;
  let st = 0;
  for (let d = `${y0}-11-01`; d < today && d <= `${y0 + 1}-04-30`; d = addDays(d, 1)) {
    const v = get(d);
    if (v === null) break;
    tot += v;
    if (days.has(d)) st += v;
  }
  return {
    from: seasonLabel(per[0].y),
    seasons: per.length,
    typicalSharePct: Math.round(median(per.map((p) => p.share))! * 100),
    calmSeasons: calm.length,
    calmMedianPct: calm.length >= 3 ? Math.round((median(calm.map((p) => p.total))! / normal) * 100) : null,
    thisSummerSharePct: tot > 20 ? Math.round((st / tot) * 100) : null,
  };
}
