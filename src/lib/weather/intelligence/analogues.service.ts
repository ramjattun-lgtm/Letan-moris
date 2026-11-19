import history from "@/data/cyclone-history.json";
import { distanceKm, type TrackPoint } from "../providers/gdacs.provider";

// "Storms on a similar path": compares the current storm with past storms from NOAA IBTrACS.
// Similar position + similar direction of travel + similar strength. Context only — the
// official forecast track always comes first, and past storms do not predict local impacts.

export interface HistStorm {
  sid: string;
  name: string;
  season: number;
  maxWindKmh: number | null;
  closest: {
    mauritius: { km: number; time: string; windKmh: number | null };
    rodrigues: { km: number; time: string; windKmh: number | null };
  };
  points: [number, number, string, number | null][];
}

export interface Analogue {
  sid: string;
  name: string;
  season: number;
  score: number;
  matchKm: number;
  headingDiff: number;
  closest: HistStorm["closest"];
  maxWindKmh: number | null;
  /** Path from the matching point onwards (for the map). */
  path: [number, number][];
}

export const HISTORY = history as { source: string; sourceUrl: string; windNote: string; builtAt: string | null; storms: HistStorm[] };

const toR = (d: number) => (d * Math.PI) / 180;
/** Direction of travel in degrees (0 = north, 90 = east). */
export function heading(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const y = Math.sin(toR(b.lon - a.lon)) * Math.cos(toR(b.lat));
  const x = Math.cos(toR(a.lat)) * Math.sin(toR(b.lat)) - Math.sin(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.cos(toR(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

export const MAX_MATCH_KM = 350;
export const MAX_HEADING_DIFF = 50;

/**
 * Find past storms that passed near the current position, moving in a similar direction.
 * `track` = current storm's observed positions (oldest first). Needs at least two.
 */
export function findAnalogues(track: TrackPoint[], windKmh: number | null, storms: HistStorm[] = HISTORY.storms, max = 3): Analogue[] {
  const obs = track.filter((p) => p.observed);
  if (obs.length < 2) return [];
  const now = obs[obs.length - 1];
  const prev = obs[obs.length - 2];
  const hdg = heading(prev, now);
  const out: Analogue[] = [];
  for (const s of storms) {
    let best: { i: number; km: number; hd: number } | null = null;
    for (let i = 0; i < s.points.length - 1; i++) {
      const p = { lat: s.points[i][0], lon: s.points[i][1] };
      const km = distanceKm(now, p);
      if (km > MAX_MATCH_KM) continue;
      const hd = angleDiff(hdg, heading(p, { lat: s.points[i + 1][0], lon: s.points[i + 1][1] }));
      if (hd > MAX_HEADING_DIFF) continue;
      if (!best || km / MAX_MATCH_KM + hd / MAX_HEADING_DIFF < best.km / MAX_MATCH_KM + best.hd / MAX_HEADING_DIFF) best = { i, km, hd };
    }
    if (!best) continue;
    const histWind = s.points[best.i][3];
    const windTerm = windKmh !== null && histWind !== null ? Math.min(1, Math.abs(windKmh - histWind) / 100) : 0.5;
    out.push({
      sid: s.sid,
      name: s.name,
      season: s.season,
      score: Math.round((best.km / MAX_MATCH_KM + best.hd / MAX_HEADING_DIFF + windTerm) * 100) / 100,
      matchKm: best.km,
      headingDiff: Math.round(best.hd),
      closest: s.closest,
      maxWindKmh: s.maxWindKmh,
      path: s.points.slice(best.i).map((p) => [p[1], p[0]]),
    });
  }
  return out.sort((a, b) => a.score - b.score).slice(0, max);
}

/** Season label like "2021–22" (South Indian seasons span two calendar years; IBTrACS uses the later year). */
export const seasonLabel = (season: number) => `${season - 1}–${String(season).slice(2)}`;
