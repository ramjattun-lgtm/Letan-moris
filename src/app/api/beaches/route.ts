import { type NextRequest, NextResponse } from "next/server";
import { BEACH_IDS, getLocality } from "@/data/localities";
import { getForecastFor, getMarineFor } from "@/lib/weather/services/forecast.service";
import { BEACH_FACING, beachHours, beachReason, bestWindow } from "@/lib/weather/intelligence/beach.service";
import { ok } from "@/lib/api";
import { nowMU } from "@/lib/time";

// "Best beaches today" for one island: score summary per beach (details come from /api/forecast + /api/marine).
export async function GET(req: NextRequest) {
  const island = req.nextUrl.searchParams.get("island") ?? "mauritius";
  if (island !== "mauritius" && island !== "rodrigues") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const ids = BEACH_IDS.filter((id) => getLocality(id)?.island === island);
  const date = nowMU().slice(0, 10);
  const nowHour = Number(nowMU().slice(11, 13));
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const [f, m] = await Promise.all([getForecastFor(id), getMarineFor(id).catch(() => null)]);
        const hours = beachHours(f.hourly, m?.hourly ?? [], BEACH_FACING[id] ?? 270, date, Math.max(7, Math.min(nowHour, 17)), 18);
        const scored = hours.filter((h) => h.score !== null);
        const best = bestWindow(hours);
        return {
          id,
          name: getLocality(id)!.name,
          bestWindow: best,
          dayScore: scored.length ? Math.round((scored.reduce((a, h) => a + (h.score ?? 0), 0) / scored.length) * 10) / 10 : null,
          reason: beachReason(hours),
        };
      } catch {
        return { id, name: getLocality(id)!.name, bestWindow: null, dayScore: null, reason: "Forecast unavailable" };
      }
    }),
  );
  results.sort((a, b) => (b.dayScore ?? -1) - (a.dayScore ?? -1));
  return ok({ island, date, beaches: results, generatedAt: new Date().toISOString() }, 1800);
}
