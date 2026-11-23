import { OFFICIAL } from "@/data/official-status";
import type { CycloneStatus } from "../providers/gdacs.provider";
import type { Island } from "../types";

// Cyclone mode turns on when MMS has a warning in force (entered by the owner) or when
// international monitoring shows a tropical system forecast to pass within 600 km.

export const CYCLONE_MODE_KM = 600;

export interface CycloneMode {
  active: boolean;
  official: boolean;
  headline: string;
  systemName?: string;
}

export function cycloneMode(island: Island, status: CycloneStatus | null): CycloneMode {
  const o = OFFICIAL[island];
  if (o.status === "warning") return { active: true, official: true, headline: o.headline };
  const name = island === "rodrigues" ? "Rodrigues" : "Mauritius";
  for (const s of status?.systems ?? []) {
    const c = s.closest?.[island];
    const km = c?.km ?? s.distanceKm[island];
    if (km <= CYCLONE_MODE_KM) {
      return {
        active: true,
        official: false,
        systemName: s.name,
        headline: `${s.name} is forecast to pass about ${km.toLocaleString()} km from ${name}. Follow MMS for official warnings.`,
      };
    }
  }
  return { active: false, official: false, headline: "" };
}

/** Plain lines for the Cyclone-ready card on Today (times are Mauritius local "YYYY-MM-DDTHH:mm"). */
export function readyLines(
  m: CycloneMode,
  closest: { km: number; timeLocal: string; bearing: string } | null,
  impact: { peakGust: { kmh: number; time: string } | null; totalRainMm: number | null; prepareBy: string | null } | null,
  fmt: (local: string) => string,
): string[] {
  if (!m.active) return [];
  const out: string[] = [];
  if (closest) out.push(`Closest approach: about ${closest.km.toLocaleString()} km to the ${closest.bearing}, ${fmt(closest.timeLocal)} (forecast track).`);
  if (impact?.prepareBy) out.push(`Be ready by ${fmt(impact.prepareBy)} — about 12 hours before gusts of 60 km/h or more are forecast here.`);
  if (impact?.peakGust) out.push(`Strongest gust forecast here: about ${impact.peakGust.kmh} km/h, ${fmt(impact.peakGust.time)}.`);
  if (impact?.totalRainMm !== null && impact?.totalRainMm !== undefined) out.push(`Rain expected here: about ${impact.totalRainMm} mm.`);
  out.push("These are independent model estimates. Official cyclone warnings come only from MMS.");
  return out;
}
