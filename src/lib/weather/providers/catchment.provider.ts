import { getJson } from "./open-meteo.provider";
import { addDays } from "@/lib/time";

// Rain over reservoir catchments from Open-Meteo (CC BY 4.0):
//  - Historical Weather API, ERA5-Land reanalysis: complete days up to ~5 days ago.
//  - Forecast API: the most recent days (model estimates) and the next 7 days.
//  - Seasonal API: ECMWF EC46 weekly and SEAS5 monthly ensemble-mean rain and anomaly.

type Daily = Record<string, number | null>;
const TZ = "Indian/Mauritius";

function dailyMaps(raw: unknown): Daily[] {
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((r) => {
    const d = (r as { daily?: { time?: string[]; precipitation_sum?: (number | null)[] } }).daily;
    const out: Daily = {};
    (d?.time ?? []).forEach((t, i) => (out[t] = d?.precipitation_sum?.[i] ?? null));
    return out;
  });
}

const coords = (pts: { lat: number; lon: number }[]) => ({
  latitude: pts.map((p) => p.lat.toFixed(3)).join(","),
  longitude: pts.map((p) => p.lon.toFixed(3)).join(","),
});

/** ERA5-Land daily rain for each point from `start` to yesterday. Recent days may be null (not yet available). */
export async function getReanalysisRain(pts: { lat: number; lon: number }[], start: string, today: string): Promise<Daily[]> {
  const q = new URLSearchParams({ ...coords(pts), start_date: start, end_date: addDays(today, -1), daily: "precipitation_sum", models: "era5_land", timezone: TZ });
  return dailyMaps(await getJson(`https://archive-api.open-meteo.com/v1/archive?${q}`, 6 * 3600));
}

/** Forecast-model daily rain: the last 14 days and the next 7 days. */
export async function getModelRain(pts: { lat: number; lon: number }[]): Promise<Daily[]> {
  const q = new URLSearchParams({ ...coords(pts), daily: "precipitation_sum", past_days: "14", forecast_days: "7", timezone: TZ });
  return dailyMaps(await getJson(`https://api.open-meteo.com/v1/forecast?${q}`, 3 * 3600));
}

/** Weekly (EC46) and monthly (SEAS5) rain outlook for one point. */
export async function getSeasonalRain(lat: number, lon: number): Promise<unknown> {
  // Ask for ~7 months so six full months after the current one are covered; fall back to the documented default.
  try {
    return await seasonal(lat, lon, 215);
  } catch {
    return seasonal(lat, lon, 183);
  }
}

async function seasonal(lat: number, lon: number, days: number): Promise<unknown> {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    weekly: "precipitation_mean,precipitation_anomaly,precipitation_anomaly_gt0",
    monthly: "precipitation_mean,precipitation_anomaly",
    forecast_days: String(days),
    timezone: TZ,
  });
  return getJson(`https://seasonal-api.open-meteo.com/v1/forecast?${q}`, 12 * 3600);
}
