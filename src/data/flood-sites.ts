import { getLocality } from "./localities";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";
import type { MapPoint } from "@/lib/weather/types";

// Flood-prone sectors modelled in the Land Drainage Master Plan (LDMP) for the Land Drainage
// Authority — "Integrated Land Drainage Master Plan, D5.2 Vol. 2" (AdaptAction / AFD, July 2022),
// section 2.1 and Table 6. 5 priority sites (7 sectors) + 11 complementary sectors.
// The report gives sector names and maps, not coordinates: the lat/lon below are the
// APPROXIMATE centre of each named area, for placing a marker only. They are not flood boundaries.

export interface FloodSite {
  id: string; // LDMP sector id
  name: string;
  detail?: string;
  type: "priority" | "complementary";
  lat: number;
  lon: number;
}

export const FLOOD_SITES: FloodSite[] = [
  { id: "S73", name: "Port Louis – Rivière Lataniers", detail: "Rivière Lataniers and Canal Anglais", type: "priority", lat: -20.152, lon: 57.512 },
  { id: "S75", name: "Port Louis – Rivière du Pouce", detail: "Rivière du Pouce, La Poudrière, Ruisseau des Créoles and cut-off drain", type: "priority", lat: -20.166, lon: 57.507 },
  { id: "S77", name: "Port Louis – Canal Dayot", detail: "Canal Dayot and urban drains", type: "priority", lat: -20.178, lon: 57.479 },
  { id: "S65", name: "Flic-en-Flac", type: "priority", lat: -20.276, lon: 57.372 },
  { id: "S32", name: "Bel Ombre", type: "priority", lat: -20.502, lon: 57.402 },
  { id: "S47", name: "Nouvelle France", type: "priority", lat: -20.37, lon: 57.56 },
  { id: "S5-6", name: "Grand Baie – Pereybère", type: "priority", lat: -20.005, lon: 57.584 },
  { id: "S01", name: "Mapou – Piton – Cottage", type: "complementary", lat: -20.06, lon: 57.62 },
  { id: "S25-102", name: "Clémencia – Bel Air – Olivia – Pont Lardier", type: "complementary", lat: -20.255, lon: 57.68 },
  { id: "S43", name: "Flacq", type: "complementary", lat: -20.19, lon: 57.715 },
  { id: "S59", name: "Coteau Raffin", type: "complementary", lat: -20.4, lon: 57.37 },
  { id: "S72", name: "Terre Rouge", type: "complementary", lat: -20.127, lon: 57.53 },
  { id: "S74", name: "Port Louis – La Paix", type: "complementary", lat: -20.165, lon: 57.518 },
  { id: "S78", name: "Pointe aux Sables", type: "complementary", lat: -20.17, lon: 57.462 },
  { id: "S82", name: "Henrietta – Malakoff", type: "complementary", lat: -20.33, lon: 57.475 },
  { id: "S85", name: "Vacoas – Quatre Bornes", type: "complementary", lat: -20.28, lon: 57.48 },
  { id: "S86", name: "Curepipe (downstream)", type: "complementary", lat: -20.305, lon: 57.515 },
];

export const FLOOD_SITES_SOURCE =
  "Flood-prone sectors: Land Drainage Master Plan for the Land Drainage Authority (AdaptAction/AFD, 2022). Marker positions are approximate area centres, not flood boundaries.";

/** Flood-prone LDMP sectors within `maxKm` of a place, nearest first. */
export function floodSitesNear(p: { lat: number; lon: number }, maxKm = 4): (FloodSite & { km: number })[] {
  return FLOOD_SITES.map((s) => ({ ...s, km: Math.round(distanceKm(p, s) * 10) / 10 }))
    .filter((s) => s.km <= maxKm)
    .sort((a, b) => a.km - b.km);
}

export type SiteRisk = FloodSite & { risk: "low" | "moderate" | "high" | null; from: string | null };

/** Today's heavy-rain risk at each flood-prone site, taken from the nearest forecast point (within 12 km). */
export function siteRisks(points: MapPoint[]): SiteRisk[] {
  const located = points
    .map((p) => ({ p, loc: getLocality(p.locationId) }))
    .filter((x): x is { p: MapPoint; loc: NonNullable<ReturnType<typeof getLocality>> } => !!x.loc && x.loc.island === "mauritius" && x.p.rainRisk !== undefined);
  const order = { high: 0, moderate: 1, low: 2 } as const;
  return FLOOD_SITES.map((s) => {
    let best: { km: number; risk: SiteRisk["risk"]; name: string } | null = null;
    for (const { p, loc } of located) {
      const km = distanceKm(s, loc);
      if (km <= 12 && (!best || km < best.km)) best = { km, risk: p.rainRisk ?? null, name: loc.name };
    }
    return { ...s, risk: best?.risk ?? null, from: best?.name ?? null };
  }).sort((a, b) => (a.risk === null ? 3 : order[a.risk]) - (b.risk === null ? 3 : order[b.risk]));
}
