// Heat stress for outdoor work and "mosquito weather". Simple, documented rules on weather data.
// Neither is a medical forecast: heat uses the "feels like" temperature; mosquito weather only says when
// warm, wet conditions favour breeding (it says nothing about disease).
import type { HourlyPoint } from "../types";
import { hhmm, hourOf } from "@/lib/time";

export type HeatLevel = "low" | "caution" | "high" | "danger";

/** Bands on the "feels like" temperature, after the US NWS heat index categories (°C). */
export const HEAT_BANDS = { caution: 27, high: 32, danger: 41 };

export function heatLevel(feels: number): HeatLevel {
  if (feels >= HEAT_BANDS.danger) return "danger";
  if (feels >= HEAT_BANDS.high) return "high";
  if (feels >= HEAT_BANDS.caution) return "caution";
  return "low";
}

export const HEAT_ADVICE: Record<HeatLevel, string> = {
  low: "Normal precautions.",
  caution: "Drink water regularly and take short breaks in the shade. Hard work in full sun is tiring.",
  high: "Drink a cup of water every 15–20 minutes, rest in the shade every hour, and move heavy work to the morning or late afternoon.",
  danger: "Avoid heavy outdoor work in these hours. Rest in the shade, drink often, and watch for dizziness, headache or confusion — signs of heat illness.",
};

export interface HeatDay {
  peak: { feels: number; time: string; level: HeatLevel } | null;
  windows: { from: string; to: string; level: HeatLevel }[]; // contiguous hours at caution or above, 06–19 h
  uvMax: number | null;
}

/** Heat stress during working hours (06:00–19:00) for one day. */
export function heatDay(hours: HourlyPoint[], date: string): HeatDay {
  const day = hours.filter((h) => h.time.startsWith(date) && hourOf(h.time) >= 6 && hourOf(h.time) <= 19 && h.feelsLike !== null);
  if (!day.length) return { peak: null, windows: [], uvMax: null };
  let peak = day[0];
  for (const h of day) if ((h.feelsLike as number) > (peak.feelsLike as number)) peak = h;
  const windows: HeatDay["windows"] = [];
  for (const h of day) {
    const lvl = heatLevel(h.feelsLike as number);
    if (lvl === "low") continue;
    const last = windows[windows.length - 1];
    const prevHour = last ? hourOf(last.to) : -9;
    if (last && prevHour === hourOf(h.time) - 1) {
      last.to = h.time;
      const order = ["low", "caution", "high", "danger"];
      if (order.indexOf(lvl) > order.indexOf(last.level)) last.level = lvl;
    } else windows.push({ from: h.time, to: h.time, level: lvl });
  }
  const uvs = day.map((h) => h.uvIndex).filter((u): u is number => u !== null);
  return {
    peak: { feels: Math.round(peak.feelsLike as number), time: peak.time, level: heatLevel(peak.feelsLike as number) },
    windows: windows.map((w) => ({ ...w, to: `${w.to.slice(0, 11)}${String(hourOf(w.to) + 1).padStart(2, "0")}:00` })),
    uvMax: uvs.length ? Math.round(Math.max(...uvs)) : null,
  };
}

export const windowText = (w: { from: string; to: string }) => `${hhmm(w.from)}–${hhmm(w.to)}`;

// ---- Mosquito weather ----
export type MosquitoLevel = "low" | "favourable" | "very-favourable";

/** Rule: breeding sites fill after rain, and mosquitoes develop fastest when it is warm.
 *  favourable = ≥ 20 mm over the last 14 days and average temperature ≥ 22 °C;
 *  very favourable = ≥ 50 mm and ≥ 25 °C. */
export const MOSQUITO_RULE = { rain: 20, temp: 22, rainHigh: 50, tempHigh: 25 };

export function mosquitoLevel(rain14: number | null, temp14: number | null): MosquitoLevel | null {
  if (rain14 === null || temp14 === null) return null;
  if (rain14 >= MOSQUITO_RULE.rainHigh && temp14 >= MOSQUITO_RULE.tempHigh) return "very-favourable";
  if (rain14 >= MOSQUITO_RULE.rain && temp14 >= MOSQUITO_RULE.temp) return "favourable";
  return "low";
}
