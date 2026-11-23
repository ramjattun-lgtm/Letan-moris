// Builds src/data/accuracy.json: "How right were the forecasts?" over the last 30 days.
//  • Regions: the forecast issued the day before (Open-Meteo Previous Runs API, "previous_day1")
//    compared with the model's latest estimate of what happened. Model-vs-model — not rain gauges.
//  • Airports: the same day-before forecast compared with REAL observations from METAR reports
//    (Iowa Environmental Mesonet archive) at Plaisance (FIMP) and Plaine Corail (FIMR).
// Runs daily in GitHub Actions. Keep the places in sync with scripts/build-climate.mjs.
import { getWithRetry, sleep } from "./lib/http.mjs";
import { writeFileSync } from "node:fs";
import { score, SAID_DRY_MM, SAID_LIKELY_MM } from "./lib/accuracy-score.mjs";

const DAYS = 30;
const REGIONS = [
  { key: "north", name: "North", lat: -20.013, lon: 57.58 },
  { key: "east", name: "East", lat: -20.1897, lon: 57.7144 },
  { key: "south", name: "South", lat: -20.4081, lon: 57.7 },
  { key: "west", name: "West", lat: -20.2742, lon: 57.3711 },
  { key: "plateau", name: "Central Plateau", lat: -20.3163, lon: 57.5259 },
  { key: "portlouis", name: "Port Louis", lat: -20.1609, lon: 57.5012 },
  { key: "rodrigues", name: "Rodrigues", lat: -19.6833, lon: 63.4167 },
];
const AIRPORTS = [
  { key: "FIMP", name: "Plaisance airport", region: "south", lat: -20.4302, lon: 57.6836 },
  { key: "FIMR", name: "Plaine Corail airport (Rodrigues)", region: "rodrigues", lat: -19.7577, lon: 63.361 },
];
const MODEL_WET_MM = 1; // a "rain day" in the model's own estimate: at least 1 mm
const OBS_WET_REPORTS = 2; // a "rain day" at an airport: rain in at least 2 reports
const RAIN_CODE = /(^|\s|[+-])(RA|DZ|SHRA|TSRA|SH|TS)/; // ignores "VC" (rain only in the vicinity)

const pts = [...REGIONS, ...AIRPORTS];
const q = new URLSearchParams({
  latitude: pts.map((p) => p.lat).join(","),
  longitude: pts.map((p) => p.lon).join(","),
  hourly: "temperature_2m,temperature_2m_previous_day1,precipitation,precipitation_previous_day1",
  past_days: String(DAYS + 1),
  forecast_days: "1",
  timezone: "Indian/Mauritius",
});
const raw = await getWithRetry(`https://previous-runs-api.open-meteo.com/v1/forecast?${q}`);
const list = Array.isArray(raw) ? raw : [raw];

const today = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
const from = new Date(Date.now() + 4 * 3600e3 - DAYS * 86400e3).toISOString().slice(0, 10);
const inWindow = (t) => t.slice(0, 10) >= from && t.slice(0, 10) < today;

/** Per-day totals and per-hour temperatures for one point. */
function series(j) {
  const h = j.hourly;
  const days = {};
  const hours = {};
  for (let i = 0; i < h.time.length; i++) {
    const t = h.time[i];
    if (!inWindow(t)) continue;
    const d = (days[t.slice(0, 10)] ??= { fc: 0, an: 0, ok: true });
    const fc = h.precipitation_previous_day1[i];
    const an = h.precipitation[i];
    if (fc === null || an === null) d.ok = false;
    else {
      d.fc += fc;
      d.an += an;
    }
    hours[t.slice(0, 13)] = { fcT: h.temperature_2m_previous_day1[i], anT: h.temperature_2m[i] };
  }
  return { days, hours };
}

const mae = (xs) => (xs.length ? Math.round((xs.reduce((s, x) => s + Math.abs(x), 0) / xs.length) * 10) / 10 : null);

