import { type NextRequest, NextResponse } from "next/server";
import { getLocality } from "@/data/localities";
import { getPreviousRun, getRecentHours } from "@/lib/weather/providers/open-meteo.provider";
import { AIRPORTS, parseMetar, summariseAccuracy, type HourCompare } from "@/lib/weather/intelligence/accuracy.service";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";
import { addHours, hourStart, nowMU } from "@/lib/time";
import { recentInsights, splitRecent } from "@/lib/weather/intelligence/recent.service";
import { fail, ok, validId } from "@/lib/api";

// Last 3 hours (model estimate) and next 3 hours, with insights about what is changing.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("loc");
  const loc = validId(id) ? getLocality(id) : undefined;
  if (!loc) return NextResponse.json({ error: "bad_request", message: "Missing or invalid ?loc=" }, { status: 400 });
  try {
    const coords = { id: loc.id, lat: loc.lat, lon: loc.lon };
    const [r, prev] = await Promise.all([getRecentHours(coords), getPreviousRun(coords).catch(() => null)]);
    const { last, next } = splitRecent(r.hourly);

    // 1) Yesterday's forecast vs latest model estimate for the last 3 hours.
    const cur = hourStart(nowMU());
    const lastTimes = [addHours(cur, -3), addHours(cur, -2), addHours(cur, -1)];
    const rows: HourCompare[] = prev
      ? lastTimes.map((t) => {
          const p = prev.find((x) => x.time === t);
          return { time: t, forecastMm: p?.mm1 ?? null, actualMm: p?.mm ?? null, forecastTemp: p?.temp1 ?? null, actualTemp: p?.temp ?? null };
        })
      : [];
    const modelCheck = summariseAccuracy(rows);

    // 2) Real airport observations when an airport is within 20 km.
    let airportCheck: (ReturnType<typeof summariseAccuracy> & { airport: string; km: number; raw: string }) | null = null;
    const ap = AIRPORTS.map((a) => ({ ...a, km: Math.round(distanceKm(loc, a)) })).find((a) => a.km <= 20);
    if (ap && prev) {
      try {
        const res = await fetch(`https://aviationweather.gov/api/data/metar?ids=${ap.icao}&format=json&hours=4`, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const obs = parseMetar(await res.json());
          const aRows: HourCompare[] = lastTimes.map((t) => {
            const p = prev.find((x) => x.time === t);
            // observations within this local hour (UTC+4)
            const o = obs.filter((m) => nowMU(new Date(m.time)).slice(0, 13) === t.slice(0, 13));
            const temps = o.map((m) => m.temp).filter((x): x is number => x !== null);
            return {
              time: t,
              forecastMm: p?.mm1 ?? null,
              actualMm: o.length ? (o.some((m) => m.rain) ? 1 : 0) : null,
              forecastTemp: p?.temp1 ?? null,
              actualTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
            };
          });
          const s2 = summariseAccuracy(aRows);
          if (s2) airportCheck = { ...s2, airport: ap.name, km: ap.km, raw: obs.at(-1)?.raw ?? "" };
        }
      } catch {
        /* airport data unavailable — skip */
      }
    }

    return ok(
      {
        locationId: loc.id,
        last: last.hours,
        next: next.hours,
        insights: recentInsights(last, next, r.sunset),
        accuracy: { modelCheck, airportCheck, forecastRainLast3h: rows.some((x) => (x.forecastMm ?? 0) >= 0.2) },
        retrievedAt: r.fetchedAt,
      },
      600,
    );
  } catch (e) {
    return fail(e);
  }
}
