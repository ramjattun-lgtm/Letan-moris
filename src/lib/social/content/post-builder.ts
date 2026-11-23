import type { Forecast, HourlyPoint, Maybe } from "@/lib/weather/types";
import { addDays, hhmm, hourOf, nowMU, weekday } from "@/lib/time";
import { findRainPeriods } from "@/lib/weather/intelligence/rainfall-intelligence.service";
import { confidenceForDry, confidenceForRain, decayWithLeadTime, type Confidence } from "@/lib/weather/intelligence/confidence.service";
import { describeCode, type IconKind } from "@/lib/weather/weather-codes";
import { assessHeavyRain, type RainRisk } from "@/lib/weather/intelligence/heavy-rain.service";

// Builds Facebook posts from the SAME forecast engine the website uses.
// Posts never compute weather on their own and never contain invented values.

export type Slot = "morning" | "midday" | "evening" | "weekend";
export const SLOTS: Slot[] = ["morning", "midday", "evening", "weekend"];

export const SITE_URL = process.env.SITE_URL ?? "https://letan-moris.vercel.app";

/** Representative places per region (one forecast each). */
export const POST_REGIONS = [
  { key: "north", label: "North", place: "Grand Baie", locId: "grand-baie" },
  { key: "east", label: "East", place: "Flacq", locId: "centre-de-flacq" },
  { key: "south", label: "South", place: "Mahébourg", locId: "mahebourg" },
  { key: "west", label: "West", place: "Flic en Flac", locId: "flic-en-flac" },
  { key: "plateau", label: "Central Plateau", place: "Curepipe", locId: "curepipe" },
  { key: "rodrigues", label: "Rodrigues", place: "Port Mathurin", locId: "port-mathurin" },
] as const;

export interface RegionSummary {
  key: string;
  label: string;
  place: string;
  tempMin: Maybe<number>;
  tempMax: Maybe<number>;
  maxRainProb: Maybe<number>;
  rainMm: Maybe<number>;
  rainWindows: string[]; // e.g. ["14:00–17:00"]
  maxGust: Maybe<number>;
  uvMax: Maybe<number>;
  icon: IconKind;
  /** Independent heavy-rain risk for the next 24 hours from the time the post is made. */
  heavyRisk: RainRisk | null;
  phrase: string;
  confidence: Confidence;
}

export interface DaySection {
  date: string;
  label: string; // "Today", "Saturday 22 Nov"
  from: number;
  to: number;
  regions: RegionSummary[];
}

export interface PostSnapshot {
  slot: Slot;
  title: string; // first line, unique per slot+date (used to detect duplicates)
  sections: DaySection[];
  headline: string;
  tips: string[];
  confidence: Confidence;
  issuedAtMU: string; // "YYYY-MM-DDTHH:mm"
  oldestDataUtc: string; // oldest provider response used
  text: string;
}

const SLOT_TITLE: Record<Slot, string> = {
  morning: "Today's weather",
  midday: "This afternoon & evening",
  evening: "Tomorrow's weather",
  weekend: "Weekend weather",
};

const round = (x: Maybe<number>) => (x === null ? null : Math.round(x));
const nums = (xs: Maybe<number>[]) => xs.filter((x): x is number => x !== null);

const ICON_RANK: IconKind[] = ["clear", "partly", "cloudy", "fog", "drizzle", "showers", "rain", "storm"];

export function rainPhrase(maxProb: Maybe<number>, mm: Maybe<number>, windows: string[]): string {
  if (maxProb === null) return "rain forecast not available";
  if (windows.length) return `rain likely about ${windows.slice(0, 2).join(" and ")} (up to ${maxProb}%)`;
  if (maxProb < 30 && (mm ?? 0) < 0.5) return `mostly dry (rain chance up to ${maxProb}%)`;
  return `a few showers possible (up to ${maxProb}%)`;
}

