import { type NextRequest, NextResponse } from "next/server";
import { ok, fail } from "@/lib/api";
import history from "@/data/reservoir-rain.json";
import cycloneHistory from "@/data/cyclone-history.json";
import { compareFrom, ISLAND_PTS, RECORDS_START, RESERVOIRS, RODRIGUES_POINT } from "@/data/reservoirs";
import { getEt0, getModelRain, getReanalysisRain, getSeasonalRain } from "@/lib/weather/providers/catchment.provider";
import { averagedHistory, catchmentReport, mergeDaily, monthlyOutlook, pastRange, rainShare, weeklyOutlook, WINDOWS, type RainHistory } from "@/lib/weather/intelligence/reservoir.service";
import {
  analogues,
  catchUp,
  netWater,
  rainDays,
  seasonProgress,
  seasonStart,
  stormDays,
  stormShare,
  summerTrend,
  type DayRain,
  type StormTrack,
} from "@/lib/weather/intelligence/reservoir-insights.service";
import { addDays, todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Centre of the main catchments: island-wide seasonal outlook (36 km cells) and evaporation.
const CENTRAL = { lat: -20.27, lon: 57.53 };
const ISLAND_CENTRE = { mauritius: { lat: -20.25, lon: 57.55 }, rodrigues: { lat: -19.7, lon: 63.42 } };

type Daily = Record<string, number | null>;
type Hist = RainHistory & { et0?: Record<string, Record<string, (number | null)[]>> };

const avg = (maps: Daily[]) => {
  const out: Daily = {};
  for (const d of new Set(maps.flatMap((m) => Object.keys(m)))) {
    const vs = maps.map((m) => m[d]);
    out[d] = vs.some((v) => v === null || v === undefined) ? null : (vs as number[]).reduce((a, b) => a + b, 0) / vs.length;
  }
  return out;
};
const merge = (a: Daily, b: Daily, before: string): Daily => {
  const out: Daily = { ...a };
  for (const [d, v] of Object.entries(b)) if ((out[d] === null || out[d] === undefined) && d < before) out[d] = v;
  return out;
};
const doy = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(y, 0, 1)) / 86_400_000);
};
/** Day getter: recent data first, then the stored history (tenths of mm). */
const getter = (years: Record<string, (number | null)[]> | undefined, recent: Daily): DayRain => (d) => {
  const r = recent[d];
  if (r !== null && r !== undefined) return r;
  const v = years?.[d.slice(0, 4)]?.[doy(d)];
  return v === null || v === undefined ? null : v / 10;
};

