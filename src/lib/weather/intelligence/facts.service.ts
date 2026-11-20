// "Did you know?" facts. Most are generated from our own history files (so they stay up to date);
// hand-written ones come from src/data/facts-curated.ts and only appear once approved.
import { CLIMATE, type ClimateRegion } from "./climate.service";
import { timingSentence } from "./rain-timing";
import { CURATED_FACTS } from "@/data/facts-curated";
import type { HistStorm } from "./cyclone-climate.service";

export interface Fact {
  id: string;
  category: "local" | "record" | "change" | "timing" | "cyclone" | "on-this-day" | "how" | "myth";
  text: string;
  source: string;
  region?: string; // climate region key it is about
  island?: "mauritius" | "rodrigues";
}

interface RainHoursData {
  builtAt: string | null;
  period: string;
  regions: Record<string, { chance: (number | null)[][] }>;
  airports: Record<string, { name: string; island: string; chance: (number | null)[][] }>;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtDate = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return `${dd} ${MONTHS[m - 1]} ${y}`;
};
const yearRain = (r: ClimateRegion) => Math.round(r.monthly.reduce((a, m) => a + (m.rainMm ?? 0), 0));
const SRC_CLIMATE = "Letan Moris climate analysis, Open-Meteo reanalysis";
const islandOf = (key: string) => (key === "rodrigues" ? "rodrigues" : "mauritius");

/** All facts we can state today, from our data. */
export function buildFacts(opts: { today: string; rainHours?: RainHoursData | null; storms?: HistStorm[] }): Fact[] {
  const out: Fact[] = [];
  const regions = CLIMATE.regions;
  const period = CLIMATE.period;
  const month = Number(opts.today.slice(5, 7)) - 1;

  if (regions.length) {
    const mu = regions.filter((r) => r.key !== "rodrigues");
    const sorted = [...mu].sort((a, b) => yearRain(b) - yearRain(a));
    const wet = sorted[0];
    const dry = sorted[sorted.length - 1];
    if (wet && dry && yearRain(dry) > 0) {
      const ratio = Math.round((yearRain(wet) / yearRain(dry)) * 10) / 10;
      out.push({
        id: "contrast-rain",
        category: "local",
        text: `In a typical year the ${wet.label} (${wet.place}) gets about ${ratio}× as much rain as the ${dry.label} (${dry.place}): roughly ${yearRain(wet).toLocaleString()} mm against ${yearRain(dry).toLocaleString()} mm.`,
        source: `${SRC_CLIMATE}, ${period}`,
        island: "mauritius",
      });
    }
    const plateau = regions.find((r) => r.key === "plateau");
    const coast = regions.find((r) => r.key === "north");
    if (plateau && coast && plateau.monthly[6].tmin !== null && coast.monthly[6].tmin !== null) {
      const d = Math.round(((coast.monthly[6].tmin as number) - (plateau.monthly[6].tmin as number)) * 10) / 10;
      if (d >= 1)
        out.push({
          id: "contrast-july-nights",
          category: "local",
          text: `July nights on the central plateau (${plateau.place}) are typically about ${d}°C cooler than on the north coast (${coast.place}).`,
          source: `${SRC_CLIMATE}, ${period}`,
          island: "mauritius",
        });
    }
    for (const r of regions) {
      const isl = islandOf(r.key);
      const ms = r.monthly.filter((m) => m.rainMm !== null);
      if (ms.length === 12) {
        const wetM = ms.reduce((a, b) => ((b.rainMm as number) > (a.rainMm as number) ? b : a));
        const dryM = ms.reduce((a, b) => ((b.rainMm as number) < (a.rainMm as number) ? b : a));
        out.push({
          id: `months-${r.key}`,
          category: "local",
          text: `In ${r.label} (${r.place}), ${MONTHS[wetM.month - 1]} is usually the wettest month (about ${Math.round(wetM.rainMm as number)} mm) and ${MONTHS[dryM.month - 1]} the driest (about ${Math.round(dryM.rainMm as number)} mm).`,
          source: `${SRC_CLIMATE}, ${period}`,
          region: r.key,
          island: isl,
        });
      }
      const thisMonth = r.monthly[month];
      if (thisMonth?.rainyDays !== null && thisMonth?.rainyDays !== undefined) {
        out.push({
          id: `rainy-days-${r.key}-${month}`,
          category: "local",
          text: `${MONTHS[month]} in ${r.label} usually brings about ${Math.round(thisMonth.rainyDays)} rainy days${thisMonth.sunHours !== null ? ` and around ${thisMonth.sunHours} hours of sunshine a day` : ""}.`,
          source: `${SRC_CLIMATE}, ${period}`,
          region: r.key,
          island: isl,
        });
      }
      if (r.records.wettestDay)
        out.push({
          id: `record-wet-${r.key}`,
          category: "record",
          text: `The wettest day in ${r.label} in our ${period} records was ${fmtDate(r.records.wettestDay.date)}, with an estimated ${Math.round(r.records.wettestDay.value)} mm of rain in 24 hours.`,
          source: `${SRC_CLIMATE} (area estimate; rain gauges can record more)`,
          region: r.key,
          island: isl,
        });
      if (r.records.hottestDay)
        out.push({
          id: `record-hot-${r.key}`,
          category: "record",
          text: `The hottest day in ${r.label} in our ${period} records was ${fmtDate(r.records.hottestDay.date)}, at about ${r.records.hottestDay.value}°C.`,
          source: `${SRC_CLIMATE} (area estimate)`,
          region: r.key,
          island: isl,
        });
      const tn = r.trend.tminPerDecade;
      if (tn !== null && Math.abs(tn) >= 0.1)
        out.push({
          id: `trend-nights-${r.key}`,
          category: "change",
          text: `Nights in ${r.label} have ${tn > 0 ? "warmed" : "cooled"} by about ${Math.abs(tn)}°C per decade over ${period} — roughly ${Math.abs(Math.round(tn * 3 * 10) / 10)}°C in 30 years.`,
          source: `${SRC_CLIMATE}, straight-line trend`,
          region: r.key,
          island: isl,
        });
      const rp = r.trend.rainPctPerDecade;
      if (rp !== null && Math.abs(rp) >= 3)
        out.push({
          id: `trend-rain-${r.key}`,
          category: "change",
          text: `Yearly rain in ${r.label} has ${rp < 0 ? "fallen" : "risen"} by about ${Math.abs(rp)}% per decade over ${period}, although it varies a lot from year to year.`,
          source: `${SRC_CLIMATE}, straight-line trend`,
          region: r.key,
          island: isl,
        });
      const en = r.elNino.rainVsNormalPct;
      if (en !== null && Math.abs(en) >= 5 && r.elNino.summers.length)
        out.push({
          id: `elnino-${r.key}`,
          category: "change",
          text: `In past El Niño summers, December–February rain in ${r.label} was about ${Math.abs(en)}% ${en < 0 ? "below" : "above"} the normal rain level of a summer.`,
          source: `${SRC_CLIMATE}; El Niño years from NOAA`,
          region: r.key,
          island: isl,
        });
    }
  }

  // Rain timing for this month.
  const rh = opts.rainHours;
  if (rh?.builtAt) {
    for (const r of regions) {
      const row = rh.regions[r.key]?.chance[month];
      const s = row ? timingSentence(row, r.label, month) : null;
      if (s) out.push({ id: `timing-${r.key}-${month}`, category: "timing", text: s, source: `Open-Meteo reanalysis, ${rh.period}`, region: r.key, island: islandOf(r.key) });
    }
    for (const [id, a] of Object.entries(rh.airports)) {
      const row = a.chance[month];
      const s = row ? timingSentence(row, `${a.name.split(" (")[0]} airport`, month) : null;
      if (s) out.push({ id: `timing-${id}-${month}`, category: "timing", text: `Observed: ${s}`, source: `Airport weather reports (METAR), ${rh.period}`, island: a.island as Fact["island"] });
    }
  }

  // Cyclones: on this day, and this month.
  const storms = opts.storms ?? [];
  if (storms.length) {
    const md = opts.today.slice(5, 10);
    for (const s of storms) {
      for (const isl of ["mauritius", "rodrigues"] as const) {
        const c = s.closest[isl];
        if (!c || c.km > 300) continue;
        const local = new Date(Date.parse(`${c.time}:00Z`) + 4 * 3600_000).toISOString().slice(0, 10);
        if (local.slice(5) !== md) continue;
        out.push({
          id: `otd-${s.sid}-${isl}`,
          category: "on-this-day",
          text: `On this day in ${local.slice(0, 4)}, ${s.name === "Unnamed" ? "an unnamed tropical system" : s.name} passed about ${Math.round(c.km / 10) * 10} km from ${isl === "rodrigues" ? "Rodrigues" : "Mauritius"}${s.maxWindKmh ? `, with peak winds around ${s.maxWindKmh} km/h` : ""}.`,
          source: "NOAA IBTrACS storm tracks",
          island: isl,
        });
      }
    }
    for (const isl of ["mauritius", "rodrigues"] as const) {
      const seasons = new Set(storms.map((s) => s.season));
      const inMonth = storms.filter((s) => {
        const c = s.closest[isl];
        return c && c.km <= 300 && Number(c.time.slice(5, 7)) === month + 1;
      }).length;
      if (seasons.size >= 10 && inMonth > 0)
        out.push({
          id: `cyclone-month-${isl}-${month}`,
          category: "cyclone",
          text: `Since ${Math.min(...seasons)}, ${inMonth} tropical storm${inMonth === 1 ? "" : "s"} passed within 300 km of ${isl === "rodrigues" ? "Rodrigues" : "Mauritius"} in ${MONTHS[month]} — about one every ${Math.max(1, Math.round(seasons.size / inMonth))} years.`,
          source: "NOAA IBTrACS storm tracks",
          island: isl,
        });
    }
  }

  for (const c of CURATED_FACTS) if (c.approved) out.push({ id: `c-${c.id}`, category: c.category, text: c.text, source: c.source, island: c.island });
  return out;
}