export function summariseRegion(
  r: (typeof POST_REGIONS)[number],
  f: Forecast,
  date: string,
  from: number,
  to: number,
  daysAhead: number,
  now: string = nowMU(),
): RegionSummary {
  const hs: HourlyPoint[] = f.hourly.filter((h) => h.time.startsWith(date) && hourOf(h.time) >= from && hourOf(h.time) < to);
  const temps = nums(hs.map((h) => h.temperature));
  const probs = nums(hs.map((h) => h.rainProbability));
  const mm = nums(hs.map((h) => h.precipitation));
  const gusts = nums(hs.map((h) => h.windGusts));
  const uv = nums(hs.map((h) => h.uvIndex));
  const complete = hs.length > 0 && probs.length === hs.length && temps.length === hs.length;
  const periods = complete ? findRainPeriods(hs) : [];
  const windows = periods.map((p) => `${hhmm(p.start)}–${hhmm(p.end)}`);
  const maxRainProb = complete ? Math.max(...probs) : null;
  const rainMm = mm.length ? Math.round(mm.reduce((a, b) => a + b, 0) * 10) / 10 : null;
  let icon: IconKind = "unknown";
  for (const h of hs) {
    const k = describeCode(h.weatherCode).icon;
    if (ICON_RANK.indexOf(k) > ICON_RANK.indexOf(icon)) icon = k;
  }
  // Use the most common daytime sky when rain is unlikely, so one cloudy hour doesn't dominate.
  if (!windows.length && hs.length) {
    const counts = new Map<IconKind, number>();
    hs.forEach((h) => {
      const k = describeCode(h.weatherCode).icon;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    icon = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const base = windows.length ? confidenceForRain(maxRainProb) : confidenceForDry(maxRainProb);
  return {
    key: r.key,
    label: r.label,
    place: r.place,
    tempMin: complete ? round(Math.min(...temps)) : null,
    tempMax: complete ? round(Math.max(...temps)) : null,
    maxRainProb,
    rainMm,
    rainWindows: windows,
    maxGust: gusts.length ? round(Math.max(...gusts)) : null,
    uvMax: uv.length ? Math.max(...uv) : null,
    icon,
    heavyRisk: assessHeavyRain(f.hourly.map((h) => ({ time: h.time, mm: h.precipitation })), now).level,
    phrase: complete ? rainPhrase(maxRainProb, rainMm, windows) : "forecast not available",
    confidence: decayWithLeadTime(base, daysAhead),
  };
}

/** Which day(s) and hours each slot covers, in Mauritius time. */
export function slotPlan(slot: Slot, now: string = nowMU()): { date: string; from: number; to: number; daysAhead: number }[] {
  const today = now.slice(0, 10);
  if (slot === "morning") return [{ date: today, from: 6, to: 21, daysAhead: 0 }];
  if (slot === "midday") return [{ date: today, from: Math.max(13, hourOf(now) + 1), to: 22, daysAhead: 0 }];
  if (slot === "evening") return [{ date: addDays(today, 1), from: 6, to: 21, daysAhead: 1 }];
  // weekend: the coming Saturday and Sunday (if today is Saturday, today and tomorrow)
  const wd = weekday(today);
  const toSat = wd === 6 ? 0 : wd === 0 ? 6 : 6 - wd;
  const sat = addDays(today, toSat);
  return [
    { date: sat, from: 7, to: 18, daysAhead: toSat },
    { date: addDays(sat, 1), from: 7, to: 18, daysAhead: toSat + 1 },
  ];
}

const MU_KEYS = ["north", "east", "south", "west", "plateau"];

export function buildHeadline(section: DaySection): string {
  const mu = section.regions.filter((r) => MU_KEYS.includes(r.key));
  const wet = mu.filter((r) => r.rainWindows.length > 0);
  const unknown = mu.filter((r) => r.maxRainProb === null);
  if (unknown.length === mu.length) return "Forecast data is incomplete for Mauritius.";
  if (wet.length === 0) {
    const anyShowers = mu.some((r) => (r.maxRainProb ?? 0) >= 30);
    return anyShowers ? "Mostly dry across Mauritius, with a few passing showers possible." : "A mostly dry day across Mauritius.";
  }
  if (wet.length === mu.length) return "Rain is likely across most of Mauritius at times.";
  const names = wet.map((r) => r.label);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Showers likely in the ${list}; drier elsewhere.`;
}

function regionLine(r: RegionSummary): string {
  const t = r.tempMin === null || r.tempMax === null ? "temperatures n/a" : `${r.tempMin}–${r.tempMax}°C`;
  return `📍 ${r.label} (${r.place}): ${t} · ${r.phrase}`;
}

export function tipsFor(sections: DaySection[]): string[] {
  const tips: string[] = [];
  const all = sections.flatMap((s) => s.regions);
  const regs = sections[0]?.regions ?? [];
  const high = regs.filter((r) => r.heavyRisk === "high").map((r) => r.label);
  const mod = regs.filter((r) => r.heavyRisk === "moderate").map((r) => r.label);
  if (high.length || mod.length) {
    const parts = [high.length ? `High in ${high.join(", ")}` : "", mod.length ? `Moderate in ${mod.join(", ")}` : ""].filter(Boolean);
    tips.push(`🌧️ Heavy-rain risk, next 24 hours: ${parts.join("; ")}. Avoid rivers and flood-prone spots; never drive through moving water. Follow MMS.`);
  }
  const uv = Math.max(0, ...nums(all.map((r) => r.uvMax)));
  if (uv >= 8) tips.push(`☀️ UV very high (up to ${Math.round(uv)}) around midday — sun protection essential.`);
  const gust = Math.max(0, ...nums(all.map((r) => r.maxGust)));
  if (gust >= 50) tips.push(`💨 Gusty at times, up to about ${gust} km/h in exposed areas.`);
  return tips;
}

const overallConfidence = (rs: RegionSummary[]): Confidence =>
  rs.some((r) => r.confidence === "low") ? "low" : rs.some((r) => r.confidence === "medium") ? "medium" : "high";

const CONF_WORD: Record<Confidence, string> = { high: "High", medium: "Medium", low: "Low" };

export const DISCLAIMER = "Independent forecast, not an official warning. Official warnings: MMS (metservice.intnet.mu).";
export const ATTRIBUTION = "Weather data by Open-Meteo.com";
export const FOLLOW_NOTE = "👉 Follow Letan Moris for daily forecasts for Moris & Rodrig.";
export const TAGLINE = "Konn letan Moris ek Rodrig, planifie to zournee.";

/** `planFrom` fixes which day(s) the post covers (e.g. the time the post was prepared for review). */
export function buildSnapshot(slot: Slot, forecasts: Record<string, Forecast>, now: string = nowMU(), planFrom: string = now, extra: { didYouKnow?: string | null; weekly?: string[] } = {}): PostSnapshot {
  const plan = slotPlan(slot, planFrom);
  const sections: DaySection[] = plan.map((p) => ({
    date: p.date,
    label: relLabel(p.date, planFrom),
    from: p.from,
    to: p.to,
    regions: POST_REGIONS.map((r) => summariseRegion(r, forecasts[r.locId], p.date, p.from, p.to, p.daysAhead, now)),
  }));
  const dateText = sections.length === 1 ? fullDate(sections[0].date) : `${fullDate(sections[0].date)} – ${fullDate(sections[1].date)}`;
  const title = `🌦️ Letan Moris — ${SLOT_TITLE[slot]} · ${dateText}`;
  const headline = sections.map((s) => (sections.length > 1 ? `${s.label}: ${buildHeadline(s)}` : buildHeadline(s))).join("\n");
  const tips = tipsFor(sections);
  const confidence = overallConfidence(sections.flatMap((s) => s.regions));
  const oldest = Object.values(forecasts)
    .map((f) => f.provenance.retrievedAt)
    .sort()[0];

  const body: string[] = [title, "", headline, ""];
  for (const s of sections) {
    if (sections.length > 1) body.push(`${s.label}:`);
    const mu = s.regions.filter((r) => r.key !== "rodrigues");
    const rod = s.regions.find((r) => r.key === "rodrigues")!;
    mu.forEach((r) => body.push(regionLine(r)));
    body.push(regionLine(rod).replace("📍", "🏝️"));
    body.push("");
  }
  if (tips.length) body.push(...tips, "");
  if (extra.didYouKnow) body.push(`💡 Did you know? ${extra.didYouKnow}`, "");
  if (extra.weekly?.length) body.push(...extra.weekly, "");
  if (slot === "weekend") body.push("🏖️ Beach weather is not the same as sea safety — follow lifeguard flags and MMS sea advice.", "");
  body.push(
    `Issued ${hhmm(now)} Mauritius time · Confidence: ${CONF_WORD[confidence]} · Times are approximate (hourly data).`,
    `Forecast for your village: ${SITE_URL}`,
    "",
    FOLLOW_NOTE,
    "",
    DISCLAIMER,
    ATTRIBUTION,
    TAGLINE,
    "📈 Powered by 30 years of local weather history from Open-Meteo (ECMWF ERA5)",
  );

  return { slot, title, sections, headline, tips, confidence, issuedAtMU: now, oldestDataUtc: oldest, text: body.join("\n") };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function fullDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${DAYS[weekday(date)]} ${d} ${MONTHS[m - 1]}`;
}

/** "Today" / "Tomorrow" / "Saturday" relative to a Mauritius-time "now". */
export function relLabel(date: string, now: string): string {
  const today = now.slice(0, 10);
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return DAYS[weekday(date)];
}
