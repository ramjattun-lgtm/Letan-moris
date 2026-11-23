import history from "@/data/cyclone-history.json";
import type { Island } from "../types";
import { CLIMATE, climateReady, monthName, normalFor, region } from "./climate.service";

// Weather Memory: "on this day" from data we already hold — cyclone tracks (NOAA IBTrACS),
// 30-year records and normals (ERA5) — plus what the weather was on this date in past years.

interface Storm {
  name: string;
  season: number;
  maxWindKmh: number;
  closest: Record<Island, { km: number; time: string; windKmh: number } | null>;
}
const STORMS = (history as unknown as { storms: Storm[] }).storms;

export const NEAR_KM = 300;
const md = (d: string) => d.slice(5, 10);
const daysApart = (a: string, b: string) => {
  // Within the calendar year, ignoring the year; wraps around New Year.
  const t = (x: string) => Date.UTC(2000, Number(x.slice(0, 2)) - 1, Number(x.slice(3, 5)));
  const diff = Math.abs(t(md(a)) - t(md(b))) / 86400e3;
  return Math.min(diff, 366 - diff);
};
const fmtDate = (d: string) => `${Number(d.slice(8, 10))} ${monthName(Number(d.slice(5, 7)))} ${d.slice(0, 4)}`;

/** Storms that passed within 300 km of the island within 3 days of this date, closest first. */
export function stormsNearDate(date: string, island: Island, windowDays = 3) {
  return STORMS.filter((s) => {
    const c = s.closest[island];
    return c && c.km <= NEAR_KM && daysApart(c.time.slice(0, 10), date) <= windowDays;
  })
    .map((s) => ({ name: s.name, km: s.closest[island]!.km, date: s.closest[island]!.time.slice(0, 10), windKmh: s.closest[island]!.windKmh }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
}

export interface MemoryFact {
  id: string;
  icon: string;
  text: string;
}

/** Up to 4 facts for a region and date. Each fact names where its numbers come from. */
export function memoryFacts(regionKey: string, island: Island, date: string): MemoryFact[] {
  const out: MemoryFact[] = [];
  for (const s of stormsNearDate(date, island)) {
    out.push({
      id: `storm-${s.name}-${s.date}`,
      icon: "🌀",
      text: `Around this date in ${s.date.slice(0, 4)}, cyclone ${s.name} passed about ${s.km} km from ${island === "rodrigues" ? "Rodrigues" : "Mauritius"} (${fmtDate(s.date)}). Source: NOAA IBTrACS.`,
    });
  }
  if (climateReady()) {
    const r = region(regionKey);
    const n = normalFor(regionKey, date);
    if (r && n) {
      out.push({
        id: "normal",
        icon: "📅",
        text: `On a normal ${Number(date.slice(8, 10))} ${monthName(Number(date.slice(5, 7)))} in ${r.label}: ${n.tmax}° / ${n.tmin}°, with rain on about ${n.rainChance}% of days (normal temperature and rain level, ${CLIMATE.period}).`,
      });
      const month = Number(date.slice(5, 7));
      const rec = Object.entries(r.records as Record<string, { value: number; date: string }>).filter(([, v]) => Number(v.date.slice(5, 7)) === month);
      const LABEL: Record<string, (v: number) => string> = {
        hottestDay: (v) => `hottest day (${v}°C)`,
        coolestNight: (v) => `coolest night (${v}°C)`,
        wettestDay: (v) => `wettest day (${v} mm)`,
        strongestGust: (v) => `strongest gust (${Math.round(v)} km/h)`,
      };
      for (const [k, v] of rec.slice(0, 2)) {
        if (!LABEL[k]) continue;
        out.push({ id: `rec-${k}`, icon: "🏆", text: `${r.label}'s ${LABEL[k](v.value)} in ${CLIMATE.period} happened this month, on ${fmtDate(v.date)}.` });
      }
    }
  }
  return out.slice(0, 4);
}

export const _test = { daysApart };
