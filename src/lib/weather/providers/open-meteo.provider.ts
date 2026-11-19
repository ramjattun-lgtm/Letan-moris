import type {
  CurrentConditions,
  DailyPoint,
  DataProvenance,
  Forecast,
  HourlyPoint,
  MapPoint,
  MarineForecast,
  Maybe,
} from "../types";
import { ProviderError, type Coordinates, type WeatherProvider } from "./weather-provider.interface";
import { nowMU } from "@/lib/time";

// Open-Meteo free API — non-commercial use only, CC BY 4.0 attribution required,
// fewer than 10,000 calls/day, 5,000/hour, 600/minute (check https://open-meteo.com/en/terms).
// Requests with many variables may count as more than one call, so responses are cached.

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const TZ = "Indian/Mauritius";

/** Seconds a forecast stays cached before revalidation (budget: see docs/API-BUDGET.md). */
export const FORECAST_TTL = 3600;
export const MAP_TTL = 3600;
export const MARINE_TTL = 3 * 3600;

const ATTRIBUTION = { text: "Weather data by Open-Meteo.com (CC BY 4.0)", url: "https://open-meteo.com/" };

const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "is_day",
];
const HOURLY_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
];
const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "precipitation_hours",
  "sunrise",
  "sunset",
  "uv_index_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
];

type Raw = Record<string, unknown>;

const num = (v: unknown): Maybe<number> => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): Maybe<string> => (typeof v === "string" && v.length > 0 ? v : null);
const arr = (o: Raw | undefined, k: string): unknown[] => (o && Array.isArray(o[k]) ? (o[k] as unknown[]) : []);

function provenance(raw: Raw, model = "best_match"): DataProvenance {
  return {
    provider: "open-meteo",
    model,
    retrievedAt: new Date().toISOString(),
    gridElevation: num(raw.elevation),
    resolutionNote:
      "Global weather models describe areas a few kilometres to ~25 km wide, so nearby villages often share one forecast.",
    attribution: ATTRIBUTION,
  };
}

/** Convert an Open-Meteo forecast response into the internal Forecast object. */
export function normaliseForecast(locationId: string, raw: Raw): Forecast {
  const c = (raw.current ?? {}) as Raw;
  const current: CurrentConditions = {
    time: str(c.time) ?? nowMU(),
    temperature: num(c.temperature_2m),
    feelsLike: num(c.apparent_temperature),
    humidity: num(c.relative_humidity_2m),
    precipitation: num(c.precipitation),
    weatherCode: num(c.weather_code),
    cloudCover: num(c.cloud_cover),
    windSpeed: num(c.wind_speed_10m),
    windDirection: num(c.wind_direction_10m),
    windGusts: num(c.wind_gusts_10m),
    isDay: c.is_day === 1 ? true : c.is_day === 0 ? false : null,
    kind: "model",
  };

  const h = raw.hourly as Raw | undefined;
  const times = arr(h, "time");
  const hourly: HourlyPoint[] = times.map((t, i) => ({
    time: String(t),
    temperature: num(arr(h, "temperature_2m")[i]),
    feelsLike: num(arr(h, "apparent_temperature")[i]),
    humidity: num(arr(h, "relative_humidity_2m")[i]),
    rainProbability: num(arr(h, "precipitation_probability")[i]),
    precipitation: num(arr(h, "precipitation")[i]),
    weatherCode: num(arr(h, "weather_code")[i]),
    cloudCover: num(arr(h, "cloud_cover")[i]),
    windSpeed: num(arr(h, "wind_speed_10m")[i]),
    windDirection: num(arr(h, "wind_direction_10m")[i]),
    windGusts: num(arr(h, "wind_gusts_10m")[i]),
    uvIndex: num(arr(h, "uv_index")[i]),
  }));

  const d = raw.daily as Raw | undefined;
  const daily: DailyPoint[] = arr(d, "time").map((t, i) => ({
    date: String(t),
    weatherCode: num(arr(d, "weather_code")[i]),
    tempMax: num(arr(d, "temperature_2m_max")[i]),
    tempMin: num(arr(d, "temperature_2m_min")[i]),
    precipitationSum: num(arr(d, "precipitation_sum")[i]),
    rainProbabilityMax: num(arr(d, "precipitation_probability_max")[i]),
    precipitationHours: num(arr(d, "precipitation_hours")[i]),
    sunrise: str(arr(d, "sunrise")[i]),
    sunset: str(arr(d, "sunset")[i]),
    uvIndexMax: num(arr(d, "uv_index_max")[i]),
    windSpeedMax: num(arr(d, "wind_speed_10m_max")[i]),
    windGustsMax: num(arr(d, "wind_gusts_10m_max")[i]),
    windDirectionDominant: num(arr(d, "wind_direction_10m_dominant")[i]),
  }));

  return { locationId, current, hourly, daily, rainResolution: "hourly", provenance: provenance(raw) };
}

