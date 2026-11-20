// Builds src/data/reservoir-rain.json: daily rainfall over each reservoir catchment since 1950
// (ERA5 reanalysis via the Open-Meteo Historical Weather API), plus island evaporation (ET₀).
// Note: Open-Meteo's ERA5-Land has no precipitation, so ERA5 (0.25°) is used throughout.
// Values are tenths of a mm.
// Runs in GitHub Actions. Fetched in 10-year chunks, several places per request, to stay inside the free limits.
// Keep these points in sync with src/data/reservoirs.ts.
import { getWithRetry, sleep } from "./lib/http.mjs";
import { writeFileSync } from "node:fs";
import { validateAnalogues } from "./lib/validate-analogues.mjs";

const POINTS = [
  { id: "mare-aux-vacoas", lat: -20.375, lon: 57.5, built: 1885 },
  { id: "midlands", lat: -20.3, lon: 57.58, built: 2002 },
  { id: "bagatelle", lat: -20.22, lon: 57.52, built: 2017 },
  { id: "la-ferme", lat: -20.28, lon: 57.44, built: 1918 },
  { id: "mare-longue", lat: -20.385, lon: 57.465, built: 1948 },
  { id: "la-nicoliere", lat: -20.13, lon: 57.655, built: 1929 },
  { id: "piton-du-milieu", lat: -20.23, lon: 57.6, built: 1952 },
    { id: "rodrigues", lat: -19.71, lon: 63.42, built: 0, model: "era5" },
];
// Evaporation (FAO reference ET₀) for the island as a whole: one central catchment point, and Rodrigues.
const ET0_POINTS = [
  { id: "mauritius", lat: -20.27, lon: 57.53, model: "era5" },
  { id: "rodrigues", lat: -19.71, lon: 63.42, model: "era5" },
];
// Six inland points spread over Mauritius for an island-average rain series ("Where did the rain fall?").
// Keep in sync with ISLAND_PTS in src/app/api/reservoirs/route.ts.
const ISLAND_PTS = [
  { lat: -20.05, lon: 57.6 },
  { lat: -20.2, lon: 57.7 },
  { lat: -20.42, lon: 57.68 },
  { lat: -20.3, lon: 57.4 },
  { lat: -20.32, lon: 57.53 },
  { lat: -20.17, lon: 57.52 },
];
const START = 1950;
const END = new Date().getUTCFullYear() - 1; // last complete year

const get = (url) => getWithRetry(url);

// Few, larger requests: several places per request (Open-Meteo accepts comma-separated coordinates),
// one decade at a time. ~24 requests in total instead of ~130, so occasional connection timeouts
// on GitHub's network cost minutes, not hours.
async function fetchMulti(points, model, variables, y0, y1) {
  const q = new URLSearchParams({
    latitude: points.map((p) => String(p.lat)).join(","),
    longitude: points.map((p) => String(p.lon)).join(","),
    start_date: `${y0}-01-01`,
    end_date: `${y1}-12-31`,
    daily: variables.join(","),
    models: model,
    timezone: "Indian/Mauritius",
  });
  const j = await get(`https://archive-api.open-meteo.com/v1/archive?${q}`);
  return Array.isArray(j) ? j : [j];
}
const push = (years, t, v) => {
  for (let i = 0; i < t.length; i++) (years[t[i].slice(0, 4)] ??= []).push(v[i] === null || v[i] === undefined ? null : Math.round(v[i] * 10));
};

const MU_POINTS = POINTS.filter((p) => !p.model);
const RO = POINTS.find((p) => p.id === "rodrigues");
const ET_MU = ET0_POINTS.find((p) => p.id === "mauritius");
const muAll = [...MU_POINTS, ...ISLAND_PTS.map((p, i) => ({ id: `island-${i}`, ...p }))];

const out = {};
const islandYears = ISLAND_PTS.map(() => ({}));
const et0 = { mauritius: {}, rodrigues: {} };
for (const p of POINTS) out[p.id] = {};

for (let y0 = START; y0 <= END; y0 += 10) {
  const y1 = Math.min(END, y0 + 9);
  // 1) Rain at the 7 catchments + 6 island points.
  const a = await fetchMulti(muAll, "era5", ["precipitation_sum"], y0, y1);
  muAll.forEach((p, i) => {
    const d = a[i].daily;
    if (p.id.startsWith("island-")) push(islandYears[Number(p.id.slice(7))], d.time, d.precipitation_sum);
    else push(out[p.id], d.time, d.precipitation_sum);
  });
  await sleep(15000);
  // 2) Evaporation for Mauritius, and Rodrigues rain + evaporation.
  const r = await fetchMulti([ET_MU, RO], "era5", ["precipitation_sum", "et0_fao_evapotranspiration"], y0, y1);
  push(et0.mauritius, r[0].daily.time, r[0].daily.et0_fao_evapotranspiration);
  push(out.rodrigues, r[1].daily.time, r[1].daily.precipitation_sum);
  push(et0.rodrigues, r[1].daily.time, r[1].daily.et0_fao_evapotranspiration);
  console.log(`${y0}–${y1} done`);
  await sleep(15000);
}

// Island average (mean of the six points), stored as rain.island.
{
  const island = {};
  for (let y = START; y <= END; y++) {
    const arrs = islandYears.map((s) => s[String(y)]);
    if (arrs.some((x) => !x)) continue;
    island[String(y)] = arrs[0].map((_, d) => {
      const vs = arrs.map((x) => x[d]);
      return vs.some((v) => v === null || v === undefined) ? null : Math.round(vs.reduce((m, n) => m + n, 0) / vs.length);
    });
  }
  out.island = island;
}

const catchIds = POINTS.filter((p) => p.id !== "rodrigues").map((p) => p.id);
const avgSeries = new Map();
for (let y = START; y <= END; y++) {
  const arrs = catchIds.map((id) => out[id]?.[String(y)]);
  if (arrs.some((a) => !a)) continue;
  for (let i = 0; i < arrs[0].length; i++) {
    const vs = arrs.map((a) => a[i]);
    if (vs.some((v) => v === null || v === undefined)) continue;
    const date = new Date(Date.UTC(y, 0, 1 + i)).toISOString().slice(0, 10);
    avgSeries.set(date, vs.reduce((a, b) => a + b, 0) / vs.length / 10);
  }
}
const validation = validateAnalogues(avgSeries, START, END);
console.log("validation", validation);

writeFileSync(
  "src/data/reservoir-rain.json",
  JSON.stringify({
    builtAt: new Date().toISOString(),
    start: START,
    end: END,
    unit: "0.1 mm per day",
    source: "Open-Meteo Historical Weather API, ERA5 reanalysis (Copernicus/ECMWF), CC BY 4.0",
    rain: out,
    et0,
    validation,
  }),
);
console.log("Wrote src/data/reservoir-rain.json");
