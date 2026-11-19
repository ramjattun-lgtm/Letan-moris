import { getLocality, type Locality } from "@/data/localities";
import { distanceKm, bearing } from "@/lib/weather/providers/gdacs.provider";

// "Lapli isi!" community rain reports — no database.
// Reports are published straight from each person's phone to a topic on ntfy.sh (a free public
// message service). ntfy keeps messages for about 12 hours; we only use the last 2 hours.
// Reports contain only a place id (village, never GPS) and the kind of rain. They are
// UNVERIFIED community observations and are always labelled as such.

export const NTFY_BASE = "https://ntfy.sh";
export const TOPIC = process.env.NEXT_PUBLIC_LAPLI_TOPIC ?? "letan-moris-lapli-isi-v1-7k3q";
export const WINDOW_MIN = 120;
export const DEVICE_COOLDOWN_MIN = 10;

export type ReportKind = "light" | "heavy" | "flooding" | "stopped";
export const KINDS: { id: ReportKind; kreol: string; english: string }[] = [
  { id: "light", kreol: "Ti lapli", english: "Light rain" },
  { id: "heavy", kreol: "Gro lapli", english: "Heavy rain" },
  { id: "flooding", kreol: "Delo lor sime", english: "Water on the road" },
  { id: "stopped", kreol: "Lapli finn arete", english: "Rain has stopped" },
];

export interface Report {
  id: string;
  loc: string;
  kind: ReportKind;
  time: number; // unix seconds, from the ntfy server (not the phone)
}

const VALID = new Set<ReportKind>(["light", "heavy", "flooding", "stopped"]);

/** Parse ntfy's newline-delimited JSON poll response, keeping only valid, recent reports. */
export function parseReports(ndjson: string, nowSec = Math.floor(Date.now() / 1000)): Report[] {
  const out: Report[] = [];
  for (const line of ndjson.split("\n")) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line) as { id?: string; time?: number; event?: string; message?: string };
      if (ev.event !== "message" || typeof ev.time !== "number" || typeof ev.message !== "string") continue;
      if (nowSec - ev.time > WINDOW_MIN * 60 || ev.time - nowSec > 120) continue;
      const m = JSON.parse(ev.message) as { v?: number; loc?: string; kind?: string };
      if (m.v !== 1 || typeof m.loc !== "string" || !getLocality(m.loc) || !VALID.has(m.kind as ReportKind)) continue;
      out.push({ id: String(ev.id ?? `${ev.time}-${m.loc}`), loc: m.loc, kind: m.kind as ReportKind, time: ev.time });
    } catch {
      /* ignore anything that is not a valid report */
    }
  }
  return out;
}

export interface PlaceSummary {
  loc: Locality;
  count: number;
  latest: Report;
  kind: ReportKind; // most serious recent kind
  minutesAgo: number;
}

const SEVERITY: Record<ReportKind, number> = { stopped: 0, light: 1, heavy: 2, flooding: 3 };

/** Group reports by place; a later "stopped" report cancels earlier rain at that place. */
export function summariseByPlace(reports: Report[], nowSec = Math.floor(Date.now() / 1000)): PlaceSummary[] {
  const by = new Map<string, Report[]>();
  for (const r of reports) by.set(r.loc, [...(by.get(r.loc) ?? []), r]);
  const out: PlaceSummary[] = [];
  for (const [loc, rs] of by) {
    rs.sort((a, b) => b.time - a.time);
    const latest = rs[0];
    const recent = rs.filter((r) => latest.time - r.time <= 30 * 60);
    const kind = latest.kind === "stopped" ? "stopped" : recent.reduce<ReportKind>((k, r) => (SEVERITY[r.kind] > SEVERITY[k] ? r.kind : k), "light");
    out.push({ loc: getLocality(loc)!, count: rs.length, latest, kind, minutesAgo: Math.max(0, Math.round((nowSec - latest.time) / 60)) });
  }
  return out.sort((a, b) => a.minutesAgo - b.minutesAgo);
}

export interface UpwindAlert {
  place: string;
  km: number;
  direction: string;
  minutesAgo: number;
  etaMin: [number, number];
  reports: number;
  heavy: boolean;
}

const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/**
 * Upwind early alert: showers drift with the wind (usually the south-east trades).
 * If rain is reported 5–40 km UPWIND of you in the last hour, estimate when it may arrive.
 */
export function upwindAlert(you: Locality, places: PlaceSummary[], windFromDeg: number | null, windKmh: number | null): UpwindAlert | null {
  if (windFromDeg === null || windKmh === null || windKmh < 5) return null;
  // Showers move faster than the surface wind; use 1.5× the 10 m wind, kept within 15–60 km/h.
  const speed = Math.min(60, Math.max(15, windKmh * 1.5));
  let best: UpwindAlert | null = null;
  for (const p of places) {
    if (p.kind === "stopped" || p.minutesAgo > 60 || p.loc.island !== you.island) continue;
    const km = distanceKm(you, p.loc);
    if (km < 5 || km > 40) continue;
    const dirToPlace = bearingDeg(you, p.loc);
    if (angleDiff(dirToPlace, windFromDeg) > 45) continue; // not upwind
    const travel = (km / speed) * 60 - p.minutesAgo;
    const eta: [number, number] = [Math.max(0, Math.round(travel * 0.7)), Math.max(5, Math.round(travel * 1.3))];
    if (eta[1] <= 0) continue;
    const a: UpwindAlert = { place: p.loc.name, km: Math.round(km), direction: bearing(you, p.loc), minutesAgo: p.minutesAgo, etaMin: eta, reports: p.count, heavy: p.kind === "heavy" || p.kind === "flooding" };
    if (!best || a.etaMin[0] < best.etaMin[0]) best = a;
  }
  return best;
}

function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toR = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toR(b.lon - a.lon)) * Math.cos(toR(b.lat));
  const x = Math.cos(toR(a.lat)) * Math.sin(toR(b.lat)) - Math.sin(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.cos(toR(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ——— Browser side ———

export async function fetchReports(): Promise<Report[]> {
  const res = await fetch(`${NTFY_BASE}/${TOPIC}/json?poll=1&since=${WINDOW_MIN}m`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Reports unavailable (${res.status})`);
  return parseReports(await res.text());
}

export async function sendReport(loc: string, kind: ReportKind): Promise<void> {
  if (!getLocality(loc) || !VALID.has(kind)) throw new Error("Invalid report");
  const res = await fetch(`${NTFY_BASE}/${TOPIC}`, { method: "POST", body: JSON.stringify({ v: 1, loc, kind }) });
  if (!res.ok) throw new Error(res.status === 429 ? "Too many reports — please try again later." : `Could not send (${res.status})`);
}

/** Minutes this device must wait before sending another report (stored on the device). */
export function cooldownLeft(lastMs: number, nowMs: number = Date.now()): number {
  return Math.max(0, DEVICE_COOLDOWN_MIN - Math.floor((nowMs - lastMs) / 60000));
}
export const nowMs = () => Date.now();
