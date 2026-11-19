import type { DailyPoint, HourlyPoint, Maybe } from "../types";
import { hourOf, weekday } from "@/lib/time";
import { decayWithLeadTime, type Confidence } from "./confidence.service";
import { dryingTime } from "./drying.service";

// Weather Decision Engine — deterministic, transparent rules (no AI).
// Every assessment lists the forecast period and the values behind it.
// Thresholds live in RULES so they can be tuned in one place.

export const RULES = {
  dryProb: 30, // % — below this an hour counts as "likely dry"
  wetProb: 60, // % — at or above this an hour counts as "rain likely"
  dryMm: 0.2, // mm/h
  wetMm: 1.0, // mm/h
  laundryProb: 20,
  laundryHumidity: 85,
  laundryMinHours: 3,
  beachMaxWind: 30, // km/h
  beachMaxGust: 45,
  commuteGustWarn: 60,
  gardenSkipMm: 5,
  irrigateMaxMm: 2,
  sprayMaxWind: 15,
  kiteMinWind: 22, // km/h (~12 knots)
  kiteMaxWind: 45,
  kiteMaxGust: 55,
  hikeMaxGust: 45,
  hikeMaxLowCloud: 70,
  hikeMinVisibility: 3000,
  hikeMaxFeelsLike: 33,
  boatMaxWind: 20,
  boatMaxGust: 30,
  uvHigh: 8,
  outdoorStart: 7,
  outdoorEnd: 18,
};

export type Verdict = "good" | "fair" | "poor" | "unknown";

export type ActivityId =
  | "general"
  | "school"
  | "commute"
  | "outdoor"
  | "laundry"
  | "gardening"
  | "beach"
  | "agriculture"
  | "kitesurf"
  | "hiking"
  | "solar"
  | "boating";

export const ACTIVITY_LABEL: Record<ActivityId, string> = {
  general: "Daily planning",
  school: "School run",
  commute: "Commuting",
  outdoor: "Outdoor activities",
  laundry: "Laundry & drying",
  gardening: "Gardening",
  beach: "Beach",
  agriculture: "Farming",
  kitesurf: "Kitesurf & windsurf",
  hiking: "Hiking",
  solar: "Solar panels",
  boating: "Boating & fishing",
};

export interface Assessment {
  id: ActivityId;
  title: string;
  verdict: Verdict;
  summary: string;
  /** Forecast period the assessment is based on, e.g. "06:00–08:00". */
  period: string;
  /** Plain-language reasons quoting the forecast values used. */
  reasons: string[];
  confidence: Confidence;
}

const h2 = (n: number) => `${String(n).padStart(2, "0")}:00`;

function hoursBetween(hourly: HourlyPoint[], date: string, from: number, to: number) {
  return hourly.filter((h) => h.time.startsWith(date) && hourOf(h.time) >= from && hourOf(h.time) < to);
}

const maxOf = (xs: Maybe<number>[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.max(...v) : null;
};
const sumOf = (xs: Maybe<number>[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) * 10) / 10 : null;
};
const complete = (hs: HourlyPoint[]) => hs.length > 0 && hs.every((h) => h.rainProbability !== null && h.precipitation !== null);

/** Classify a slot of hours by rain risk. */
function rainVerdict(hs: HourlyPoint[]): { verdict: Verdict; maxP: Maybe<number>; mm: Maybe<number> } {
  if (!complete(hs)) return { verdict: "unknown", maxP: null, mm: null };
  const maxP = maxOf(hs.map((h) => h.rainProbability));
  const mm = sumOf(hs.map((h) => h.precipitation));
  const maxMm = maxOf(hs.map((h) => h.precipitation)) ?? 0;
  let verdict: Verdict = "good";
  if ((maxP ?? 0) >= RULES.wetProb || maxMm >= RULES.wetMm) verdict = "poor";
  else if ((maxP ?? 0) >= RULES.dryProb || maxMm >= RULES.dryMm) verdict = "fair";
  return { verdict, maxP, mm };
}

const riskWord: Record<Verdict, string> = { good: "low", fair: "moderate", poor: "high", unknown: "unknown" };

function isDryHour(h: HourlyPoint, prob = RULES.dryProb) {
  return h.rainProbability !== null && h.precipitation !== null && h.rainProbability < prob && h.precipitation < RULES.dryMm;
}

