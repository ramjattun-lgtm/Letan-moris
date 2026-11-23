import accuracy from "@/data/accuracy.json";
import type { Forecast } from "@/lib/weather/types";
import { bestDay, planDays, type PlanActivity } from "@/lib/weather/intelligence/planner";
import { dayLabel } from "@/lib/time";

// Sunday evening extra block: last 30 days' forecast track record and the best day of the
// coming week for a few activities. Added to the evening post in the same review-first flow.

interface Score {
  name: string;
  rain: { agreePct: number; days: number } | null;
}
const ACC = accuracy as unknown as { builtAt: string | null; regions: Record<string, Score>; airports: Record<string, Score> };

export function accuracyLine(): string | null {
  const mu = Object.entries(ACC.regions)
    .filter(([k, r]) => k !== "rodrigues" && r.rain)
    .map(([, r]) => r.rain!.agreePct);
  if (!ACC.builtAt || !mu.length) return null;
  const ap = ACC.airports.FIMP?.rain;
  const lo = Math.min(...mu);
  const hi = Math.max(...mu);
  return `📊 How right were we? Over the last 30 days, the day-before forecast called rain or no rain right on ${lo === hi ? lo : `${lo}–${hi}`}% of days across Mauritius' areas (vs the model's own estimate)${ap ? `, and ${ap.agreePct}% at Plaisance airport against real weather reports` : ""}.`;
}

const ACTS: { id: PlanActivity; label: string; locId: string }[] = [
  { id: "beach", label: "beach day (west coast)", locId: "flic-en-flac" },
  { id: "hiking", label: "hike (Central Plateau)", locId: "curepipe" },
  { id: "outdoor", label: "family outing (north)", locId: "grand-baie" },
];

export function bestDaysLines(forecasts: Record<string, Forecast>, today: string): string[] {
  const out: string[] = [];
  for (const a of ACTS) {
    const f = forecasts[a.locId];
    if (!f) continue;
    const b = bestDay(planDays(f, a.id, today));
    out.push(b ? `• Best ${a.label}: ${dayLabel(b.date)} (${b.a.verdict})` : `• ${a.label[0].toUpperCase()}${a.label.slice(1)}: no good day in the forecast yet`);
  }
  return out.length ? ["🗓️ Best days this week (forecast, may change):", ...out] : [];
}

export function weeklyBlock(forecasts: Record<string, Forecast>, today: string): string[] {
  const acc = accuracyLine();
  return [...(acc ? [acc, ""] : []), ...bestDaysLines(forecasts, today)];
}
