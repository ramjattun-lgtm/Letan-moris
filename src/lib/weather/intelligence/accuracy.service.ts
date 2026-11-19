import type { Maybe } from "../types";

// "How did the forecast do?" for the last 3 hours.
// 1) Yesterday's forecast (Open-Meteo Previous Runs, day-1 lead time) vs the latest model estimate.
// 2) Where an airport is near, yesterday's forecast vs REAL airport observations (METAR).

export const RAIN_MM = 0.2;

export interface HourCompare {
  time: string;
  forecastMm: Maybe<number>;
  actualMm: Maybe<number>;
  forecastTemp: Maybe<number>;
  actualTemp: Maybe<number>;
}

export interface AccuracySummary {
  hours: number;
  rainMatchPct: Maybe<number>;
  tempErrAvg: Maybe<number>;
  rainForecast: boolean;
  rainHappened: boolean;
  verdict: string;
}

export function summariseAccuracy(rows: HourCompare[]): AccuracySummary | null {
  const rain = rows.filter((r) => r.forecastMm !== null && r.actualMm !== null);
  const temp = rows.filter((r) => r.forecastTemp !== null && r.actualTemp !== null);
  if (!rain.length && !temp.length) return null;
  const matches = rain.filter((r) => r.forecastMm! >= RAIN_MM === r.actualMm! >= RAIN_MM).length;
  const rainMatchPct = rain.length ? Math.round((matches / rain.length) * 100) : null;
  const tempErrAvg = temp.length ? Math.round((temp.reduce((a, r) => a + Math.abs(r.forecastTemp! - r.actualTemp!), 0) / temp.length) * 10) / 10 : null;
  const rainForecast = rain.some((r) => r.forecastMm! >= RAIN_MM);
  const rainHappened = rain.some((r) => r.actualMm! >= RAIN_MM);
  let verdict = "";
  if (rainMatchPct !== null) {
    if (rainForecast && rainHappened) verdict = "Rain was forecast, and it rained.";
    else if (!rainForecast && !rainHappened) verdict = "Dry was forecast, and it stayed dry.";
    else if (rainForecast && !rainHappened) verdict = "Rain was forecast, but it stayed mostly dry.";
    else verdict = "It rained, but the forecast expected dry weather.";
  }
  return { hours: Math.max(rain.length, temp.length), rainMatchPct, tempErrAvg, rainForecast, rainHappened, verdict };
}

// ——— Airport observations (METAR) ———

export const AIRPORTS = [
  { icao: "FIMP", name: "SSR International Airport (Plaisance)", lat: -20.4302, lon: 57.6836 },
  { icao: "FIMR", name: "Plaine Corail Airport (Rodrigues)", lat: -19.7577, lon: 63.361 },
];

export interface MetarObs {
  time: string; // ISO UTC
  temp: Maybe<number>;
  rain: boolean;
  raw: string;
}

/** Parse aviationweather.gov METAR JSON. Rain = precipitation codes in the present weather group. */
export function parseMetar(raw: unknown): MetarObs[] {
  const list = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const out: MetarObs[] = [];
  for (const m of list) {
    const t = typeof m.obsTime === "number" ? new Date(m.obsTime * 1000).toISOString() : typeof m.reportTime === "string" ? new Date(m.reportTime).toISOString() : null;
    if (!t) continue;
    const wx = typeof m.wxString === "string" ? m.wxString : "";
    const rawOb = typeof m.rawOb === "string" ? m.rawOb : "";
    out.push({ time: t, temp: typeof m.temp === "number" ? m.temp : null, rain: /(RA|DZ|SH|TS)/.test(wx) || /\s[-+]?(SH|TS)?(RA|DZ)\b/.test(rawOb), raw: rawOb });
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}