/** Longest runs of consecutive hours meeting a test, best first. */
export function windows(hs: HourlyPoint[], ok: (h: HourlyPoint) => boolean, minLen = 2) {
  const out: { from: number; to: number; len: number }[] = [];
  let start: number | null = null;
  hs.forEach((h, i) => {
    const good = ok(h);
    if (good && start === null) start = i;
    const last = i === hs.length - 1;
    if ((!good || last) && start !== null) {
      const endIdx = good && last ? i : i - 1;
      const len = endIdx - start + 1;
      if (len >= minLen) out.push({ from: hourOf(hs[start].time), to: hourOf(hs[endIdx].time) + 1, len });
      start = null;
    }
  });
  return out.sort((a, b) => b.len - a.len);
}

const slotText = (from: number, to: number) => `${h2(from)}–${h2(to)}`;

function slotAssessment(
  label: string,
  hourly: HourlyPoint[],
  date: string,
  from: number,
  to: number,
): { part: string; verdict: Verdict; reasons: string[] } {
  const hs = hoursBetween(hourly, date, from, to);
  const r = rainVerdict(hs);
  if (r.verdict === "unknown") return { part: `${label} (${slotText(from, to)}): forecast not available`, verdict: "unknown", reasons: [] };
  return {
    part: `${label} (${slotText(from, to)}): rain risk ${riskWord[r.verdict]}`,
    verdict: r.verdict,
    reasons: [`${label} ${slotText(from, to)}: highest rain chance ${r.maxP}%, about ${r.mm} mm expected.`],
  };
}

const worst = (vs: Verdict[]): Verdict =>
  vs.includes("unknown") ? "unknown" : vs.includes("poor") ? "poor" : vs.includes("fair") ? "fair" : "good";

