// Builds src/data/climate.json: 30-year climate analytics for each region (1995–2024).
// Data: Open-Meteo Historical Weather API (reanalysis — estimated from global models, not station records).
// Runs in GitHub Actions (internet access, free). About 400 API "call units" per place, ~2,800 in total:
// run rarely (yearly) — the normals barely change.
import { writeFileSync } from "node:fs";

const PLACES = [
  { key: "north", label: "North", place: "Grand Baie", lat: -20.013, lon: 57.58 },
  { key: "east", label: "East", place: "Flacq", lat: -20.1897, lon: 57.7144 },
  { key: "south", label: "South", place: "Mahébourg", lat: -20.4081, lon: 57.7 },
  { key: "west", label: "West", place: "Flic en Flac", lat: -20.2742, lon: 57.3711 },
  { key: "plateau", label: "Central Plateau", place: "Curepipe", lat: -20.3163, lon: 57.5259 },
  { key: "portlouis", label: "Port Louis", place: "Port Louis", lat: -20.1609, lon: 57.5012 },
  { key: "rodrigues", label: "Rodrigues", place: "Port Mathurin", lat: -19.6833, lon: 63.4167 },
];
const START = 1995;
const END = 2024;
// Moderate-or-stronger El Niño summers (NOAA Oceanic Niño Index), labelled by the year the summer ends.
const EL_NINO_SUMMERS = [1998, 2003, 2010, 2016, 2024];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    console.warn(`HTTP ${res.status}, retrying…`, await res.text().catch(() => ""));
    await sleep(15000 * (i + 1));
  }
  throw new Error(`Failed: ${url}`);
}

