import { currentLang } from "@/lib/i18n";
import climate from "@/data/climate.json";
import type { Locality } from "@/data/localities";
import type { Maybe } from "../types";

// 30-year climate analytics (reanalysis, 1995–2024), built by scripts/build-climate.mjs.

export interface MonthStat {
  month: number;
  tmax: Maybe<number>;
  tmin: Maybe<number>;
  rainMm: Maybe<number>;
  rainyDays: Maybe<number>;
  heavyDays: Maybe<number>;
  sunHours: Maybe<number>;
  gustMax: Maybe<number>;
}
export interface Rec {
  value: number;
  date: string;
}
export interface ClimateRegion {
  key: string;
  label: string;
  place: string;
  gridElevation: Maybe<number>;
  monthly: MonthStat[];
  /** 366 entries: [tmax, tmin, rainChance %, mean rain mm] */
  daily: [Maybe<number>, Maybe<number>, number, Maybe<number>][];
  records: { hottestDay: Rec | null; coolestNight: Rec | null; wettestDay: Rec | null; strongestGust: Rec | null };
  annual: { year: number; tmax: Maybe<number>; tmin: Maybe<number>; rainMm: number; hotDays: number }[];
  trend: { tmaxPerDecade: Maybe<number>; tminPerDecade: Maybe<number>; rainPctPerDecade: Maybe<number> };
  elNino: { summers: number[]; rainVsNormalPct: Maybe<number>; tmaxVsNormal: Maybe<number> };
  validation?: { days: number; skillVsFlatPct: number; bins: { from: number; to: number; said: number | null; rained: number | null; days: number }[] } | null;
}

export const CLIMATE = climate as unknown as {
  period: string;
  source: string;
  sourceUrl: string;
  note: string;
  elNinoSource: string;
  builtAt: string | null;
  regions: ClimateRegion[];
};

export const climateReady = () => CLIMATE.regions.length > 0;

/** Which climate region represents a locality. */
export function climateKeyFor(l: Pick<Locality, "id" | "region" | "island" | "district">): string {
  if (l.island === "rodrigues") return "rodrigues";
  if (l.district === "Port Louis") return "portlouis";
  switch (l.region) {
    case "north":
      return "north";
    case "east":
      return "east";
    case "south":
      return "south";
    case "west":
      return "west";
    default:
      return "plateau";
  }
}

export function region(key: string): ClimateRegion | undefined {
  return CLIMATE.regions.find((r) => r.key === key);
}

/** Day-of-year index (leap-year reference, like the builder). */
export function doyIndex(date: string): number {
  const [, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(2000, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000);
}

export function normalFor(key: string, date: string) {
  const r = region(key);
  const row = r?.daily[doyIndex(date)];
  if (!row) return null;
  return { tmax: row[0], tmin: row[1], rainChance: row[2], meanRain: row[3] };
}

/** "+2°C warmer than normal" style comparison; null if no data. */
export function vsNormal(forecastTmax: Maybe<number>, normalTmax: Maybe<number>) {
  if (forecastTmax === null || normalTmax === null) return null;
  const diff = Math.round((forecastTmax - normalTmax) * 10) / 10;
  const label = Math.abs(diff) < 1 ? "Near normal temperature" : diff > 0 ? `${diff.toFixed(1)}°C warmer than the normal temperature` : `${Math.abs(diff).toFixed(1)}°C cooler than the normal temperature`;
  return { diff, label };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_MFE = ["Zan", "Fev", "Mar", "Avr", "Me", "Zin", "Zilye", "Out", "Sept", "Okt", "Nov", "Des"];
/** Short month name in the current language (English on the server and in Facebook posts). */
export const monthName = (m: number) => (currentLang() === "fr" ? MONTHS_FR : currentLang() === "mfe" ? MONTHS_MFE : MONTHS)[m - 1];

/** Best / worst months for planning. */
export function bestMonths(r: ClimateRegion) {
  const by = <K extends keyof MonthStat>(k: K, dir: 1 | -1) =>
    [...r.monthly].filter((m) => m[k] !== null).sort((a, b) => dir * ((a[k] as number) - (b[k] as number)))[0];
  return {
    driest: by("rainyDays", 1),
    wettest: by("rainyDays", -1),
    sunniest: by("sunHours", -1),
    coolest: by("tmax", 1),
    hottest: by("tmax", -1),
  };
}