export function assessDay(hourly: HourlyPoint[], daily: DailyPoint[], date: string, daysAhead: number): Assessment[] {
  const day = daily.find((d) => d.date === date);
  const dayHours = hourly.filter((h) => h.time.startsWith(date));
  const conf = (base: Confidence = "high") => decayWithLeadTime(base, daysAhead);
  const out: Assessment[] = [];

  if (dayHours.length === 0) {
    return [{ id: "general", title: "Daily planning", verdict: "unknown", summary: "No forecast available for this date.", period: date, reasons: [], confidence: "low" }];
  }

  // 1. General daily planning
  const daytime = hoursBetween(hourly, date, RULES.outdoorStart, RULES.outdoorEnd);
  const dry = windows(daytime, (h) => isDryHour(h));
  const wetHours = daytime.filter((h) => (h.rainProbability ?? 0) >= RULES.wetProb).map((h) => hourOf(h.time));
  const gen = rainVerdict(daytime);
  let generalSummary: string;
  if (gen.verdict === "unknown") generalSummary = "Some forecast values are missing for this day.";
  else if (wetHours.length === 0 && dry.length && dry[0].len >= 8) generalSummary = "A mostly dry day — good for plans outdoors.";
  else if (wetHours.length > 0) {
    const am = wetHours.filter((h) => h < 12).length;
    const pm = wetHours.length - am;
    generalSummary =
      pm > am
        ? "Rain is more likely in the afternoon. Consider doing outdoor tasks earlier."
        : am > pm
          ? "Rain is more likely in the morning. Conditions should improve later."
          : "Showers are possible at different times of the day.";
  } else generalSummary = "Some showers are possible; keep an umbrella handy.";
  out.push({
    id: "general",
    title: "Daily planning",
    verdict: gen.verdict,
    summary: generalSummary,
    period: `${slotText(RULES.outdoorStart, RULES.outdoorEnd)}`,
    reasons: [
      day ? `Day temperatures ${day.tempMin ?? "—"}–${day.tempMax ?? "—"}°C, total rain about ${day.precipitationSum ?? "—"} mm, highest rain chance ${day.rainProbabilityMax ?? "—"}%.` : "",
      dry.length ? `Longest dry spell: ${slotText(dry[0].from, dry[0].to)}.` : "No dry spell of 2 hours or more between 07:00 and 18:00.",
    ].filter(Boolean),
    confidence: conf(gen.verdict === "fair" ? "medium" : "high"),
  });

  // 2. School run (weekdays)
  const wd = weekday(date);
  if (wd >= 1 && wd <= 5) {
    const am = slotAssessment("Morning", hourly, date, 6, 8);
    const pm = slotAssessment("Afternoon", hourly, date, 14, 16);
    out.push({
      id: "school",
      title: "School run",
      verdict: worst([am.verdict, pm.verdict]),
      summary: `${am.part}. ${pm.part}.`,
      period: "06:00–08:00 and 14:00–16:00",
      reasons: [...am.reasons, ...pm.reasons],
      confidence: conf(),
    });
  }

  // 3. Commuting
  const cAm = slotAssessment("Morning", hourly, date, 6, 9);
  const cPm = slotAssessment("Evening", hourly, date, 16, 19);
  const commuteHours = [...hoursBetween(hourly, date, 6, 9), ...hoursBetween(hourly, date, 16, 19)];
  const gust = maxOf(commuteHours.map((h) => h.windGusts));
  const commuteReasons = [...cAm.reasons, ...cPm.reasons];
  let commuteVerdict = worst([cAm.verdict, cPm.verdict]);
  let commuteSummary = `${cAm.part}. ${cPm.part}.`;
  if (gust !== null && gust >= RULES.commuteGustWarn) {
    commuteVerdict = commuteVerdict === "good" ? "fair" : commuteVerdict;
    commuteSummary += ` Strong gusts up to ${Math.round(gust)} km/h.`;
    commuteReasons.push(`Gusts up to ${Math.round(gust)} km/h during commute hours.`);
  }
  out.push({ id: "commute", title: "Commuting", verdict: commuteVerdict, summary: commuteSummary, period: "06:00–09:00 and 16:00–19:00", reasons: commuteReasons, confidence: conf() });

  // 4. Outdoor activities
  const outdoorWins = windows(daytime, (h) => isDryHour(h) && (h.windGusts ?? 0) < 50);
  out.push({
    id: "outdoor",
    title: "Outdoor activities",
    verdict: !complete(daytime) ? "unknown" : outdoorWins.length && outdoorWins[0].len >= 4 ? "good" : outdoorWins.length ? "fair" : "poor",
    summary: !complete(daytime)
      ? "Forecast not available."
      : outdoorWins.length
        ? `Best time: ${slotText(outdoorWins[0].from, outdoorWins[0].to)}${outdoorWins[1] ? ` (also ${slotText(outdoorWins[1].from, outdoorWins[1].to)})` : ""}.`
        : "No dry 2-hour window between 07:00 and 18:00. Plan indoor alternatives.",
    period: slotText(RULES.outdoorStart, RULES.outdoorEnd),
    reasons: [`An hour counts as good when rain chance is under ${RULES.dryProb}%, rain under ${RULES.dryMm} mm and gusts under 50 km/h.`],
    confidence: conf(),
  });

  // 5. Laundry
  const laundryHours = hoursBetween(hourly, date, 8, 17);
  const laundryWins = windows(
    laundryHours,
    (h) => isDryHour(h, RULES.laundryProb) && h.humidity !== null && h.humidity < RULES.laundryHumidity,
    RULES.laundryMinHours,
  );
  const lw = laundryWins[0];
  out.push({
    id: "laundry",
    title: "Laundry & drying",
    verdict: !complete(laundryHours) ? "unknown" : lw ? (lw.len >= 4 ? "good" : "fair") : "poor",
    summary: !complete(laundryHours)
      ? "Forecast not available."
      : lw
        ? `Good drying window: ${slotText(lw.from, lw.to)}.${(() => {
            const d = dryingTime(hourly, date, lw.from);
            return d?.dryBy && d.hours !== null && !d.interruptedByRain ? ` Hang out at ${h2(lw.from)} → dry by about ${d.dryBy.slice(11, 16)} (about ${d.hours} h).` : d && !d.dryBy ? " Thick items may not dry fully today." : "";
          })()}`
        : "No reliable 3-hour drying window today. Consider drying indoors.",
    period: "08:00–17:00",
    reasons: [
      `Needs ${RULES.laundryMinHours}+ hours in a row with rain chance under ${RULES.laundryProb}% and humidity under ${RULES.laundryHumidity}%.`,
      lw ? `Average humidity in that window: ${Math.round(avg(laundryHours.filter((h) => hourOf(h.time) >= lw.from && hourOf(h.time) < lw.to).map((h) => h.humidity)) ?? 0)}%.` : "",
    ].filter(Boolean),
    confidence: conf(),
  });

  // 6. Gardening
  const dayMm = day?.precipitationSum ?? null;
  const dayMaxP = day?.rainProbabilityMax ?? null;
  out.push({
    id: "gardening",
    title: "Gardening",
    verdict: dayMm === null ? "unknown" : dayMm >= RULES.gardenSkipMm ? "fair" : "good",
    summary:
      dayMm === null
        ? "Forecast not available."
        : dayMm >= RULES.gardenSkipMm
          ? `About ${dayMm} mm of rain expected — watering probably not needed.`
          : (dayMaxP ?? 0) < 30 && dayMm < 1
            ? "Dry day expected. Water early morning or late afternoon."
            : "Light rain possible. Check the soil before watering.",
    period: "Whole day",
    reasons: [`Daily rain total about ${dayMm ?? "—"} mm, highest rain chance ${dayMaxP ?? "—"}%.`],
    confidence: conf(),
  });

  // 7. Beach
  const beachHours = hoursBetween(hourly, date, 9, 17);
  const beachWins = windows(beachHours, (h) => isDryHour(h) && (h.windSpeed ?? 99) < RULES.beachMaxWind && (h.windGusts ?? 99) < RULES.beachMaxGust);
  const uvMax = day?.uvIndexMax ?? null;
  out.push({
    id: "beach",
    title: "Beach weather",
    verdict: !complete(beachHours) ? "unknown" : beachWins.length && beachWins[0].len >= 4 ? "good" : beachWins.length ? "fair" : "poor",
    summary: !complete(beachHours)
      ? "Forecast not available."
      : (beachWins.length ? `Best beach weather: ${slotText(beachWins[0].from, beachWins[0].to)}.` : "Not great beach weather (rain or wind).") +
        (uvMax !== null && uvMax >= RULES.uvHigh ? ` UV very high (${Math.round(uvMax)}) — sun protection essential.` : ""),
    period: "09:00–17:00",
    reasons: [
      `Good when rain chance is under ${RULES.dryProb}% and wind under ${RULES.beachMaxWind} km/h.`,
      "Weather suitability only — it does not mean the sea is safe. Check sea conditions, lifeguard flags and official warnings.",
    ],
    confidence: conf(),
  });

  // 8. Agriculture
  const sprayWins = windows(daytime, (h) => isDryHour(h, 20) && (h.windSpeed ?? 99) < RULES.sprayMaxWind, 3);
  const agriSummary =
    dayMm === null
      ? "Forecast not available."
      : (dayMm < RULES.irrigateMaxMm && (dayMaxP ?? 0) < 40
          ? "Little rain expected — irrigation may be needed."
          : dayMm >= RULES.gardenSkipMm
            ? "Useful rain expected — consider postponing irrigation."
            : "Some rain possible — check soil moisture before irrigating.") +
        (sprayWins.length ? ` Calm, dry spraying window: ${slotText(sprayWins[0].from, sprayWins[0].to)}.` : " No calm, dry 3-hour window for spraying.");
  out.push({
    id: "agriculture",
    title: "Agriculture",
    verdict: dayMm === null ? "unknown" : sprayWins.length ? "good" : "fair",
    summary: agriSummary,
    period: "Whole day",
    reasons: [
      `Daily rain about ${dayMm ?? "—"} mm.`,
      `Spraying window needs 3+ hours with rain chance under 20% and wind under ${RULES.sprayMaxWind} km/h.`,
    ],
    confidence: conf(),
  });

  // 9. Kitesurf & windsurf
  const kiteHours = hoursBetween(hourly, date, 7, 18);
  const kiteOk = (h: HourlyPoint) =>
    h.windSpeed !== null && h.windGusts !== null && h.windSpeed >= RULES.kiteMinWind && h.windSpeed <= RULES.kiteMaxWind && h.windGusts <= RULES.kiteMaxGust && (h.rainProbability ?? 0) < 40;
  const kw = windows(kiteHours, kiteOk);
  const kiteAvg = avg(kiteHours.map((h) => h.windSpeed));
  out.push({
    id: "kitesurf",
    title: ACTIVITY_LABEL.kitesurf,
    verdict: !kiteHours.length || kiteAvg === null ? "unknown" : kw.length && kw[0].len >= 3 ? "good" : kw.length ? "fair" : "poor",
    summary:
      kiteAvg === null
        ? "Forecast not available."
        : kw.length
          ? `Wind in range ${slotText(kw[0].from, kw[0].to)} (about ${Math.round(avg(kiteHours.filter((h) => hourOf(h.time) >= kw[0].from && hourOf(h.time) < kw[0].to).map((h) => h.windSpeed)) ?? 0)} km/h, ${Math.round((avg(kiteHours.map((h) => h.windSpeed)) ?? 0) / 1.852)} kn on average today).`
          : kiteAvg < RULES.kiteMinWind
            ? `Too light for most kites (about ${Math.round(kiteAvg)} km/h).`
            : "Too strong or too gusty for most riders today.",
    period: "07:00–18:00",
    reasons: [
      `Good when wind is ${RULES.kiteMinWind}–${RULES.kiteMaxWind} km/h with gusts under ${RULES.kiteMaxGust} km/h and little rain.`,
      "Model wind at 10 m for the area; local spots (e.g. Le Morne lagoon) can differ. Not a safety assessment.",
    ],
    confidence: conf("medium"),
  });

  // 10. Hiking
  const hikeHours = hoursBetween(hourly, date, 6, 16);
  const summitClear = (h: HourlyPoint) =>
    (h.cloudLow === null || h.cloudLow < RULES.hikeMaxLowCloud) && (h.visibility === null || h.visibility >= RULES.hikeMinVisibility) && describeFog(h.weatherCode) === false;
  const hikeOk = (h: HourlyPoint) => isDryHour(h) && (h.windGusts ?? 99) < RULES.hikeMaxGust && (h.feelsLike ?? 0) < RULES.hikeMaxFeelsLike && summitClear(h);
  const hw = windows(hikeHours, hikeOk, 3);
  const prevRain = sumOf(hourly.filter((h) => h.time < `${date}T06:00` && h.time >= `${prevDay(date)}T18:00`).map((h) => h.precipitation));
  out.push({
    id: "hiking",
    title: ACTIVITY_LABEL.hiking,
    verdict: !complete(hikeHours) ? "unknown" : hw.length && hw[0].len >= 4 ? "good" : hw.length ? "fair" : "poor",
    summary: !complete(hikeHours)
      ? "Forecast not available."
      : (hw.length ? `Best hiking window: ${slotText(hw[0].from, hw[0].to)} — start early.` : "No good 3-hour hiking window (rain, wind, heat or low cloud on the hills).") +
        (prevRain !== null && prevRain >= 2 ? " Trails may be muddy and slippery after overnight rain." : ""),
    period: "06:00–16:00",
    reasons: [
      `Good when dry, gusts under ${RULES.hikeMaxGust} km/h, feels-like under ${RULES.hikeMaxFeelsLike}°C and low cloud under ${RULES.hikeMaxLowCloud}% (summit views).`,
      "Mountain tops can be cloudier and windier than the forecast area. Tell someone your route.",
    ],
    confidence: conf("medium"),
  });

  // 11. Solar panels
  const sunHours = dayHours.map((h) => h.solarRadiation);
  const kwh = sunHours.every((x) => x === null) ? null : Math.round((sunHours.reduce<number>((a, b) => a + (b ?? 0), 0) / 1000) * 10) / 10;
  out.push({
    id: "solar",
    title: ACTIVITY_LABEL.solar,
    verdict: kwh === null ? "unknown" : kwh >= 6 ? "good" : kwh >= 4 ? "fair" : "poor",
    summary:
      kwh === null
        ? "Forecast not available."
        : `${kwh >= 6 ? "Excellent" : kwh >= 4.5 ? "Good" : kwh >= 3 ? "Fair" : "Poor"} solar day: about ${kwh} kWh of sunlight per m². A typical 3 kW home system might make roughly ${Math.round(kwh * 3 * 0.8)} kWh.`,
    period: "Whole day",
    reasons: ["Sunlight forecast from the model (shortwave radiation). Output estimate assumes a well-oriented system at 80% efficiency — a rough guide only."],
    confidence: conf("medium"),
  });

  // 12. Boating & fishing
  const boatHours = hoursBetween(hourly, date, 6, 17);
  const boatOk = (h: HourlyPoint) => (h.windSpeed ?? 99) < RULES.boatMaxWind && (h.windGusts ?? 99) < RULES.boatMaxGust && (h.rainProbability ?? 100) < 40;
  const bw = windows(boatHours, boatOk, 3);
  const boatWind = maxOf(boatHours.map((h) => h.windSpeed));
  out.push({
    id: "boating",
    title: ACTIVITY_LABEL.boating,
    verdict: boatWind === null ? "unknown" : bw.length && bw[0].len >= 5 ? "good" : bw.length ? "fair" : "poor",
    summary:
      boatWind === null
        ? "Forecast not available."
        : bw.length
          ? `Calmer window: ${slotText(bw[0].from, bw[0].to)}. Check waves on the Sea page.`
          : `Windy on the water (up to about ${Math.round(boatWind)} km/h). Check waves on the Sea page.`,
    period: "06:00–17:00",
    reasons: [
      `Calmer when wind is under ${RULES.boatMaxWind} km/h and gusts under ${RULES.boatMaxGust} km/h.`,
      "Weather only — not a sea-safety assessment. Follow official sea warnings and local advice.",
    ],
    confidence: conf("medium"),
  });

  return out;
}

function avg(xs: Maybe<number>[]) {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

const FOG_CODES = new Set([45, 48]);
function describeFog(code: Maybe<number>) {
  return code !== null && FOG_CODES.has(code);
}
function prevDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}