const regions = {};
REGIONS.forEach((r, i) => {
  const { days, hours } = series(list[i]);
  const pairs = Object.values(days).filter((d) => d.ok).map((d) => ({ fcMm: d.fc, obsWet: d.an >= MODEL_WET_MM }));
  const temps = Object.values(hours).filter((x) => x.fcT !== null && x.anT !== null).map((x) => x.fcT - x.anT);
  regions[r.key] = { name: r.name, rain: score(pairs), tempMaeC: mae(temps) };
});

const airports = {};
for (const [k, a] of AIRPORTS.entries()) {
  const { days, hours } = series(list[REGIONS.length + k]);
  try {
    const p = new URLSearchParams({ station: a.key, data: "tmpc", tz: "Indian/Mauritius", format: "onlycomma", missing: "M", sts: `${from}T00:00Z`, ets: `${today}T00:00Z` });
    p.append("data", "wxcodes");
    const text = await getWithRetry(`https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?${p}`, { asText: true });
    const lines = text.split(/\r?\n/);
    const head = lines.findIndex((l) => l.startsWith("station,"));
    const cols = (lines[head] ?? "").split(",");
    const iv = cols.indexOf("valid");
    const it = cols.indexOf("tmpc");
    const iw = cols.indexOf("wxcodes");
    const wetReports = {};
    const reportsPerDay = {};
    const obsT = {};
    let reports = 0;
    for (const l of lines.slice(head + 1)) {
      const c = l.split(",");
      const v = c[iv];
      if (!v || v.length < 13) continue;
      const local = v.replace(" ", "T");
      if (!inWindow(local)) continue;
      reports++;
      const d = local.slice(0, 10);
      reportsPerDay[d] = (reportsPerDay[d] ?? 0) + 1;
      if (c[iw] && c[iw] !== "M" && RAIN_CODE.test(c[iw])) wetReports[d] = (wetReports[d] ?? 0) + 1;
      const tc = Number(c[it]);
      if (c[it] !== "M" && Number.isFinite(tc)) (obsT[local.slice(0, 13)] ??= []).push(tc);
    }
    // Only days with a reasonable number of reports (the airports report every 30–60 min).
    const pairs = Object.entries(days)
      .filter(([d, x]) => x.ok && (reportsPerDay[d] ?? 0) >= 12)
      .map(([d, x]) => ({ fcMm: x.fc, obsWet: (wetReports[d] ?? 0) >= OBS_WET_REPORTS }));
    const temps = Object.entries(hours)
      .filter(([h, x]) => x.fcT !== null && obsT[h]?.length)
      .map(([h, x]) => x.fcT - obsT[h].reduce((s, y) => s + y, 0) / obsT[h].length);
    airports[a.key] = { name: a.name, region: a.region, reports, rain: score(pairs), tempMaeC: mae(temps) };
    console.log(a.key, reports, "reports");
  } catch (e) {
    console.warn(`Airport ${a.key} skipped:`, e.message);
  }
  await sleep(3000);
}

writeFileSync(
  "src/data/accuracy.json",
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      from,
      to: today,
      days: DAYS,
      method: {
        forecast: `The forecast issued the day before (Open-Meteo Previous Runs API), sorted like the app's wording: under ${SAID_DRY_MM} mm = dry, ${SAID_LIKELY_MM} mm or more = rain likely, in between = showers possible.`,
        regions: `Compared with the model's latest estimate of what happened. A rain day = at least ${MODEL_WET_MM} mm. Model vs model — not rain gauges.`,
        airports: `Compared with real METAR weather reports (Iowa Environmental Mesonet). A rain day = rain noted in at least ${OBS_WET_REPORTS} reports. Airport reports describe one spot every 30–60 minutes; the forecast covers a ~10–25 km area.`,
      },
      regions,
      airports,
    },
    null,
    1,
  ),
);
console.log("accuracy.json written", JSON.stringify(regions).slice(0, 300));
