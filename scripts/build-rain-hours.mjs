// Builds src/data/rain-hours.json: "When does it usually rain here?" — chance of rain by hour of day
// for each month, for the 7 climate regions, plus OBSERVED rain at the two airports.
//  • Regions: Open-Meteo Historical Weather API (ERA5 reanalysis, hourly), 2005–2024. Model-based.
//  • Airports: METAR weather reports (rain, drizzle, showers, thunderstorms) from the Iowa
//    Environmental Mesonet archive, FIMP (Plaisance) and FIMR (Plaine Corail, Rodrigues). Observed.
// Runs in GitHub Actions. Keep the places in sync with scripts/build-climate.mjs.
import { writeFileSync } from "node:fs";

const PLACES = [
  { key: "north", lat: -20.013, lon: 57.58 },
  { key: "east", lat: -20.1897, lon: 57.7144 },
  { key: "south", lat: -20.4081, lon: 57.7 },
  { key: "west", lat: -20.2742, lon: 57.3711 },
  { key: "plateau", lat: -20.3163, lon: 57.5259 },
  { key: "portlouis", lat: -20.1609, lon: 57.5012 },
  { key: "rodrigues", lat: -19.6833, lon: 63.4167 },
];
const AIRPORTS = [
  { id: "FIMP", name: "Plaisance (SSR International Airport)", island: "mauritius" },
  { id: "FIMR", name: "Plaine Corail (Rodrigues)", island: "rodrigues" },
];
const START = 2005;
const END = 2024;
const WET_MM = 0.2; // an hour counts as "rainy" with at least 0.2 mm

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, asText = false) {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return asText ? res.text() : res.json();
      console.warn(`HTTP ${res.status}, retrying…`);
    } catch (e) {
      console.warn("fetch failed", e.message);
    }
    await sleep(20000 * (i + 1));
  }
  throw new Error(`Failed: ${url}`);
}

const grid = () => Array.from({ length: 12 }, () => Array.from({ length: 24 }, () => ({ wet: 0, n: 0, mm: 0 })));
const finish = (g) => ({
  chance: g.map((row) => row.map((c) => (c.n ? Math.round((c.wet / c.n) * 100) : null))),
  meanMm: g.map((row) => row.map((c) => (c.n ? Math.round((c.mm / c.n) * 100) / 100 : null))),
});

const regions = {};
for (const p of PLACES) {
  const g = grid();
  for (let y0 = START; y0 <= END; y0 += 5) {
    const y1 = Math.min(END, y0 + 4);
    const q = new URLSearchParams({
      latitude: String(p.lat),
      longitude: String(p.lon),
      start_date: `${y0}-01-01`,
      end_date: `${y1}-12-31`,
      hourly: "precipitation",
      timezone: "Indian/Mauritius",
    });
    const j = await get(`https://archive-api.open-meteo.com/v1/archive?${q}`);
    const t = j.hourly.time;
    const v = j.hourly.precipitation;
    for (let i = 0; i < t.length; i++) {
      if (v[i] === null) continue;
      const c = g[Number(t[i].slice(5, 7)) - 1][Number(t[i].slice(11, 13))];
      c.n++;
      c.mm += v[i];
      if (v[i] >= WET_MM) c.wet++;
    }
    console.log(p.key, y0, y1);
    await sleep(8000);
  }
  regions[p.key] = finish(g);
}

// Observed: share of METAR reports mentioning rain, drizzle, showers or thunderstorms, by local hour.
const RAIN_CODE = /(^|\s|[+-]|VC)(RA|DZ|SHRA|TSRA|SH|TS)/;
const airports = {};
for (const a of AIRPORTS) {
  const g = grid();
  let reports = 0;
  try {
    for (let y = START; y <= END; y++) {
      const q = new URLSearchParams({
        station: a.id,
        data: "wxcodes",
        sts: `${y}-01-01T00:00Z`,
        ets: `${y + 1}-01-01T00:00Z`,
        tz: "Indian/Mauritius",
        format: "onlycomma",
        missing: "M",
      });
      const text = await get(`https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?${q}`, true);
      const lines = text.split(/\r?\n/);
      const head = lines.findIndex((l) => l.startsWith("station,"));
      const cols = (lines[head] ?? "").split(",");
      const iv = cols.indexOf("valid");
      const iw = cols.indexOf("wxcodes");
      for (const l of lines.slice(head + 1)) {
        const c = l.split(",");
        const valid = c[iv];
        if (!valid || valid.length < 13) continue;
        const cell = g[Number(valid.slice(5, 7)) - 1][Number(valid.slice(11, 13))];
        const wx = c[iw] && c[iw] !== "M" ? c[iw] : "";
        cell.n++;
        reports++;
        if (RAIN_CODE.test(wx)) cell.wet++;
      }
      console.log(a.id, y, "ok");
      await sleep(5000);
    }
    const f = finish(g);
    airports[a.id] = { name: a.name, island: a.island, reports, chance: f.chance };
  } catch (e) {
    console.warn(`Airport ${a.id} skipped:`, e.message);
  }
}

writeFileSync(
  "src/data/rain-hours.json",
  JSON.stringify({
    builtAt: new Date().toISOString(),
    period: `${START}–${END}`,
    wetMm: WET_MM,
    regionSource: "Open-Meteo Historical Weather API (ERA5 reanalysis, hourly), CC BY 4.0",
    airportSource: "METAR reports via Iowa Environmental Mesonet (IEM), Iowa State University",
    regions,
    airports,
  }),
);
console.log("Wrote src/data/rain-hours.json");