export async function GET(req: NextRequest) {
  const island = req.nextUrl.searchParams.get("island") ?? "mauritius";
  if (island !== "mauritius" && island !== "rodrigues") return NextResponse.json({ error: "bad_request", message: "island must be mauritius or rodrigues" }, { status: 400 });
  try {
    const today = todayMU();
    const h = history as unknown as Hist;
    const rod = island === "rodrigues";
    const historyReady = !!h.builtAt && !!h.rain[rod ? RODRIGUES_POINT.id : RESERVOIRS[0].id];
    const pts = rod ? [RODRIGUES_POINT] : RESERVOIRS.map((r) => ({ lat: r.lat, lon: r.lon }));
    const centre = rod ? RODRIGUES_POINT : CENTRAL;
    const model5 = rod ? "era5" : "era5_land";
    // Fetch recent days back to whichever is earliest: 6 months ago, the start of this wet season,
    // or the first day after the stored history ends (so there is no gap).
    const starts = [addDays(today, -190), seasonStart(today)];
    if (historyReady && h.end) starts.push(`${h.end + 1}-01-01`);
    const fetchStart = [...starts].sort()[0] < addDays(today, -400) ? addDays(today, -400) : [...starts].sort()[0];

    const [rea, mod, sea, et0, islRea, islMod] = await Promise.allSettled([
      getReanalysisRain(pts, fetchStart, today, model5),
      getModelRain(pts),
      getSeasonalRain(centre.lat, centre.lon),
      getEt0(centre, fetchStart, today, model5),
      rod ? Promise.resolve([]) : getReanalysisRain(ISLAND_PTS, addDays(today, -190), today),
      rod ? Promise.resolve([]) : getModelRain(ISLAND_PTS),
    ]);
    if (mod.status === "rejected") throw mod.reason;
    const reanalysis = rea.status === "fulfilled" ? rea.value : pts.map(() => ({}));
    const model = mod.value;

    let filledDays = 0;
    const reservoirs = rod
      ? []
      : RESERVOIRS.map((r, i) => {
          const rep = catchmentReport(h, r.id, compareFrom(r), reanalysis[i] ?? {}, model[i] ?? {}, today);
          filledDays = Math.max(filledDays, rep.filledDays);
          return { ...r, compareFrom: rep.compareFrom, past: rep.past, next7: rep.next7 };
        });

    // Mauritius: all catchments together (average of the 7 daily series). Rodrigues: the island.
    const key = rod ? RODRIGUES_POINT.id : "all";
    const hAll = !rod && historyReady ? averagedHistory(h, RESERVOIRS.map((r) => r.id)) : h;
    const reaAvg = avg(reanalysis);
    const modAvg = avg(model);
    const overall = catchmentReport(hAll, key, RECORDS_START, reaAvg, modAvg, today);
    filledDays = Math.max(filledDays, overall.filledDays);

    // ---- Insights (need the stored history) ----
    let insights = null;
    if (historyReady && h.end) {
      const get = getter(hAll.rain[key], merge(reaAvg, modAvg, today));
      const last = h.end + 1; // seasons must end by 30 June of this year at the latest
      const lastComplete = Math.min(last, Number(seasonStart(today).slice(0, 4)));
      const et0Years = h.et0?.[island];
      const getEt = et0.status === "fulfilled" && et0Years ? getter(et0Years, et0.value) : null;
      const storms = ((cycloneHistory as unknown as { storms?: StormTrack[] }).storms ?? []) as StormTrack[];
      const ranking = reservoirs
        .filter((r) => r.past.m6.pctNormal !== null)
        .map((r) => ({ id: r.id, name: r.name, pct6: r.past.m6.pctNormal!, pct1: r.past.m1.pctNormal }))
        .sort((a, b) => a.pct6 - b.pct6);
      insights = {
        catchUp: catchUp(get, today, RECORDS_START, overall.past.m6),
        season: seasonProgress(get, today, RECORDS_START, lastComplete),
        analogues: analogues(get, today, RECORDS_START, overall.past.m6.pctNormal),
        rainDays: rainDays(get, today, RECORDS_START),
        net: getEt ? netWater(get, getEt, today, RECORDS_START) : null,
        ranking,
        trend: summerTrend(get, RECORDS_START, lastComplete),
        storms: storms.length ? stormShare(get, stormDays(storms, ISLAND_CENTRE[island]), 1980, lastComplete, today) : null,
      };
    }

    // Where did the rain fall? (Mauritius only)
    let share = null;
    if (!rod && islMod.status === "fulfilled" && islMod.value.length) {
      const iRea = avg(islRea.status === "fulfilled" ? islRea.value : []);
      const iMod = avg(islMod.value);
      share = Object.fromEntries(
        WINDOWS.map((w) => {
          const { start, end } = pastRange(today, w.days);
          const island = mergeDaily(iRea, iMod, start, end);
          const parts = RESERVOIRS.map((r, i) => ({ mm: mergeDaily(reanalysis[i] ?? {}, model[i] ?? {}, start, end).mm, km2: r.catchmentKm2 }));
          return [w.key, island.missing > 1 ? null : rainShare(parts, island.mm)];
        }),
      );
    }

    const outlook = sea.status === "fulfilled" ? { weeks: weeklyOutlook(sea.value, today), months: monthlyOutlook(sea.value, today) } : { weeks: null, months: null };
    return ok(
      {
        island,
        today,
        historyReady,
        history: { start: h.start, end: h.end },
        filledDays,
        reanalysisOk: rea.status === "fulfilled",
        overall: { past: overall.past, next7: overall.next7 },
        reservoirs,
        outlook,
        insights,
        share,
        retrievedAt: new Date().toISOString(),
      },
      3 * 3600,
    );
  } catch (e) {
    return fail(e);
  }
}
