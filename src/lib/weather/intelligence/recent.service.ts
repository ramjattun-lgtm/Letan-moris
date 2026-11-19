import type { HourlyPoint, Maybe } from "../types";
import { addHours, hhmm, hourStart, nowMU } from "@/lib/time";

// "Last 3 hours · Next 3 hours": what just happened (model estimate) vs what is coming,
// turned into up to 4 plain-language insights about what is CHANGING.

export interface Window3h {
  hours: HourlyPoint[];
  rainMm: Maybe<number>;
  maxRainProb: Maybe<number>;
  tempStart: Maybe<number>;
  tempEnd: Maybe<number>;
  windAvg: Maybe<number>;
  gustMax: Maybe<number>;
  cloudAvg: Maybe<number>;
  uvMax: Maybe<number>;
}

const nums = (xs: Maybe<number>[]) => xs.filter((x): x is number => x !== null);
const sum = (xs: Maybe<number>[]) => (nums(xs).length ? Math.round(nums(xs).reduce((a, b) => a + b, 0) * 10) / 10 : null);
const avg = (xs: Maybe<number>[]) => (nums(xs).length ? nums(xs).reduce((a, b) => a + b, 0) / nums(xs).length : null);
const mx = (xs: Maybe<number>[]) => (nums(xs).length ? Math.max(...nums(xs)) : null);

function summarise(hours: HourlyPoint[]): Window3h {
  return {
    hours,
    rainMm: sum(hours.map((h) => h.precipitation)),
    maxRainProb: mx(hours.map((h) => h.rainProbability)),
    tempStart: hours[0]?.temperature ?? null,
    tempEnd: hours[hours.length - 1]?.temperature ?? null,
    windAvg: avg(hours.map((h) => h.windSpeed)),
    gustMax: mx(hours.map((h) => h.windGusts)),
    cloudAvg: avg(hours.map((h) => h.cloudCover)),
    uvMax: mx(hours.map((h) => h.uvIndex)),
  };
}

/** Last 3 completed hours and the current + next 2 hours. */
export function splitRecent(hourly: HourlyPoint[], now: string = nowMU()) {
  const cur = hourStart(now);
  const last = hourly.filter((h) => h.time >= addHours(cur, -3) && h.time < cur);
  const next = hourly.filter((h) => h.time >= cur && h.time < addHours(cur, 3));
  return { last: summarise(last), next: summarise(next) };
}

export function recentInsights(last: Window3h, next: Window3h, sunset: Maybe<string> = null, now: string = nowMU()): string[] {
  const out: string[] = [];
  if (!next.hours.length) return out;

  // Rain: before vs after
  const wasWet = (last.rainMm ?? 0) >= 0.5;
  const firstWet = next.hours.find((h) => (h.rainProbability ?? 0) >= 50 || (h.precipitation ?? 0) >= 0.5);
  const willBeWet = !!firstWet;
  if (wasWet && willBeWet) out.push(`Rain continues: about ${last.rainMm} mm in the last 3 hours, and up to ${next.maxRainProb ?? "—"}% chance in the next 3.`);
  else if (wasWet && !willBeWet) out.push(`Drying up: about ${last.rainMm} mm fell in the last 3 hours, but the next 3 look mostly dry (up to ${next.maxRainProb ?? "—"}%). Roads may still be wet.`);
  else if (!wasWet && willBeWet && firstWet) out.push(`Rain on the way: dry so far, showers likely from about ${hhmm(firstWet.time)} (up to ${next.maxRainProb ?? "—"}%).`);
  else if ((next.maxRainProb ?? 0) >= 30) out.push(`Mostly dry, but a passing shower is possible (up to ${next.maxRainProb}%).`);
  else out.push("Dry before and dry ahead — no rain expected in the next 3 hours.");

  // Temperature trend across the 6 hours
  if (last.tempStart !== null && next.tempEnd !== null) {
    const d = Math.round((next.tempEnd - last.tempStart) * 10) / 10;
    const by = next.hours.length ? hhmm(next.hours[next.hours.length - 1].time) : "";
    if (d >= 2) out.push(`Warming up: from ${Math.round(last.tempStart)}°C three hours ago to about ${Math.round(next.tempEnd)}°C by ${by}.`);
    else if (d <= -2) out.push(`Cooling down: from ${Math.round(last.tempStart)}°C three hours ago to about ${Math.round(next.tempEnd)}°C by ${by}.`);
  }

  // Wind change
  if (last.windAvg !== null && next.windAvg !== null) {
    const d = next.windAvg - last.windAvg;
    if (d >= 8) out.push(`Wind picking up: from about ${Math.round(last.windAvg)} to ${Math.round(next.windAvg)} km/h${next.gustMax !== null && next.gustMax >= 45 ? `, gusts up to ${Math.round(next.gustMax)} km/h` : ""}.`);
    else if (d <= -8) out.push(`Wind easing: from about ${Math.round(last.windAvg)} to ${Math.round(next.windAvg)} km/h.`);
    else if (next.gustMax !== null && next.gustMax >= 50) out.push(`Gusty: gusts up to about ${Math.round(next.gustMax)} km/h in the next 3 hours.`);
  }

  // Sky
  if (last.cloudAvg !== null && next.cloudAvg !== null) {
    const d = next.cloudAvg - last.cloudAvg;
    if (d <= -30) out.push("Clearing: noticeably less cloud in the next 3 hours.");
    else if (d >= 30) out.push("Clouding over in the next 3 hours.");
  }

  // UV and sunset
  if (next.uvMax !== null && next.uvMax >= 8) out.push(`UV very high (up to ${Math.round(next.uvMax)}) — sun protection if you're outside.`);
  if (sunset && sunset > now && sunset <= addHours(now, 3)) out.push(`Sunset at ${hhmm(sunset)}.`);

  return out.slice(0, 4);
}
