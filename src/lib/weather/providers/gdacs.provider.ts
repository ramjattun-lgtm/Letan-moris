import type { Feature } from "geojson";
// GDACS (Global Disaster Alert and Coordination System — UN OCHA / European Commission JRC).
// Free public API, no key. Terms: acknowledge "Global Disaster Alert and Coordination System, GDACS".
// GDACS compiles advisories from forecasting agencies. It is NOT an MMS warning and is labelled as such.

export interface ActiveSystem {
  id: string;
  name: string;
  alertLevel: string | null; // GDACS alert colour: Green / Orange / Red (impact estimate, not an MMS class)
  description: string | null;
  lat: number;
  lon: number;
  maxWindKmh: number | null;
  fromDate: string | null;
  toDate: string | null;
  reportUrl: string | null;
  /** GDACS geometry (track, cone, wind bands) for the latest episode. */
  geometryUrl: string | null;
  distanceKm: { mauritius: number; rodrigues: number };
  bearingFrom: { mauritius: string; rodrigues: string };
  track?: StormTrack | null;
  analogues?: import("../intelligence/analogues.service").Analogue[];
  closest?: { mauritius: ClosestApproach | null; rodrigues: ClosestApproach | null };
}

export interface CycloneStatus {
  source: { text: string; url: string };
  checkedAt: string;
  ok: boolean;
  systems: ActiveSystem[];
  message?: string;
}

const API = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";
export const MAURITIUS = { lat: -20.25, lon: 57.55 };
export const RODRIGUES = { lat: -19.72, lon: 63.43 };

/** South-West Indian Ocean box (RSMC La Réunion area of responsibility, approximately). */
export function inSouthWestIndianOcean(lat: number, lon: number) {
  return lat <= 0 && lat >= -40 && lon >= 30 && lon <= 90;
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
/** Compass direction of point b as seen from point a. */
export function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toR = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toR(b.lon - a.lon)) * Math.cos(toR(b.lat));
  const x = Math.cos(toR(a.lat)) * Math.sin(toR(b.lat)) - Math.sin(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.cos(toR(b.lon - a.lon));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return DIRS[Math.round(deg / 22.5) % 16];
}

type Raw = Record<string, unknown>;

export function parseGdacs(raw: unknown, now = new Date()): ActiveSystem[] {
  const features = (raw && typeof raw === "object" && Array.isArray((raw as Raw).features) ? (raw as Raw).features : []) as Raw[];
  const out: ActiveSystem[] = [];
  for (const f of features) {
    const p = (f.properties ?? {}) as Raw;
    const g = (f.geometry ?? {}) as Raw;
    if (p.eventtype && p.eventtype !== "TC") continue;
    const coords = Array.isArray(g.coordinates) ? (g.coordinates as unknown[]) : [];
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inSouthWestIndianOcean(lat, lon)) continue;
    const toDate = typeof p.todate === "string" ? p.todate : null;
    const current = String(p.iscurrent).toLowerCase() === "true";
    const recent = toDate ? now.getTime() - new Date(toDate).getTime() < 36 * 3600_000 : false;
    if (!current && !recent) continue;
    const sev = (p.severitydata ?? {}) as Raw;
    const unit = String(sev.severityunit ?? "").toLowerCase();
    const sevVal = Number(sev.severity);
    const maxWindKmh = Number.isFinite(sevVal) && unit.includes("km") ? Math.round(sevVal) : null;
    const urls = (p.url ?? {}) as Raw;
    const pos = { lat, lon };
    out.push({
      id: String(p.eventid ?? `${lat},${lon}`),
      name: String(p.name ?? p.eventname ?? "Tropical system"),
      alertLevel: typeof p.alertlevel === "string" ? p.alertlevel : null,
      description: typeof p.description === "string" ? p.description : null,
      lat,
      lon,
      maxWindKmh,
      fromDate: typeof p.fromdate === "string" ? p.fromdate : null,
      toDate,
      reportUrl: typeof urls.report === "string" ? urls.report : null,
      geometryUrl: typeof urls.geometry === "string" && urls.geometry.startsWith("https://www.gdacs.org/") ? urls.geometry : null,
      distanceKm: { mauritius: distanceKm(MAURITIUS, pos), rodrigues: distanceKm(RODRIGUES, pos) },
      bearingFrom: { mauritius: bearing(MAURITIUS, pos), rodrigues: bearing(RODRIGUES, pos) },
    });
  }
  return out.sort((a, b) => Math.min(a.distanceKm.mauritius, a.distanceKm.rodrigues) - Math.min(b.distanceKm.mauritius, b.distanceKm.rodrigues));
}

const SOURCE = { text: "Global Disaster Alert and Coordination System, GDACS", url: "https://www.gdacs.org/" };

