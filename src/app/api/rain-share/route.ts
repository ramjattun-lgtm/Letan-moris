import { type NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import history from "@/data/reservoir-rain.json";
import { ISLAND_PTS, RESERVOIRS } from "@/data/reservoirs";
import { getModelRain, getReanalysisRain } from "@/lib/weather/providers/catchment.provider";
import { rainShare, type RainHistory, type RainShare } from "@/lib/weather/intelligence/reservoir.service";
import { addDays, todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Daily = Record<string, number | null>;
const doy = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(y, 0, 1)) / 86_400_000);
};
const avg = (maps: Daily[]): Daily => {
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

/** "Where did the rain fall?" for a calendar year: each month and the whole year. */
export async function GET(req: NextRequest) {
  const today = todayMU();
  const thisYear = Number(today.slice(0, 4));
  const h = history as unknown as RainHistory;
  const ready = !!h.builtAt && !!h.rain.island && !!h.end;
  const first = ready ? h.start : thisYear;
  const year = Number(req.nextUrl.searchParams.get("year") ?? thisYear);
  if (!Number.isInteger(year) || year < first || year > thisYear) return NextResponse.json({ error: "bad_request", message: `year must be between ${first} and ${thisYear}` }, { status: 400 });

  try {
    // Daily getters (mm) for each catchment and the island.
    let catchGet: ((d: string) => number | null)[];
    let islandGet: (d: string) => number | null;
    if (ready && year <= (h.end as number)) {
      const g = (id: string) => (d: string) => {
        const v = h.rain[id]?.[d.slice(0, 4)]?.[doy(d)];
        return v === null || v === undefined ? null : v / 10;
      };
      catchGet = RESERVOIRS.map((r) => g(r.id));
      islandGet = g("island");
    } else {
      const start = `${year}-01-01`;
      const [cr, cm, ir, im] = await Promise.all([
        getReanalysisRain(RESERVOIRS.map((r) => ({ lat: r.lat, lon: r.lon })), start, today),
        getModelRain(RESERVOIRS.map((r) => ({ lat: r.lat, lon: r.lon }))),
        getReanalysisRain(ISLAND_PTS, start, today),
        getModelRain(ISLAND_PTS),
      ]);
      const cs = cr.map((m, i) => merge(m, cm[i] ?? {}, today));
      const is = merge(avg(ir), avg(im), today);
      catchGet = cs.map((m) => (d: string) => m[d] ?? null);
      islandGet = (d) => is[d] ?? null;
    }

    const period = (from: string, to: string): { share: RainShare | null; partial: boolean } => {
      const end = to < today ? to : addDays(today, -1);
      if (end < from) return { share: null, partial: false };
      const parts = RESERVOIRS.map((r) => ({ mm: 0, km2: r.catchmentKm2 }));
      let island = 0;
      for (let d = from; d <= end; d = addDays(d, 1)) {
        const iv = islandGet(d);
        const cv = catchGet.map((g) => g(d));
        if (iv === null || cv.some((v) => v === null)) return { share: null, partial: false };
        island += iv;
        cv.forEach((v, i) => (parts[i].mm += v as number));
      }
      return { share: rainShare(parts, island), partial: end < to };
    };

    const months = Array.from({ length: 12 }, (_, i) => {
      const from = `${year}-${String(i + 1).padStart(2, "0")}-01`;
      const to = addDays(i === 11 ? `${year + 1}-01-01` : `${year}-${String(i + 2).padStart(2, "0")}-01`, -1);
      return { month: i + 1, ...period(from, to) };
    });
    const total = period(`${year}-01-01`, `${year}-12-31`);
    return ok({ year, first, last: thisYear, historyReady: ready, months, total }, year < thisYear ? 86400 : 3 * 3600);
  } catch (e) {
    return fail(e);
  }
}