export function normaliseMarine(locationId: string, raw: Raw): MarineForecast {
  const h = raw.hourly as Raw | undefined;
  return {
    locationId,
    hourly: arr(h, "time").map((t, i) => ({
      time: String(t),
      waveHeight: num(arr(h, "wave_height")[i]),
      waveDirection: num(arr(h, "wave_direction")[i]),
      wavePeriod: num(arr(h, "wave_period")[i]),
      swellHeight: num(arr(h, "swell_wave_height")[i]),
      seaTemperature: num(arr(h, "sea_surface_temperature")[i]),
    })),
    provenance: { ...provenance(raw, "marine"), resolutionNote: "Marine models describe open-sea conditions on a coarse grid; conditions inside lagoons and near reefs can be very different." },
  };
}

/** Pick map values from a light multi-location response (one entry per location). */
export function normaliseMapPoint(locationId: string, raw: Raw, now: string = nowMU()): MapPoint {
  const c = (raw.current ?? {}) as Raw;
  const h = raw.hourly as Raw | undefined;
  const times = arr(h, "time").map(String);
  const startHour = `${now.slice(0, 13)}:00`;
  let i0 = times.findIndex((t) => t >= startHour);
  if (i0 < 0) i0 = 0;
  const probs = arr(h, "precipitation_probability").slice(i0, i0 + 3).map(num);
  const rain = arr(h, "precipitation").slice(i0, i0 + 3).map(num);
  const validProbs = probs.filter((x): x is number => x !== null);
  const validRain = rain.filter((x): x is number => x !== null);
  return {
    locationId,
    rainProbNext3h: validProbs.length ? Math.max(...validProbs) : null,
    rainNext3h: validRain.length ? Math.round(validRain.reduce((a, b) => a + b, 0) * 10) / 10 : null,
    temperature: num(c.temperature_2m),
    windSpeed: num(c.wind_speed_10m),
    windDirection: num(c.wind_direction_10m),
    cloudCover: num(c.cloud_cover),
  };
}

async function getJson(url: string, ttl: number): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: ttl },
      headers: { "User-Agent": "LetanMoris/0.1 (non-commercial)" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    throw new ProviderError("open-meteo", `network error: ${(e as Error).message}`);
  }
  if (!res.ok) {
    let reason = "";
    try {
      reason = ((await res.json()) as Raw).reason as string;
    } catch {}
    throw new ProviderError("open-meteo", `HTTP ${res.status} ${reason ?? ""}`.trim(), res.status);
  }
  return res.json();
}

const r4 = (x: number) => x.toFixed(4);

export function forecastUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: r4(lat),
    longitude: r4(lon),
    current: CURRENT_VARS.join(","),
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
    timezone: TZ,
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });
  return `${FORECAST_URL}?${p}`;
}

export const openMeteoProvider: WeatherProvider = {
  id: "open-meteo",
  label: "Open-Meteo (free, non-commercial)",
  paid: false,
  capabilities: { forecast: true, marine: true, ensemble: false, subHourlyRain: false },

  async getForecast(loc: Coordinates) {
    const raw = (await getJson(forecastUrl(loc.lat, loc.lon), FORECAST_TTL)) as Raw;
    return normaliseForecast(loc.id, raw);
  },

  async getMarine(loc: Coordinates) {
    const p = new URLSearchParams({
      latitude: r4(loc.lat),
      longitude: r4(loc.lon),
      hourly: "wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature",
      timezone: TZ,
      forecast_days: "7",
    });
    const raw = (await getJson(`${MARINE_URL}?${p}`, MARINE_TTL)) as Raw;
    return normaliseMarine(loc.id, raw);
  },

  async getMapPoints(locs: Coordinates[]) {
    if (locs.length === 0) return [];
    const p = new URLSearchParams({
      latitude: locs.map((l) => r4(l.lat)).join(","),
      longitude: locs.map((l) => r4(l.lon)).join(","),
      current: "temperature_2m,cloud_cover,wind_speed_10m,wind_direction_10m",
      hourly: "precipitation_probability,precipitation",
      timezone: TZ,
      forecast_days: "1",
      wind_speed_unit: "kmh",
    });
    const raw = await getJson(`${FORECAST_URL}?${p}`, MAP_TTL);
    const list = (Array.isArray(raw) ? raw : [raw]) as Raw[];
    return locs.map((l, i) => normaliseMapPoint(l.id, list[i] ?? {}));
  },
};
