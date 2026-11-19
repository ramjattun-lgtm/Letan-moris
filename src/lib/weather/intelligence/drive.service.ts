import { LOCALITIES, nearestLocality, type Locality } from "@/data/localities";
import type { Forecast, Maybe } from "../types";
import { distanceKm } from "../providers/gdacs.provider";
import { addHours, hhmm, hourStart } from "@/lib/time";

// Drive planner: rain along a trip by departure time.
// The route is approximated by a straight line sampled at named places along the way
// (no routing service), with a road factor for distance and an average island speed.

export const ROAD_FACTOR = 1.35;
export const AVG_KMH = 40;

export function waypoints(from: Locality, to: Locality, samples = 6): Locality[] {
  const out: Locality[] = [from];
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const p = nearestLocality(from.lat + (to.lat - from.lat) * t, from.lon + (to.lon - from.lon) * t);
    if (p.island === from.island && !out.some((x) => x.id === p.id) && p.id !== to.id) out.push(p);
  }
  out.push(to);
  return out;
}

export function tripMinutes(from: Locality, to: Locality): number {
  return Math.max(10, Math.round(((distanceKm(from, to) * ROAD_FACTOR) / AVG_KMH) * 60));
}

export interface DepartureOption {
  depart: string; // local time
  arrive: string;
  maxRainProb: Maybe<number>;
  rainMm: Maybe<number>;
  wettest: Maybe<string>; // place name with most rain
  heavy: boolean;
}

/** Evaluate departures every 30 min for the next `hours` hours. */
export function departureOptions(route: Locality[], forecasts: Record<string, Forecast>, now: string, hours = 6): DepartureOption[] {
  const total = tripMinutes(route[0], route[route.length - 1]);
  const cum: number[] = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + distanceKm(route[i - 1], route[i]));
  const len = cum[cum.length - 1] || 1;
  const out: DepartureOption[] = [];
  const start = now.slice(14, 16) < "30" ? `${now.slice(0, 14)}30` : addHours(hourStart(now), 1);
  for (let k = 0; k <= hours * 2; k++) {
    const depart = addMinutes(start, k * 30);
    let maxP: number | null = null;
    let mm = 0;
    let anyMm = false;
    let wettest: { name: string; mm: number } | null = null;
    let heavy = false;
    route.forEach((p, i) => {
      const at = addMinutes(depart, Math.round((cum[i] / len) * total));
      const h = forecasts[p.id]?.hourly.find((x) => x.time === hourStart(at));
      if (!h) return;
      if (h.rainProbability !== null) maxP = Math.max(maxP ?? 0, h.rainProbability);
      if (h.precipitation !== null) {
        anyMm = true;
        mm += h.precipitation;
        if (h.precipitation >= 2.5) heavy = true;
        if (!wettest || h.precipitation > wettest.mm) wettest = { name: p.name, mm: h.precipitation };
      }
    });
    const w = wettest as { name: string; mm: number } | null;
    out.push({ depart, arrive: addMinutes(depart, total), maxRainProb: maxP, rainMm: anyMm ? Math.round(mm * 10) / 10 : null, wettest: w && w.mm >= 0.1 ? w.name : null, heavy });
  }
  return out;
}

export function bestDeparture(opts: DepartureOption[]): DepartureOption | null {
  const ok = opts.filter((o) => o.maxRainProb !== null);
  if (!ok.length) return null;
  return [...ok].sort((a, b) => (a.maxRainProb! - b.maxRainProb!) || ((a.rainMm ?? 0) - (b.rainMm ?? 0)) || a.depart.localeCompare(b.depart))[0];
}

export function addMinutes(local: string, mins: number): string {
  const [d, t] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const x = new Date(Date.UTC(y, mo - 1, da, h, mi + mins));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getUTCFullYear()}-${p(x.getUTCMonth() + 1)}-${p(x.getUTCDate())}T${p(x.getUTCHours())}:${p(x.getUTCMinutes())}`;
}

export const fmtTime = hhmm;
export const ALL_PLACES = LOCALITIES;
