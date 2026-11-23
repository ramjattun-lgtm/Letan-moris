import accuracy from "@/data/accuracy.json";
import type { Forecast } from "@/lib/weather/types";
import { bestDay, planDays, type PlanActivity } from "@/lib/weather/intelligence/planner";
import { dayLabel } from "@/lib/time";

// Sunday evening extra block: last 30 days' forecast track record and the best day of the
// coming week for a few activities. Added to the evening post in the same review-first flow.

interface Score {
  name: string;
  rain: { days: number; clearCallPct?: number | null; said?: { likely: { days: number; rained: number }; dry: { days: number; stayedDry: number } } } | null;
}
const ACC = accuracy as unknown as { builtAt: string | null; regions: Record<string, Score>; airports: Record<string, Score> };

export function accuracyLine(): string | null {
  const mu = Object.entries(ACC.regions)
    .filter(([k, r]) => k !== "rodrigues" && r.rain?.said)
    .map(([, r]) => r.rain!.said!);
  if (!ACC.builtAt || !mu.length) return null;
  const likely = mu.reduce((a, s) => ({ days: a.days + s.likely.days, rained: a.rained + s.likely.rained }), { days: 0, rained: 0 });
  const dry = mu.reduce((a, s) => ({ days: a.days + s.dry.days, ok: a.ok + s.dry.stayedDry }), { days: 0, ok: 0 });
  if (!likely.days && !dry.days) return null;
  const pct = (a: number, b: number) => Math.round((a / b) * 100);
  const parts = [likely.days ? `when we said rain likely, it rained ${pct(likely.rained, likely.days)}% of the time` : "", dry.days ? `when we said dry, it stayed dry ${pct(dry.ok, dry.days)}% of the time` : ""].filter(Boolean);
  return `📊 How right were we? Over the last 30 days across Mauritius' areas, ${parts.join("; ")} (day-before forecast vs the model's own estimate).`;
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
