// Strong undersea earthquakes in the Indian Ocean (USGS feed) → "check MMS now" notice.
// This is NOT a tsunami warning: MMS is the National Tsunami Warning Centre for Mauritius and
// Rodrigues. We never say a tsunami is coming, never give wave heights or arrival times.

// Two bars: any strong quake in the Indian Ocean, or a smaller one close to our islands.
// (24 Nov 2026: a M6.4 quake 330 km from Rodrigues was missed by a single 6.5 bar.)
export const QUAKE_MIN_MAG = 6.5;
export const QUAKE_NEAR_KM = 1500;
export const QUAKE_NEAR_MIN_MAG = 5.5;
export const QUAKE_MAX_DEPTH_KM = 100; // deep quakes rarely cause tsunamis
export const QUAKE_WINDOW_H = 12;
// The Indian Ocean basin, roughly (South Africa to Western Australia, Antarctica to the Arabian Sea).
export const INDIAN_OCEAN = { latMin: -60, latMax: 30, lonMin: 20, lonMax: 125 };
const MAURITIUS = { lat: -20.2, lon: 57.5 };
const RODRIGUES = { lat: -19.7, lon: 63.4 };

export interface UsgsFeature {
  id: string;
  properties: { mag: number | null; place: string | null; time: number; url?: string; tsunami?: number };
  geometry: { coordinates: [number, number, number] }; // lon, lat, depth km
}

export interface Quake {
  id: string;
  mag: number;
  place: string;
  timeUtc: string;
  lat: number;
  lon: number;
  depthKm: number;
  kmFromMauritius: number;
  kmFromRodrigues: number;
  url: string | null;
  /** USGS flag: a tsunami warning centre has issued information for this event (anywhere). */
  tsunamiInfo: boolean;
  /** red = strong (6.5+) or close and fairly strong (6.0+ within 600 km); amber otherwise. */
  level: "red" | "amber";
}

function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Strong, shallow quakes in the Indian Ocean in the last 12 hours, strongest first. */
export function notableQuakes(features: UsgsFeature[], nowMs = Date.now()): Quake[] {
  return features
    .filter((f) => {
      const [lon, lat, depth] = f.geometry?.coordinates ?? [];
      const mag = f.properties?.mag ?? 0;
      const near = Math.min(km(MAURITIUS, { lat, lon }), km(RODRIGUES, { lat, lon })) <= QUAKE_NEAR_KM;
      return (
        (mag >= QUAKE_MIN_MAG || (near && mag >= QUAKE_NEAR_MIN_MAG)) &&
        depth <= QUAKE_MAX_DEPTH_KM &&
        lat >= INDIAN_OCEAN.latMin &&
        lat <= INDIAN_OCEAN.latMax &&
        lon >= INDIAN_OCEAN.lonMin &&
        lon <= INDIAN_OCEAN.lonMax &&
        nowMs - f.properties.time <= QUAKE_WINDOW_H * 3600e3 &&
        f.properties.time <= nowMs + 60_000
      );
    })
    .map((f) => {
      const [lon, lat, depth] = f.geometry.coordinates;
      return {
        id: f.id,
        mag: Math.round((f.properties.mag ?? 0) * 10) / 10,
        place: f.properties.place ?? "Indian Ocean",
        timeUtc: new Date(f.properties.time).toISOString(),
        lat,
        lon,
        depthKm: Math.round(depth),
        kmFromMauritius: km(MAURITIUS, { lat, lon }),
        kmFromRodrigues: km(RODRIGUES, { lat, lon }),
        url: f.properties.url ?? null,
        tsunamiInfo: f.properties.tsunami === 1,
        level: (() => {
          const mag = f.properties.mag ?? 0;
          const closest = Math.min(km(MAURITIUS, { lat, lon }), km(RODRIGUES, { lat, lon }));
          return mag >= QUAKE_MIN_MAG || (mag >= 6 && closest <= 600) ? ("red" as const) : ("amber" as const);
        })(),
      };
    })
    .sort((a, b) => b.mag - a.mag);
}

export const QUAKE_SIGNS =
  "If you are at the coast and feel strong shaking, or see the sea suddenly pull back, go to high ground or inland straight away — do not wait for a message.";
