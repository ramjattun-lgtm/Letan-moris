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
  distanceKm: { mauritius: number; rodrigues: number };
  bearingFrom: { mauritius: string; rodrigues: string };
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
    return { source: SOURCE, checkedAt, ok: true, systems: parseGdacs(raw) };
  } catch (e) {
    return { source: SOURCE, checkedAt, ok: false, systems: [], message: (e as Error).message };
  }
}
