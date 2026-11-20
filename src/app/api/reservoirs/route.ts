import { ok, fail } from "@/lib/api";
import history from "@/data/reservoir-rain.json";
import { compareFrom, RECORDS_START, RESERVOIRS } from "@/data/reservoirs";
import { getModelRain, getReanalysisRain, getSeasonalRain } from "@/lib/weather/providers/catchment.provider";
import { averagedHistory, catchmentReport, monthlyOutlook, weeklyOutlook, type RainHistory } from "@/lib/weather/intelligence/reservoir.service";
import { addDays, todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";

// Centre of the main catchments, for the island-wide seasonal outlook (36 km model cells).
const CENTRAL = { lat: -20.27, lon: 57.53 };

export async function GET() {
  try {
    const today = todayMU();
    const h = history as unknown as RainHistory;
    const historyReady = !!h.builtAt && Object.keys(h.rain).length > 0;
    const pts = RESERVOIRS.map((r) => ({ lat: r.lat, lon: r.lon }));
    const [rea, mod, sea] = await Promise.allSettled([getReanalysisRain(pts, addDays(today, -190), today), getModelRain(pts), getSeasonalRain(CENTRAL.lat, CENTRAL.lon)]);
    if (mod.status === "rejected") throw mod.reason;
    const reanalysis = rea.status === "fulfilled" ? rea.value : RESERVOIRS.map(() => ({}));
    const model = mod.value;

    let filledDays = 0;
    const reservoirs = RESERVOIRS.map((r, i) => {
      const rep = catchmentReport(h, r.id, compareFrom(r), reanalysis[i] ?? {}, model[i] ?? {}, today);
      filledDays = Math.max(filledDays, rep.filledDays);
      return { ...r, compareFrom: rep.compareFrom, past: rep.past, next7: rep.next7 };
    });

    // All catchments together: average of the 7 daily series, compared since records began.
    const avg = (maps: Record<string, number | null>[]) => {
      const out: Record<string, number | null> = {};
      for (const d of new Set(maps.flatMap((m) => Object.keys(m)))) {
        const vs = maps.map((m) => m[d]);
        out[d] = vs.some((v) => v === null || v === undefined) ? null : (vs as number[]).reduce((a, b) => a + b, 0) / vs.length;
      }
      return out;
    };
    const hAll = historyReady ? averagedHistory(h, RESERVOIRS.map((r) => r.id)) : h;
    const overall = catchmentReport(hAll, "all", RECORDS_START, avg(reanalysis), avg(model), today);

    const outlook = sea.status === "fulfilled" ? { weeks: weeklyOutlook(sea.value, today), months: monthlyOutlook(sea.value, today) } : { weeks: null, months: null };
    return ok(
      {
        today,
        historyReady,
        history: { start: h.start, end: h.end },
        filledDays,
        reanalysisOk: rea.status === "fulfilled",
        overall: { past: overall.past, next7: overall.next7 },
        reservoirs,
        outlook,
        retrievedAt: new Date().toISOString(),
      },
      3 * 3600,
    );
  } catch (e) {
    return fail(e);
  }
}
