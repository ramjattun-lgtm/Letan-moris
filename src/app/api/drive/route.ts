import { type NextRequest, NextResponse } from "next/server";
import { getLocality } from "@/data/localities";
import { getForecastFor } from "@/lib/weather/services/forecast.service";
import { bestDeparture, departureOptions, tripMinutes, waypoints } from "@/lib/weather/intelligence/drive.service";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";
import { ok, validId } from "@/lib/api";
import { nowMU } from "@/lib/time";
import type { Forecast } from "@/lib/weather/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const a = validId(q.get("from")) ? getLocality(q.get("from")) : undefined;
  const b = validId(q.get("to")) ? getLocality(q.get("to")) : undefined;
  if (!a || !b || a.id === b.id || a.island !== b.island) return NextResponse.json({ error: "bad_request", message: "Choose two different places on the same island." }, { status: 400 });
  const route = waypoints(a, b);
  try {
    const fs = await Promise.all(route.map(async (p) => [p.id, await getForecastFor(p.id)] as const));
    const forecasts = Object.fromEntries(fs) as Record<string, Forecast>;
    const options = departureOptions(route, forecasts, nowMU());
    return ok(
      { route: route.map((p) => ({ id: p.id, name: p.name })), km: Math.round(distanceKm(a, b) * 1.35), minutes: tripMinutes(a, b), options, best: bestDeparture(options) },
      900,
    );
  } catch {
    return NextResponse.json({ error: "unavailable", message: "Forecast unavailable right now." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
