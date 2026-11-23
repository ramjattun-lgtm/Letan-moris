import { type NextRequest, NextResponse } from "next/server";
import { getLocality } from "@/data/localities";
import { getJson } from "@/lib/weather/providers/open-meteo.provider";
import { ok, validId } from "@/lib/api";
import { addDays, todayMU } from "@/lib/time";

// What the weather was on this date 1, 5 and 10 years ago (ERA5 reanalysis — model-based).
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("loc");
  const loc = validId(id) ? getLocality(id) : undefined;
  if (!loc) return NextResponse.json({ error: "bad_request", message: "Missing or invalid ?loc=" }, { status: 400 });
  const today = todayMU();
  const years = [1, 5, 10];
  const rows = await Promise.all(
    years.map(async (y) => {
      // Same calendar day y years ago (29 Feb falls back to 28 Feb).
      const d = `${Number(today.slice(0, 4)) - y}-${today.slice(5, 10)}`;
      const date = Number.isNaN(Date.parse(d)) ? addDays(`${Number(today.slice(0, 4)) - y}-02-28`, 0) : d;
      const q = new URLSearchParams({ latitude: String(loc.lat), longitude: String(loc.lon), start_date: date, end_date: date, daily: "temperature_2m_max,temperature_2m_min,precipitation_sum", timezone: "Indian/Mauritius" });
      try {
        const j = (await getJson(`https://archive-api.open-meteo.com/v1/archive?${q}`, 7 * 86400)) as { daily?: Record<string, (number | null)[]> };
        const dl = j.daily ?? {};
        return { yearsAgo: y, date, tmax: dl.temperature_2m_max?.[0] ?? null, tmin: dl.temperature_2m_min?.[0] ?? null, rainMm: dl.precipitation_sum?.[0] ?? null };
      } catch {
        return { yearsAgo: y, date, tmax: null, tmin: null, rainMm: null };
      }
    }),
  );
  return ok({ locationId: loc.id, source: "Open-Meteo Historical Weather API (ECMWF ERA5 reanalysis, ~25 km, model-based)", years: rows }, 6 * 3600);
}