export async function getActiveSystems(): Promise<CycloneStatus> {
  const to = new Date();
  const from = new Date(to.getTime() - 10 * 86400_000);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const url = `${API}?eventlist=TC&fromdate=${d(from)}&todate=${d(to)}&alertlevel=green;orange;red`;
  const checkedAt = new Date().toISOString();
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(12_000), headers: { Accept: "application/json" } });
    // GDACS may answer 204/404 when there are no events in the window.
    if (res.status === 204 || res.status === 404) return { source: SOURCE, checkedAt, ok: true, systems: [] };
    if (!res.ok) return { source: SOURCE, checkedAt, ok: false, systems: [], message: `GDACS returned HTTP ${res.status}` };
    const text = await res.text();
    const raw = text.trim() ? JSON.parse(text) : {};
    const systems = parseGdacs(raw);
    // Add track, forecast cone and closest approach for the nearest systems.
    await Promise.all(
      systems.slice(0, 3).map(async (s) => {
        s.track = s.geometryUrl ? await getTrack(s.geometryUrl) : null;
        const pts = s.track?.points.length ? s.track.points : [{ lat: s.lat, lon: s.lon, time: null, observed: true, windKmh: s.maxWindKmh }];
        s.closest = { mauritius: closestApproach(pts, MAURITIUS), rodrigues: closestApproach(pts, RODRIGUES) };
        const { findAnalogues } = await import("../intelligence/analogues.service");
        s.analogues = findAnalogues(pts, s.maxWindKmh);
      }),
    );
    return { source: SOURCE, checkedAt, ok: true, systems };
  } catch (e) {
    return { source: SOURCE, checkedAt, ok: false, systems: [], message: (e as Error).message };
  }
}

// ——— Track, forecast and cone ———

export interface TrackPoint {
  lat: number;
  lon: number;
  /** ISO UTC time if GDACS provides it. */
  time: string | null;
  observed: boolean;
  windKmh: number | null;
}

export interface StormTrack {
  points: TrackPoint[];
  /** Raw GeoJSON features to draw: lines, the forecast cone and wind-band polygons. */
  lines: Feature[];
  cone: Feature[];
  windBands: Feature[];
}

export interface ClosestApproach {
  km: number;
  bearing: string; // direction of the storm centre as seen from the island
  time: string | null; // ISO UTC
}

const isTrue = (v: unknown) => String(v).toLowerCase() === "true" || v === true;

function featureTime(p: Raw): string | null {
  for (const k of ["trackdate", "polygondate", "datetime", "date", "fromdate"]) {
    const v = p[k];
    if (typeof v === "string" && !Number.isNaN(Date.parse(v.includes("Z") || v.includes("+") ? v : `${v}Z`))) return new Date(v.includes("Z") || v.includes("+") ? v : `${v}Z`).toISOString();
  }
  return null;
}

/** Defensive parser for GDACS getgeometry GeoJSON (field names vary between events). */
export function parseTrack(raw: unknown): StormTrack {
  const features = (raw && typeof raw === "object" && Array.isArray((raw as Raw).features) ? (raw as Raw).features : []) as Feature[];
  const out: StormTrack = { points: [], lines: [], cone: [], windBands: [] };
  for (const f of features) {
    const g = f.geometry as Feature["geometry"] | null;
    if (!g) continue;
    const p = (f.properties ?? {}) as Raw;
    const cls = String(p.Class ?? p.class ?? p.polygonlabel ?? "").toLowerCase();
    if (g.type === "Point") {
      const [lon, lat] = g.coordinates as number[];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const wind = Number(p.wind_speed ?? p.windspeed ?? p.maxwind ?? p.windspeedkmh);
      const observed = p.actual !== undefined ? isTrue(p.actual) : !cls.includes("forecast");
      out.points.push({ lat, lon, time: featureTime(p), observed, windKmh: Number.isFinite(wind) && wind > 0 ? Math.round(wind) : null });
    } else if (g.type === "LineString" || g.type === "MultiLineString") {
      out.lines.push(f);
    } else if (g.type === "Polygon" || g.type === "MultiPolygon") {
      if (cls.includes("cone")) out.cone.push(f);
      else out.windBands.push(f);
    }
  }
  out.points.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  return out;
}

/** Closest approach of the storm centre to a place, interpolating hourly between timed points. */
export function closestApproach(points: TrackPoint[], place: { lat: number; lon: number }, now = new Date()): ClosestApproach | null {
  const future = points.filter((p) => !p.time || new Date(p.time).getTime() >= now.getTime() - 3 * 3600_000);
  if (future.length === 0) return null;
  let best: ClosestApproach | null = null;
  const consider = (lat: number, lon: number, time: string | null) => {
    const km = distanceKm(place, { lat, lon });
    if (!best || km < best.km) best = { km, bearing: bearing(place, { lat, lon }), time };
  };
  for (let i = 0; i < future.length; i++) {
    const a = future[i];
    consider(a.lat, a.lon, a.time);
    const b = future[i + 1];
    if (b && a.time && b.time) {
      const t0 = Date.parse(a.time);
      const steps = Math.min(240, Math.max(1, Math.round((Date.parse(b.time) - t0) / 3600_000)));
      for (let k = 1; k < steps; k++) {
        const r = k / steps;
        consider(a.lat + (b.lat - a.lat) * r, a.lon + (b.lon - a.lon) * r, new Date(t0 + (Date.parse(b.time) - t0) * r).toISOString());
      }
    }
  }
  return best;
}

export async function getTrack(geometryUrl: string): Promise<StormTrack | null> {
  if (!geometryUrl.startsWith("https://www.gdacs.org/")) return null;
  try {
    const res = await fetch(geometryUrl, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return parseTrack(await res.json());
  } catch {
    return null;
  }
}
