// Builds src/data/cyclone-history.json from NOAA IBTrACS (South Indian basin, public domain).
// Keeps storms since 1980 that came within 1,000 km of Mauritius or Rodrigues.
// Run by .github/workflows/cyclone-history.yml (GitHub has internet access; no cost).
// Usage: node scripts/build-cyclone-history.mjs <path-to-ibtracs.SI.list.csv>
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const file = process.argv[2];
if (!file) throw new Error("Pass the IBTrACS CSV path");
const MU = { lat: -20.25, lon: 57.55 };
const RO = { lat: -19.72, lon: 63.43 };
const NEAR_KM = 1000;
const KT = 1.852;

const toR = (d) => (d * Math.PI) / 180;
const dist = (a, b) => {
  const h = Math.sin(toR(b.lat - a.lat) / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(toR(b.lon - a.lon) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
};

// Minimal CSV line parser (IBTrACS has no embedded commas in quoted fields we use, but handle quotes anyway).
function parse(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

const storms = new Map();
let header = null;
let lineNo = 0;
const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
for await (const line of rl) {
  lineNo++;
  if (!header) {
    header = Object.fromEntries(parse(line).map((h, i) => [h, i]));
    continue;
  }
  if (lineNo === 2) continue; // units row
  const c = parse(line);
  const g = (k) => (header[k] === undefined ? "" : c[header[k]] ?? "");
  const season = Number(g("SEASON"));
  if (!(season >= 1980)) continue;
  if (g("TRACK_TYPE") && g("TRACK_TYPE") !== "main") continue;
  const lat = Number(g("LAT"));
  const lon = Number(g("LON"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  const windKt = [g("REU_WIND"), g("WMO_WIND"), g("USA_WIND")].map(Number).find((x) => Number.isFinite(x) && x > 0);
  const sid = g("SID");
  const s = storms.get(sid) ?? { sid, name: g("NAME"), season, points: [] };
  s.points.push([Math.round(lat * 10) / 10, Math.round(lon * 10) / 10, g("ISO_TIME").replace(" ", "T").slice(0, 16), windKt ? Math.round(windKt * KT) : null]);
  storms.set(sid, s);
}

const out = [];
for (const s of storms.values()) {
  // keep 6-hourly points to stay small
  s.points = s.points.filter((p) => ["00", "06", "12", "18"].includes(p[2].slice(11, 13)));
  let mu = null;
  let ro = null;
  for (const p of s.points) {
    const dm = dist(MU, { lat: p[0], lon: p[1] });
    const dr = dist(RO, { lat: p[0], lon: p[1] });
    if (!mu || dm < mu.km) mu = { km: dm, time: p[2], windKmh: p[3] };
    if (!ro || dr < ro.km) ro = { km: dr, time: p[2], windKmh: p[3] };
  }
  if (!mu || Math.min(mu.km, ro.km) > NEAR_KM) continue;
  const winds = s.points.map((p) => p[3]).filter((x) => x !== null);
  out.push({
    sid: s.sid,
    name: s.name && s.name !== "NOT_NAMED" ? s.name : "Unnamed",
    season: s.season,
    maxWindKmh: winds.length ? Math.max(...winds) : null,
    closest: { mauritius: mu, rodrigues: ro },
    points: s.points,
  });
}
out.sort((a, b) => a.season - b.season || a.sid.localeCompare(b.sid));
writeFileSync(
  "src/data/cyclone-history.json",
  JSON.stringify({
    source: "NOAA IBTrACS v04 (South Indian basin), public domain",
    sourceUrl: "https://www.ncei.noaa.gov/products/international-best-track-archive",
    windNote: "Wind from RSMC La Réunion (10-min) where available, otherwise WMO/US agency values; converted from knots.",
    builtAt: new Date().toISOString(),
    storms: out,
  }),
);
console.log(`Kept ${out.length} storms near Mauritius/Rodrigues`);