/** Facts for a place, best first: on-this-day, then a daily rotation that favours the place's region. */
export function factsFor(all: Fact[], opts: { today: string; region: string; island: "mauritius" | "rodrigues" }): Fact[] {
  const mine = all.filter((f) => (!f.island || f.island === opts.island) && (!f.region || f.region === opts.region || f.category === "local" || f.category === "change"));
  const otd = mine.filter((f) => f.category === "on-this-day");
  const rest = mine.filter((f) => f.category !== "on-this-day");
  // Rotate by day so everyone sees the same "fact of the day" for a place, and it changes daily.
  const day = Math.floor(Date.parse(`${opts.today}T00:00:00Z`) / 86_400_000);
  const local = rest.filter((f) => f.region === opts.region);
  const general = rest.filter((f) => f.region !== opts.region);
  const order: Fact[] = [];
  const rot = <T,>(xs: T[], k: number) => (xs.length ? [...xs.slice(k % xs.length), ...xs.slice(0, k % xs.length)] : xs);
  const a = rot(local, day);
  const b = rot(general, day * 7);
  while (a.length || b.length) {
    if (a.length) order.push(a.shift()!);
    if (b.length) order.push(b.shift()!);
  }
  return [...otd, ...order];
}

/** Words the Facebook checker blocks; such facts are not used in posts. */
export const postable = (f: Fact) => !/\b(official|warning|safe)\b/i.test(f.text);