const r1 = (x) => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const mean = (xs) => {
  const v = xs.filter((x) => x !== null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
function slopePerDecade(xs, ys) {
  const pts = xs.map((x, i) => [x, ys[i]]).filter(([, y]) => y !== null && Number.isFinite(y));
  if (pts.length < 10) return null;
  const mx = mean(pts.map((p) => p[0]));
  const my = mean(pts.map((p) => p[1]));
  let num = 0;
  let den = 0;
  for (const [x, y] of pts) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  return den ? r1((num / den) * 10) : null;
}

export function analyse(days) {
  // days: [{date, tmax, tmin, rain, gust, sun}] with sun in hours
  const byMonth = Array.from({ length: 12 }, () => []);
  for (const d of days) byMonth[Number(d.date.slice(5, 7)) - 1].push(d);
  const years = END - START + 1;
  const monthly = byMonth.map((ds, i) => ({
    month: i + 1,
    tmax: r1(mean(ds.map((d) => d.tmax))),
    tmin: r1(mean(ds.map((d) => d.tmin))),
    rainMm: r1(ds.reduce((a, d) => a + (d.rain ?? 0), 0) / years),
    rainyDays: r1(ds.filter((d) => (d.rain ?? 0) >= 1).length / years),
    heavyDays: r1(ds.filter((d) => (d.rain ?? 0) >= 25).length / years),
    sunHours: r1(mean(ds.map((d) => d.sun))),
    gustMax: r1(mean(ds.map((d) => d.gust))),
  }));

  // Day-of-year normals, smoothed over ±7 days. Index 0 = 1 Jan … 365 = 31 Dec (leap day folded in).
  const doy = (date) => {
    const [y, m, dd] = date.split("-").map(Number);
    const t = Date.UTC(2000, m - 1, dd); // leap year reference
    return Math.round((t - Date.UTC(2000, 0, 1)) / 86400000);
  };
  const buckets = Array.from({ length: 366 }, () => []);
  for (const d of days) buckets[doy(d.date)].push(d);
  const daily = [];
  for (let i = 0; i < 366; i++) {
    const win = [];
    for (let k = -7; k <= 7; k++) win.push(...buckets[(i + k + 366) % 366]);
    daily.push([
      r1(mean(win.map((d) => d.tmax))),
      r1(mean(win.map((d) => d.tmin))),
      Math.round((win.filter((d) => (d.rain ?? 0) >= 1).length / Math.max(1, win.length)) * 100),
      r1(mean(win.map((d) => d.rain))),
    ]);
  }

  const pick = (key, cmp) => days.reduce((best, d) => (d[key] !== null && (!best || cmp(d[key], best[key])) ? d : best), null);
  const hot = pick("tmax", (a, b) => a > b);
  const cool = pick("tmin", (a, b) => a < b);
  const wet = pick("rain", (a, b) => a > b);
  const gust = pick("gust", (a, b) => a > b);
  const records = {
    hottestDay: hot && { value: r1(hot.tmax), date: hot.date },
    coolestNight: cool && { value: r1(cool.tmin), date: cool.date },
    wettestDay: wet && { value: r1(wet.rain), date: wet.date },
    strongestGust: gust && { value: r1(gust.gust), date: gust.date },
  };

  const yearsList = Array.from({ length: years }, (_, i) => START + i);
  const annual = yearsList.map((y) => {
    const ds = days.filter((d) => d.date.startsWith(String(y)));
    return {
      year: y,
      tmax: r1(mean(ds.map((d) => d.tmax))),
      tmin: r1(mean(ds.map((d) => d.tmin))),
      rainMm: Math.round(ds.reduce((a, d) => a + (d.rain ?? 0), 0)),
      hotDays: ds.filter((d) => (d.tmax ?? 0) >= 32).length,
    };
  });
  const trend = {
    tmaxPerDecade: slopePerDecade(yearsList, annual.map((a) => a.tmax)),
    tminPerDecade: slopePerDecade(yearsList, annual.map((a) => a.tmin)),
    rainPctPerDecade: (() => {
      const s = slopePerDecade(yearsList, annual.map((a) => a.rainMm));
      const m = mean(annual.map((a) => a.rainMm));
      return s !== null && m ? r1((s / m) * 100) : null;
    })(),
  };

  // Summer (Dec–Feb) rain and heat, labelled by the year the summer ends.
  const summers = [];
  for (let y = START + 1; y <= END; y++) {
    const ds = days.filter((d) => d.date >= `${y - 1}-12-01` && d.date < `${y}-03-01`);
    if (ds.length < 80) continue;
    summers.push({ year: y, rainMm: Math.round(ds.reduce((a, d) => a + (d.rain ?? 0), 0)), tmax: r1(mean(ds.map((d) => d.tmax))) });
  }
  const nino = summers.filter((s) => EL_NINO_SUMMERS.includes(s.year));
  const allRain = mean(summers.map((s) => s.rainMm));
  const elNino = {
    summers: nino.map((s) => s.year),
    rainVsNormalPct: allRain ? r1(((mean(nino.map((s) => s.rainMm)) - allRain) / allRain) * 100) : null,
    tmaxVsNormal: r1(mean(nino.map((s) => s.tmax)) - mean(summers.map((s) => s.tmax))),
  };

  return { monthly, daily, records, annual, trend, elNino };
}

async function main() {
  const out = [];
  for (const p of PLACES) {
    const u = new URL("https://archive-api.open-meteo.com/v1/archive");
    u.search = new URLSearchParams({
      latitude: String(p.lat),
      longitude: String(p.lon),
      start_date: `${START}-01-01`,
      end_date: `${END}-12-31`,
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,sunshine_duration",
      timezone: "Indian/Mauritius",
    }).toString();
    console.log("Fetching", p.label);
    const j = await get(u.toString());
    const d = j.daily;
    const days = d.time.map((date, i) => ({
      date,
      tmax: d.temperature_2m_max[i],
      tmin: d.temperature_2m_min[i],
      rain: d.precipitation_sum[i],
      gust: d.wind_gusts_10m_max?.[i] ?? null,
      sun: d.sunshine_duration?.[i] !== null && d.sunshine_duration?.[i] !== undefined ? d.sunshine_duration[i] / 3600 : null,
    }));
    out.push({ key: p.key, label: p.label, place: p.place, gridElevation: j.elevation ?? null, ...analyse(days) });
    await sleep(20000); // be gentle with the free API
  }
  writeFileSync(
    "src/data/climate.json",
    JSON.stringify({
      period: `${START}–${END}`,
      source: "Open-Meteo Historical Weather API (reanalysis), CC BY 4.0",
      sourceUrl: "https://open-meteo.com/en/docs/historical-weather-api",
      note: "Estimated from global weather models (reanalysis), not weather-station records. Mountains are smoothed and very local downpours may be missed.",
      elNinoSource: "El Niño summers: moderate or stronger episodes in NOAA's Oceanic Niño Index",
      builtAt: new Date().toISOString(),
      regions: out,
    }),
  );
  console.log("climate.json written");
}

if (process.argv[1]?.endsWith("build-climate.mjs") && process.argv[2] !== "--no-run") await main();
