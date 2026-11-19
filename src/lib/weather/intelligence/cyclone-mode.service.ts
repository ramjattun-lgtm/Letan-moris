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
