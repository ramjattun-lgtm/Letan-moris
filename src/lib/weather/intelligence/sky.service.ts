// Stargazing tonight: clear hours from the cloud forecast, and the Moon's phase (computed, no API).
import type { HourlyPoint } from "../types";
import { addDays, hourOf } from "@/lib/time";

const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14); // a known new moon (JD 2451550.26)

/** Moon age in days (0 = new) and illuminated fraction for a UTC instant. Accurate to within about a day. */
export function moonPhase(at: Date) {
  const age = ((((at.getTime() - NEW_MOON_REF) / 86_400_000) % SYNODIC) + SYNODIC) % SYNODIC;
  const illumination = Math.round(((1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2) * 100);
  const name =
    age < 1.5 || age > SYNODIC - 1.5
      ? "New Moon"
      : age < 6.4
        ? "Waxing crescent"
        : age < 8.9
          ? "First quarter"
          : age < 13.8
            ? "Waxing gibbous"
            : age < 15.8
              ? "Full Moon"
              : age < 20.7
                ? "Waning gibbous"
                : age < 23.2
                  ? "Last quarter"
                  : "Waning crescent";
  return { age: Math.round(age * 10) / 10, illumination, name };
}

export interface SkyTonight {
  date: string;
  hours: { time: string; cloud: number | null; low: number | null }[];
  bestWindow: { from: string; to: string; cloud: number } | null; // ≥ 2 h with cloud ≤ 30 %
  clearHours: number;
  moon: ReturnType<typeof moonPhase>;
  verdict: "excellent" | "good" | "fair" | "poor";
  summary: string;
}

/** Tonight = 19:00 to 04:00 next morning (Mauritius time). */
export function skyTonight(hours: HourlyPoint[], date: string): SkyTonight | null {
  const next = addDays(date, 1);
  const night = hours.filter((h) => (h.time.startsWith(date) && hourOf(h.time) >= 19) || (h.time.startsWith(next) && hourOf(h.time) <= 4));
  if (night.length < 6) return null;
  const pts = night.map((h) => ({ time: h.time, cloud: h.cloudCover, low: h.cloudLow }));
  const clear = (c: number | null) => c !== null && c <= 30;
  let best: SkyTonight["bestWindow"] = null;
  let i = 0;
  while (i < pts.length) {
    if (!clear(pts[i].cloud)) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < pts.length && clear(pts[j + 1].cloud)) j++;
    const len = j - i + 1;
    if (len >= 2 && (!best || len > hourOf(best.to) - hourOf(best.from))) {
      const avg = Math.round(pts.slice(i, j + 1).reduce((a, p) => a + (p.cloud ?? 0), 0) / len);
      best = { from: pts[i].time, to: pts[j].time, cloud: avg };
    }
    i = j + 1;
  }
  const clearHours = pts.filter((p) => clear(p.cloud)).length;
  // Moon at local midnight.
  const [y, m, d] = next.split("-").map(Number);
  const moon = moonPhase(new Date(Date.UTC(y, m - 1, d) - 4 * 3600_000));
  const bright = moon.illumination >= 70;
  const verdict: SkyTonight["verdict"] = clearHours >= 6 ? (bright ? "good" : "excellent") : clearHours >= 3 ? (bright ? "fair" : "good") : clearHours >= 1 ? "fair" : "poor";
  const summary =
    verdict === "poor"
      ? "Mostly cloudy tonight — not a good night for stars."
      : `${clearHours} mostly clear hour${clearHours === 1 ? "" : "s"} tonight.${bright ? ` The ${moon.name.toLowerCase()} (${moon.illumination}% lit) will wash out faint stars.` : moon.illumination <= 25 ? " Dark sky with little moonlight." : ""}`;
  return { date, hours: pts, bestWindow: best, clearHours, moon, verdict, summary };
}

export const DARK_SITES: Record<"mauritius" | "rodrigues", string[]> = {
  mauritius: ["Plaine Champagne and the Black River Gorges viewpoints", "Le Morne public beach", "Gris Gris and the south coast cliffs", "Bel Ombre / Baie du Cap coast road lay-bys"],
  rodrigues: ["Mont Limon and Mont Malartic", "Graviers and the south-east coast", "Saint François beach"],
};
