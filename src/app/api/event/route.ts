import { type NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api";
import history from "@/data/cyclone-history.json";
import { getSeasonalRain } from "@/lib/weather/providers/catchment.provider";
import { monthlyOutlook, trendOf, weeklyOutlook } from "@/lib/weather/intelligence/reservoir.service";
import { ISLANDS, stormChanceNear, type HistStorm } from "@/lib/weather/intelligence/cyclone-climate.service";
import { addDays, todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** For a future date: long-range rain outlook (if within ~6 months) and the historical chance of a storm nearby. */
export async function GET(req: NextRequest) {
  const island = (req.nextUrl.searchParams.get("island") ?? "mauritius") as "mauritius" | "rodrigues";
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!(island in ISLANDS) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "bad_request", message: "island and date (YYYY-MM-DD) required" }, { status: 400 });
  const today = todayMU();
  if (date < today || date > addDays(today, 400)) return NextResponse.json({ error: "bad_request", message: "date must be within the next year" }, { status: 400 });

  const storms = ((history as unknown as { storms?: HistStorm[] }).storms ?? []) as HistStorm[];
  const storm = storms.length ? stormChanceNear(storms, island, date) : null;

  let outlook: { kind: "week" | "month"; label: string; pctNormal: number | null; trend: ReturnType<typeof trendOf>; wetterChance: number | null } | null = null;
  if (date >= addDays(today, 7) && date <= addDays(today, 200)) {
    try {
      const c = ISLANDS[island];
      const raw = (await getSeasonalRain(c.lat, c.lon)) as { weekly?: Record<string, unknown[]>; monthly?: Record<string, unknown[]> };
      // The week containing the date (EC46, up to ~6 weeks ahead), otherwise its month (SEAS5).
      const wt = (raw.weekly?.time ?? []) as string[];
      const wi = wt.findIndex((t) => t <= date && addDays(t.slice(0, 10), 6) >= date);
      if (wi >= 0) {
        const single = { weekly: Object.fromEntries(Object.entries(raw.weekly!).map(([k, v]) => [k, [v[wi], v[wi], v[wi]]])) };
        const w = weeklyOutlook(single, wt[wi]);
        if (w) outlook = { kind: "week", label: `Week of ${wt[wi].slice(0, 10)}`, pctNormal: w.pctNormal, trend: w.trend, wetterChance: w.wetterChance };
      }
      if (!outlook) {
        const m = monthlyOutlook(raw, today);
        const mm = m?.months.find((x) => x.label === ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(date.slice(5, 7)) - 1]);
        if (mm) outlook = { kind: "month", label: mm.label, pctNormal: mm.pctNormal, trend: mm.trend, wetterChance: null };
      }
    } catch {
      outlook = null;
    }
  }
  return ok({ island, date, storm, outlook }, 6 * 3600);
}
