import { getLocality } from "@/data/localities";
import { climateKeyFor } from "@/lib/weather/intelligence/climate.service";
import { assessHeavyRain, type RainHour } from "@/lib/weather/intelligence/heavy-rain.service";
import { KINDS, summariseHazards, type Report } from "./lapli";
import { formatUtcAsMU, hhmm, nowMU } from "@/lib/time";
import { QUAKE_SIGNS, type Quake } from "@/lib/weather/intelligence/quake.service";
import type { RiverAssessment } from "@/lib/weather/intelligence/river.service";

// Location alerts by area, sent as free ntfy notifications. People follow the area of a saved
// place (Home, Work, School…) in the free ntfy app. Independent alerts — never MMS warnings.

export const ALERT_AREAS = [
  { key: "north", name: "North", lat: -20.013, lon: 57.58 },
  { key: "east", name: "East", lat: -20.1897, lon: 57.7144 },
  { key: "south", name: "South", lat: -20.4081, lon: 57.7 },
  { key: "west", name: "West", lat: -20.2742, lon: 57.3711 },
  { key: "plateau", name: "Central Plateau", lat: -20.3163, lon: 57.5259 },
  { key: "portlouis", name: "Port Louis", lat: -20.1609, lon: 57.5012 },
  { key: "rodrigues", name: "Rodrigues", lat: -19.6833, lon: 63.4167 },
] as const;
export type AreaKey = (typeof ALERT_AREAS)[number]["key"];

export const ALERT_TOPIC_PREFIX = "letan-moris-alerts-";
export const areaTopic = (key: string) => `${ALERT_TOPIC_PREFIX}${key}`;
export const areaName = (key: string) => ALERT_AREAS.find((a) => a.key === key)?.name ?? key;

export interface AreaAlert {
  key: string; // stable id, used so each alert is sent only once
  priority: 3 | 4 | 5;
  title: string;
  body: string;
  loc?: string; // locality to open when tapped
}

export const ALERT_FOOTER = "Independent alert from Letan Moris — not an official warning. Follow MMS for official warnings.";

/** Heavy-rain alert for one area from its rain hours (moderate and high only). */
export function rainAlert(areaKey: string, hours: RainHour[], now = nowMU()): AreaAlert | null {
  const a = assessHeavyRain(hours, now);
  if (a.level !== "moderate" && a.level !== "high") return null;
  const when = a.max1h && a.max1h.mm >= 1 ? ` around ${hhmm(a.max1h.time)}` : "";
  return {
    key: `rain-${areaKey}-${now.slice(0, 10)}-${a.level}`,
    priority: a.level === "high" ? 4 : 3,
    title: `${a.level === "high" ? "High" : "Moderate"} heavy-rain risk${when} · ${areaName(areaKey)}`,
    body: `${a.reasons.slice(0, 2).join(" ")} Avoid flood-prone roads and river banks if it gets heavy.`,
  };
}

/** Community hazards confirmed by 2+ phones (river rising, fallen tree, rough sea), grouped by area. */
export function hazardAlerts(reports: Report[], nowSec = Math.floor(Date.now() / 1000)): Record<string, AreaAlert[]> {
  const out: Record<string, AreaAlert[]> = {};
  for (const h of summariseHazards(reports, nowSec)) {
    if (!h.corroborated) continue;
    const area = climateKeyFor(h.loc);
    const k = KINDS.find((x) => x.id === h.kind)!;
    (out[area] ??= []).push({
      key: `${h.kind}-${h.loc.id}-${nowMU().slice(0, 10)}`,
      priority: h.kind === "river" ? 4 : 3,
      title: `${k.english} reported in ${h.loc.name}`,
      body: `${h.reporters} people reported "${k.english.toLowerCase()}" near ${h.loc.name} in the last ${Math.max(10, h.minutesAgo)} minutes. Community reports, not checked by anyone.${h.kind === "river" ? " Keep away from river banks and fords." : ""}`,
      loc: h.loc.id,
    });
  }
  return out;
}

export const knownLoc = (id?: string) => (id && getLocality(id) ? id : undefined);

/** Strong Indian Ocean earthquake: urgent "check MMS" notice for every area (never a tsunami warning). */
export function quakeAlert(q: Quake, areaKey: string): AreaAlert {
  const dist = areaKey === "rodrigues" ? q.kmFromRodrigues : q.kmFromMauritius;
  return {
    key: `quake-${q.id}`,
    priority: q.level === "red" ? 5 : 4,
    title: `Strong earthquake M${q.mag}: ${q.place} — check MMS now`,
    body: `A magnitude ${q.mag} earthquake happened at ${formatUtcAsMU(q.timeUtc)} (Mauritius time), about ${Math.round(dist / 100) * 100} km away. Tsunami warnings for Mauritius and Rodrigues come only from MMS: check MMS, radio and TV now. ${QUAKE_SIGNS}`,
  };
}

type RiverForAlert = Pick<RiverAssessment, "level" | "message"> & { id: string; name: string; downstream: string[] };

/** River watch HIGH: alert every area downstream of the river (estimate from rain, not river levels). */
export function riverAlerts(rivers: RiverForAlert[], now = nowMU()): Record<string, AreaAlert[]> {
  const out: Record<string, AreaAlert[]> = {};
  for (const r of rivers) {
    if (r.level !== "high") continue;
    const areas = new Set(r.downstream.map((id) => getLocality(id)).filter((l) => !!l).map((l) => climateKeyFor(l!)));
    for (const area of areas) {
      (out[area] ??= []).push({
        key: `river-${r.id}-${now.slice(0, 10)}-high`,
        priority: 4,
        title: `River watch: ${r.name} could rise fast`,
        body: `${r.message} Estimate from rain over the hills, not a river-level measurement.`,
        loc: knownLoc(r.downstream[0]),
      });
    }
  }
  return out;
}
