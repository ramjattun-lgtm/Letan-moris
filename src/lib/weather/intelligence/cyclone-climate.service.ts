// Cyclone climatology from NOAA IBTrACS (storms that came near Mauritius or Rodrigues since 1980).
import { distanceKm } from "../providers/gdacs.provider";

export interface HistStorm {
  sid: string;
  name: string;
  season: number; // IBTrACS season = the year the season ends (e.g. 2024 for 2023–24)
  maxWindKmh: number | null;
  closest: { mauritius: { km: number; time: string } | null; rodrigues: { km: number; time: string } | null };
  points: [number, number, string, number | null][];
}

export const ISLANDS = { mauritius: { lat: -20.25, lon: 57.55 }, rodrigues: { lat: -19.7, lon: 63.42 } } as const;
export type IslandKey = keyof typeof ISLANDS;

/** Month-day position in a cyclone season that starts on 1 July (0 = 1 July). */
export function seasonDay(isoDate: string): number {
  const y = Number(isoDate.slice(0, 4));
  const m = Number(isoDate.slice(5, 7));
  const startY = m >= 7 ? y : y - 1;
  return Math.round((Date.UTC(y, m - 1, Number(isoDate.slice(8, 10))) - Date.UTC(startY, 6, 1)) / 86_400_000);
}

/** % of seasons since the first in the data with a storm centre within `km` of the island within ±7 days of this date. */
export function stormChanceNear(storms: HistStorm[], island: IslandKey, date: string, km = 300) {
  const seasons = new Set(storms.map((s) => s.season));
  if (seasons.size < 10) return null;
  const first = Math.min(...seasons);
  const last = Math.max(...seasons);
  const n = last - first + 1;
  const target = seasonDay(date);
  const hit = new Set<number>();
  for (const s of storms)
    for (const [lat, lon, t] of s.points) {
      const sd = seasonDay(t.slice(0, 10));
      if (Math.abs(sd - target) > 7) continue;
      if (distanceKm(ISLANDS[island], { lat, lon }) <= km) {
        hit.add(s.season);
        break;
      }
    }
  return { pct: Math.round((hit.size / n) * 100), seasons: n, from: first, km };
}

/** Storms passing within `km` of the island: typical number per season, and typically by this date. */
export function nearStormNormals(storms: HistStorm[], island: IslandKey, today: string, km = 500) {
  const seasons = new Map<number, { total: number; byNow: number }>();
  const first = Math.min(...storms.map((s) => s.season));
  const last = Math.max(...storms.map((s) => s.season));
  for (let y = first; y <= last; y++) seasons.set(y, { total: 0, byNow: 0 });
  const target = seasonDay(today);
  for (const s of storms) {
    const c = s.closest[island];
    if (!c || c.km > km) continue;
    const row = seasons.get(s.season);
    if (!row) continue;
    row.total++;
    if (seasonDay(c.time.slice(0, 10)) <= target) row.byNow++;
  }
  const vals = [...seasons.values()];
  if (vals.length < 10) return null;
  const mean = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  return { perSeason: mean(vals.map((v) => v.total)), byNow: mean(vals.map((v) => v.byNow)), seasons: vals.length, from: first, km };
}
