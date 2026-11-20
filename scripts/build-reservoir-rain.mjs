// Builds src/data/reservoir-rain.json: daily rainfall over each reservoir catchment since 1950
// (ERA5-Land reanalysis via the Open-Meteo Historical Weather API). Values are tenths of a mm.
// Runs in GitHub Actions. Fetched in 10-year chunks to stay well inside the free limits.
// Keep these points in sync with src/data/reservoirs.ts.
import { writeFileSync } from "node:fs";

const POINTS = [
  { id: "mare-aux-vacoas", lat: -20.375, lon: 57.5, built: 1885 },
  { id: "midlands", lat: -20.3, lon: 57.58, built: 2002 },
  { id: "bagatelle", lat: -20.22, lon: 57.52, built: 2017 },
  { id: "la-ferme", lat: -20.28, lon: 57.44, built: 1918 },
  { id: "mare-longue", lat: -20.385, lon: 57.465, built: 1948 },
  { id: "la-nicoliere", lat: -20.13, lon: 57.655, built: 1929 },
  { id: "piton-du-milieu", lat: -20.23, lon: 57.6, built: 1952 },
  // Rodrigues is too small for the land-only ERA5-Land grid, so it uses ERA5 (0.25°).
  { id: "rodrigues", lat: -19.71, lon: 63.42, built: 0, model: "era5" },
];
const START = 1950;
const END = new Date().getUTCFullYear() - 1; // last complete year

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    console.warn(`HTTP ${res.status}, retrying…`, await res.text().catch(() => ""));
    await sleep(20000 * (i + 1));
  }
  throw new Error(`Failed: ${url}`);
}

const out = {};
for (const p of POINTS) {
  // We keep every year from 1950 (useful island-wide); the app decides which years to compare per reservoir.
  const years = {};
  for (let y0 = START; y0 <= END; y0 += 10) {
    const y1 = Math.min(END, y0 + 9);
    const q = new URLSearchParams({
      latitude: String(p.lat),
      longitude: String(p.lon),
      start_date: `${y0}-01-01`,
      end_date: `${y1}-12-31`,
      daily: "precipitation_sum",
      models: p.model ?? "era5_land",
      timezone: "Indian/Mauritius",
    });
    const j = await get(`https://archive-api.open-meteo.com/v1/archive?${q}`);
    const t = j.daily.time;
    const v = j.daily.precipitation_sum;
    for (let i = 0; i < t.length; i++) {
      const y = t[i].slice(0, 4);
      (years[y] ??= []).push(v[i] === null ? null : Math.round(v[i] * 10));
    }
    console.log(p.id, y0, y1, t.length, "days");
    await sleep(4000);
  }
  out[p.id] = years;
}

writeFileSync(
  "src/data/reservoir-rain.json",
  JSON.stringify({
    builtAt: new Date().toISOString(),
    start: START,
    end: END,
    unit: "0.1 mm per day",
    source: "Open-Meteo Historical Weather API, ERA5-Land reanalysis (ERA5 for Rodrigues), Copernicus/ECMWF, CC BY 4.0",
    rain: out,
  }),
);
console.log("Wrote src/data/reservoir-rain.json");
